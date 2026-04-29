import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';

/**
 * Markdown link drift-check. Scans every Markdown file in the repo
 * for inline links of the form `[text](path)` (and image links
 * `![alt](path)`) and asserts that every *relative* path resolves
 * to a file or directory that exists. Same drift-rot prevention as
 * `tests/docs/anchors.test.ts` but for plain markdown links rather
 * than the opt-in code-ref anchor syntax.
 *
 * Behaviour:
 *
 * - External URLs (`http://`, `https://`, `mailto:`, `ftp://`) are
 *   skipped — validating those would mean network calls in CI.
 * - Pure fragment links (`(#section)`) are skipped — they're
 *   in-page jumps; the fragment-resolves-to-real-heading question
 *   is a separate (and more involved) check.
 * - Fenced code blocks (` ``` `) and inline code spans (`` `...` ``)
 *   are skipped so documentation examples that *show* link syntax
 *   don't count as real claims (same fix as #186/#187).
 * - The `?query` and `#fragment` portions of an URL are stripped
 *   before the existence check.
 * - Relative paths resolve against the markdown file's directory,
 *   not the repo root, so a `[link](./adjacent.md)` works as
 *   expected.
 *
 * One `it()` per link so failures point at the specific drift.
 */

const REPO_ROOT = resolve(__dirname, '..', '..');

// Inline link / image: `[text](path)` or `![alt](path)`. The path
// part forbids spaces and closing parens to keep the match simple.
// Escaped parens in URLs would need bracket-depth tracking; this
// codebase doesn't have any.
//
// Out of scope (none used in this repo): reference-style links
// `[text][label]` with a separate `[label]: url` definition,
// angle-bracketed URLs `<https://...>`, and CommonMark escaped
// parens inside the URL. Add coverage if/when those appear.
const LINK_RE = /!?\[[^\]]*\]\(([^()\s]+)\)/g;

// Mirrors the anchor test's exclusion list — kept in sync manually
// (a follow-up could share the walker, but two specs is below the
// line where the duplication earns extraction).
const EXCLUDED_DIR_NAMES = new Set([
  'node_modules',
  'e2e',
  'coverage',
  'playwright-report',
  'test-results',
  'dist',
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

interface Link {
  readonly mdPath: string;
  readonly mdAbsPath: string;
  readonly target: string; // raw href as it appears in the markdown
  readonly resolvedAbs: string; // absolute path the test will stat
  readonly line: number;
}

function isExternal(target: string): boolean {
  return /^(?:https?|mailto|ftp|tel):/i.test(target);
}

function parseLinks(mdAbsPath: string): Link[] {
  const mdRel = relative(REPO_ROOT, mdAbsPath);
  const text = readFileSync(mdAbsPath, 'utf8');
  const out: Link[] = [];
  const lines = text.split('\n');
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const stripped = line.replace(/`[^`\n]*`/g, '');
    LINK_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = LINK_RE.exec(stripped)) !== null) {
      const target = match[1];
      if (target === undefined) continue;
      // Skip externals and pure fragments / empty.
      if (target === '' || target.startsWith('#')) continue;
      if (isExternal(target)) continue;
      // Strip query and fragment for the existence check.
      const cleaned = target.split('#')[0]?.split('?')[0] ?? '';
      if (cleaned === '') continue;
      const resolvedAbs = resolve(dirname(mdAbsPath), cleaned);
      out.push({
        mdPath: mdRel,
        mdAbsPath,
        target,
        resolvedAbs,
        line: i + 1,
      });
    }
  }
  return out;
}

const allMarkdown = walkMarkdown(REPO_ROOT);
const allLinks = allMarkdown.flatMap(parseLinks);

describe('doc link drift-check', () => {
  it('walks the repo and finds at least one markdown file', () => {
    expect(allMarkdown.length).toBeGreaterThan(0);
  });

  if (allLinks.length === 0) {
    // No relative links found in any doc — extremely unlikely but
    // guard anyway so the suite has a passing assertion.
    it.todo('no relative markdown links found yet');
    return;
  }

  for (const link of allLinks) {
    const targetRel = relative(REPO_ROOT, link.resolvedAbs);
    const name = `${link.mdPath}:${link.line} :: link → ${link.target}`;
    it(name, () => {
      let exists = false;
      try {
        const st = statSync(link.resolvedAbs);
        exists = st.isFile() || st.isDirectory();
      } catch {
        exists = false;
      }
      expect(
        exists,
        `Link "${link.target}" from ${link.mdPath}:${link.line} ` +
          `resolves to "${targetRel}" which does not exist.`,
      ).toBe(true);
    });
  }
});
