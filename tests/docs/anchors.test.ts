import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';

/**
 * Doc-anchor drift-check. Scans every Markdown file in the repo for
 * HTML-comment anchors of the form
 *
 *   <!-- code-ref: path/to/file.ts:symbolName -->
 *   <!-- code-ref: path/to/file.ts -->
 *
 * For each anchor, asserts that the path exists relative to the repo
 * root and (when a symbol is provided) that the file contains a
 * top-level export of that symbol.
 *
 * Why opt-in: anchors are a cost. A doc author chooses which claims
 * to anchor — typically the load-bearing ones (file paths in
 * `CLAUDE.md`'s commands, mechanics tables, function names cited in
 * design docs). Plain prose stays plain prose.
 *
 * The test produces one `it()` per anchor so failures point at the
 * specific drift. Failure example:
 *   FAIL  CLAUDE.md :: code-ref → lib/use-lobby.ts:useLobby
 *     Symbol "useLobby" not found in lib/use-lobby.ts (file exists
 *     but no top-level `export` of that name).
 */

const REPO_ROOT = resolve(__dirname, '..', '..');
const ANCHOR_RE = /<!--\s*code-ref:\s*([^:\s]+)(?::([^\s]+))?\s*-->/g;

// Mirrors `design/doc-audit-2026-04.md`'s exclusion list. Hidden
// directories (starting with `.`) are skipped wholesale during the
// walk, which covers `.claude`, `.next`, `.stryker-tmp`, `.git`,
// `.husky`, etc. The remaining names are explicit.
const EXCLUDED_DIR_NAMES = new Set([
  'node_modules',
  'e2e',
  'coverage',
  'playwright-report',
  'test-results',
  'dist', // proactive — no `dist/` today, but if a build step ever
  // emits markdown there it shouldn't be scanned
]);

function isExcludedDir(name: string): boolean {
  return name.startsWith('.') || EXCLUDED_DIR_NAMES.has(name);
}

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (isExcludedDir(entry.name)) continue;
      out.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

interface Anchor {
  readonly mdPath: string; // relative to repo root, for test names
  readonly target: string; // path the anchor references, relative to repo root
  readonly symbol: string | undefined;
  readonly line: number;
}

function parseAnchors(mdAbsPath: string): Anchor[] {
  const mdRel = relative(REPO_ROOT, mdAbsPath);
  const text = readFileSync(mdAbsPath, 'utf8');
  const anchors: Anchor[] = [];
  // Walk per-line so we can report the line number — useful for
  // jumping to the bad anchor in a failure report.
  const lines = text.split('\n');
  // Track fenced code blocks: lines starting with ``` toggle in/out.
  // Anchors inside fenced blocks are documentation examples (e.g.
  // this very file's JSDoc, or Journal entries explaining the anchor
  // syntax), not real claims to verify.
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    // Strip inline code spans (`...`) before the regex pass so an
    // example like `<!-- code-ref: foo:bar -->` in prose doesn't
    // count as a real anchor. The `[^`\n]*` is bounded so it can't
    // span lines.
    const stripped = line.replace(/`[^`\n]*`/g, '');
    ANCHOR_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ANCHOR_RE.exec(stripped)) !== null) {
      const target = match[1];
      const symbol = match[2];
      if (target === undefined) continue;
      anchors.push({ mdPath: mdRel, target, symbol, line: i + 1 });
    }
  }
  return anchors;
}

/**
 * Loose top-level export detection. Matches `export function foo`,
 * `export const foo`, `export class foo`, `export interface foo`,
 * `export type foo`, `export enum foo`, `export let foo`,
 * `export var foo`, `export default function foo`, `export default
 * class foo`, plus re-exports of the form `export { foo }` or
 * `export { foo as bar }`.
 *
 * Known limitations (acceptable false negatives — bad anchors might
 * pass when they shouldn't, but valid anchors never fail):
 *
 * - `module.exports = ...` (CommonJS) — irrelevant in this TS-only
 *   codebase.
 * - `export * from './bar'` (barrel re-exports) — anchor should
 *   point at the file that defines the symbol, not the barrel.
 * - `export { internalName as publicName }` — the regex matches
 *   either name as a word inside the braces. Anchors should always
 *   reference the public name. The internal name slipping through
 *   is a doc-author misuse, not a checker gap.
 *
 * If any of these become a real problem, prefer adding the missing
 * named export rather than complicating this regex.
 */
function fileExportsSymbol(content: string, symbol: string): boolean {
  const safe = symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const directExport = new RegExp(
    `\\bexport\\s+(?:default\\s+)?(?:async\\s+)?` +
      `(?:function|const|class|interface|type|enum|let|var)\\s+${safe}\\b`,
  );
  if (directExport.test(content)) return true;
  // `export { foo }` and `export { foo as bar }`
  const reExport = new RegExp(`\\bexport\\s*\\{[^}]*\\b${safe}\\b[^}]*\\}`);
  return reExport.test(content);
}

const allMarkdown = walkMarkdown(REPO_ROOT);
const allAnchors = allMarkdown.flatMap(parseAnchors);

describe('doc-anchor drift-check', () => {
  it('walks the repo and finds at least one markdown file', () => {
    // Sanity gate: if the walker is broken (excludes everything,
    // walks the wrong root, etc.), fail loudly here rather than
    // letting "0 anchors checked" pass silently.
    expect(allMarkdown.length).toBeGreaterThan(0);
  });

  it('finds at least one code-ref anchor (suite is meaningful)', () => {
    // Sanity gate: if the parser ever breaks or all anchors get
    // moved into fenced code by accident, this guards against the
    // suite passing silently.
    expect(allAnchors.length).toBeGreaterThan(0);
  });

  for (const a of allAnchors) {
    const name = a.symbol
      ? `${a.mdPath}:${a.line} :: code-ref → ${a.target}:${a.symbol}`
      : `${a.mdPath}:${a.line} :: code-ref → ${a.target}`;
    it(name, () => {
      const targetAbs = resolve(REPO_ROOT, a.target);
      let exists = false;
      try {
        exists = statSync(targetAbs).isFile();
      } catch {
        exists = false;
      }
      expect(
        exists,
        `Path "${a.target}" referenced from ${a.mdPath}:${a.line} does not exist.`,
      ).toBe(true);
      if (a.symbol === undefined) return;
      const content = readFileSync(targetAbs, 'utf8');
      expect(
        fileExportsSymbol(content, a.symbol),
        `Symbol "${a.symbol}" not found in ${a.target} ` +
          `(file exists but no top-level \`export\` of that name). ` +
          `Anchor at ${a.mdPath}:${a.line}.`,
      ).toBe(true);
    });
  }
});
