#!/usr/bin/env node
// scripts/archive-journal.mjs — slice older entries out of
// `Journal.md` into `docs/journal-archive/journal-YYYY-MM.md`.
//
// Reference: ticket #300.
//
// Why: `Journal.md` is append-only and grows ~10-30 lines per push.
// At ~4500 lines today the cost is mostly cognitive — slow editor
// open, MEMORY.md context loading inflates as agents read the file.
// Git history is the canonical record either way; the archive is a
// presentation-layer concern.
//
// Behaviour:
//
// - Parses entries by their `## YYYY-MM-DDTHH:MM:SS` heading lines.
//   Headings without that ISO-date prefix (e.g. `## Entries`) are
//   left in the file header section, untouched.
// - Computes a cutoff = today minus `WINDOW_DAYS` (30). Entries
//   whose date is strictly **before** that cutoff are archived;
//   entries on or after stay in `Journal.md`.
// - Groups archived entries by `YYYY-MM` and writes them to
//   `docs/journal-archive/journal-YYYY-MM.md` verbatim — no
//   reformatting, no merging.
// - Updates `Journal.md` to: keep its file header, prepend an
//   `## Archived entries` link section (most recent first) above
//   the entries section, then list the recent entries.
// - Idempotent: running twice produces no further changes. The
//   second run's `partitionByCutoff` finds nothing to archive (the
//   first run already moved everything below the cutoff), and the
//   "Archived entries" link section is rebuilt deterministically
//   from the months mentioned in the prior run's link section
//   (parsed back out of the input text — see
//   `parseArchivedMonthsFromHeader`).
//
// Public API (used by tests):
//
//   parseEntries(text)                 → { header, entries }
//   partitionByCutoff(entries, cutoff) → { older, recent }
//   groupEntriesByMonth(entries)       → { 'YYYY-MM': Entry[] }
//   buildArchiveLinkSection(months)    → string
//   applyArchive(text, cutoff)         → { journalText, archives }
//
// CLI:
//
//   node scripts/archive-journal.mjs           # uses today − 30 days
//   node scripts/archive-journal.mjs 2026-04-01 # explicit cutoff
//
// The script is read-only on the entries it doesn't move (ordering
// preserved, bodies copied verbatim). Re-running is safe; that is
// the property the idempotency test pins.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const JOURNAL_PATH = resolve(REPO_ROOT, 'Journal.md');
const ARCHIVE_DIR_REL = 'docs/journal-archive';
const ARCHIVE_DIR_ABS = resolve(REPO_ROOT, ARCHIVE_DIR_REL);
const WINDOW_DAYS = 30;

// `^## YYYY-MM-DDTHH:MM:SS` at the start of a line — anchors a
// real Journal entry. The rest of the heading (timezone, ticket
// number, summary) is captured by the body slice rather than this
// regex; we only need this to find the boundary.
const ENTRY_HEADING_RE = /^## (\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/;

// ---------------------------------------------------------------------------
// Pure helpers (tested in scripts/__tests__/archive-journal.test.ts)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ date: string; timestamp: string; body: string }} Entry
 */

/**
 * Split the journal text into a `header` (everything before the
 * first entry heading) and a list of `entries`. Each entry's
 * `body` is the verbatim slice from its `## YYYY-MM-DD...` heading
 * up to (but not including) the next entry heading or end of file.
 *
 * Fenced code blocks inside an entry body are preserved as-is —
 * an `## YYYY-...` line inside ```...``` is NOT misinterpreted as a
 * new entry boundary. (Pinned by the multiline-with-fence test.)
 *
 * @param {string} text
 * @returns {{ header: string; entries: Entry[] }}
 */
export function parseEntries(text) {
  const lines = text.split('\n');
  /** @type {Entry[]} */
  const entries = [];
  const headerLines = /** @type {string[]} */ ([]);
  /** @type {string[] | null} */
  let currentBody = null;
  /** @type {{ date: string; timestamp: string } | null} */
  let currentMeta = null;
  let inFence = false;

  // Each line either: opens/closes a fence, starts a new entry
  // (when not inside a fence), or extends the current section.
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      if (currentBody !== null) currentBody.push(line);
      else headerLines.push(line);
      continue;
    }
    const match = !inFence ? ENTRY_HEADING_RE.exec(line) : null;
    if (match !== null) {
      // Flush previous entry, if any. Each finalised body ends in
      // exactly one trailing `\n` so concatenating entry bodies
      // back-to-back reproduces the original text verbatim. The
      // `\n` that originally separated the prior entry's last line
      // from the next entry's heading is recovered here.
      if (currentBody !== null && currentMeta !== null) {
        entries.push({
          ...currentMeta,
          body: `${currentBody.join('\n')}\n`,
        });
      }
      currentMeta = {
        date: match[1],
        timestamp: `${match[1]}T${match[2]}${
          line.slice(`## ${match[1]}T${match[2]}`.length).match(/^[+\-]\d{2}:\d{2}/)?.[0] ?? ''
        }`,
      };
      currentBody = [line];
      continue;
    }
    if (currentBody !== null) {
      currentBody.push(line);
    } else {
      headerLines.push(line);
    }
  }

  // End-of-text flush: the final entry's body is whatever's left in
  // `currentBody`. Joining with `\n` reproduces the file's tail
  // verbatim — no synthetic trailing `\n` (unlike the mid-loop
  // flush above), because there is no next heading to "borrow" a
  // separator from.
  if (currentBody !== null && currentMeta !== null) {
    entries.push({
      ...currentMeta,
      body: currentBody.join('\n'),
    });
  }

  // Header reconstruction: `headerLines.join('\n') + '\n'` exactly
  // reproduces the prefix of `text` up to the first entry heading.
  // Reasoning: `text.split('\n')` yields N+1 tokens for N newlines;
  // we kept tokens [0..k) where token k is the entry heading line.
  // Joining tokens [0..k) with `\n` gives `tokens[0..k-1].join('\n')`
  // which is missing the `\n` that originally preceded token k.
  // Adding one trailing `\n` recovers that boundary newline. If
  // there were no entries at all, we restore the original text
  // verbatim — there's no entry boundary to recover from.
  if (entries.length === 0) return { header: text, entries };
  const header = `${headerLines.join('\n')}\n`;
  return { header, entries };
}

/**
 * Split entries into those strictly before the cutoff (older) and
 * those on or after the cutoff (recent).
 *
 * The cutoff is treated as a calendar date in `YYYY-MM-DD` form;
 * an entry's `date` field (also `YYYY-MM-DD`) is compared as a
 * lexicographic string, which agrees with chronological order for
 * this format.
 *
 * @param {Entry[]} entries
 * @param {string} cutoffYmd  YYYY-MM-DD; entries before this date are archived
 * @returns {{ older: Entry[]; recent: Entry[] }}
 */
export function partitionByCutoff(entries, cutoffYmd) {
  /** @type {Entry[]} */
  const older = [];
  /** @type {Entry[]} */
  const recent = [];
  for (const entry of entries) {
    if (entry.date < cutoffYmd) older.push(entry);
    else recent.push(entry);
  }
  return { older, recent };
}

/**
 * Group entries by `YYYY-MM` (the first 7 chars of `date`).
 *
 * @param {Entry[]} entries
 * @returns {Record<string, Entry[]>}
 */
export function groupEntriesByMonth(entries) {
  /** @type {Record<string, Entry[]>} */
  const out = {};
  for (const entry of entries) {
    const ym = entry.date.slice(0, 7);
    (out[ym] ??= []).push(entry);
  }
  return out;
}

/**
 * Build the `## Archived entries` link section that prepends the
 * Journal's recent-entries area. Listed most-recent month first.
 *
 * @param {string[]} months  YYYY-MM values that have archive files
 * @returns {string}
 */
export function buildArchiveLinkSection(months) {
  const sorted = [...months].sort().reverse();
  const lines = ['## Archived entries', ''];
  if (sorted.length === 0) {
    lines.push(
      '_No archives yet. Future runs of `pnpm archive:journal` will populate this list._',
    );
  } else {
    lines.push(
      'Older entries have been moved out of this file to keep its size manageable.',
      'See:',
      '',
    );
    for (const ym of sorted) {
      // Link text is the human label "YYYY-MM"; href is the
      // archive path. Keeping the two distinct means a regex
      // looking for `journal-YYYY-MM.md` matches once per archive
      // (a property the unit test relies on).
      lines.push(`- [${ym}](${ARCHIVE_DIR_REL}/journal-${ym}.md)`);
    }
  }
  // Trailing horizontal rule + blank line separates the link
  // section from the recent-entries block. `\n` between them is
  // preserved across idempotent re-parses because the strip regex
  // matches the entire `## Archived entries\n...\n---\n\n` block.
  lines.push('', '---', '', '');
  return lines.join('\n');
}

/**
 * Whole-file transform. Returns the new `Journal.md` text plus an
 * `archives` map keyed by `YYYY-MM` whose values are the verbatim
 * archive-file content for that month. The caller writes those to
 * `docs/journal-archive/journal-YYYY-MM.md`.
 *
 * The transform is idempotent: a re-run with the same cutoff
 * produces the same `journalText` and an empty `archives` map.
 *
 * @param {string} text
 * @param {string} cutoffYmd
 * @returns {{ journalText: string; archives: Record<string, string> }}
 */
export function applyArchive(text, cutoffYmd) {
  const { header, entries } = parseEntries(text);
  const { older, recent } = partitionByCutoff(entries, cutoffYmd);
  const newArchives = groupEntriesByMonth(older);

  // Months already documented in the input's "Archived entries"
  // section, so a no-op re-run still renders the same link list.
  // We take this from the parsed text rather than from disk so
  // `applyArchive` stays a pure function (and the unit tests can
  // exercise idempotency without writing real files).
  const previouslyArchivedMonths = parseArchivedMonthsFromHeader(header);

  // Strip any pre-existing "Archived entries" section from the
  // header before we rebuild it. Without this, idempotent re-runs
  // would stack the section.
  const cleanedHeader = stripArchiveSection(header);

  // The link section is the union of: months we just archived and
  // months that were already documented in the prior run's link
  // section. New archives win in the merge but the union is what
  // gets rendered.
  const freshMonths = Object.keys(newArchives);
  const allMonths = Array.from(
    new Set([...previouslyArchivedMonths, ...freshMonths]),
  );

  const archiveSection = buildArchiveLinkSection(allMonths);

  // Reassemble: cleaned header + archive-link section + recent
  // entries. Entry bodies concat with **no separator** — each
  // mid-loop body already carries the trailing `\n` that
  // originally separated it from the next entry's heading (see
  // `parseEntries`). The end-of-text body intentionally lacks
  // that synthetic newline because there's no next heading. So
  // joining with `''` round-trips the original bytes; joining
  // with `'\n'` would inflate every entry gap by one blank line
  // on each pass.
  const recentBlock = recent.map((e) => e.body).join('');

  // Build the per-month archive file bodies. Each archive file
  // gets a small frontmatter so a casual reader knows what it is.
  /** @type {Record<string, string>} */
  const archives = {};
  for (const [ym, monthEntries] of Object.entries(newArchives)) {
    archives[ym] = buildArchiveFile(ym, monthEntries);
  }

  const journalText = `${cleanedHeader}${archiveSection}${recentBlock}`;
  return { journalText, archives };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Remove a previously-rendered `## Archived entries` block from
 * the header so re-runs don't stack the section. Matches from the
 * heading line through the next `---` separator (inclusive) and
 * the trailing blank line.
 *
 * @param {string} header
 * @returns {string}
 */
function stripArchiveSection(header) {
  // Match the entire previously-rendered block from the
  // `## Archived entries` heading through its trailing `---`
  // separator (and the blank line that follows). The lazy `*?`
  // stops at the first `---` so a stray `---` later in the
  // header isn't swallowed.
  //
  // Why anchored to the line start: a literal `## Archived
  // entries` could in principle appear inside a code block in the
  // file header, but in practice it only ever appears as the
  // section heading we render here. The `^` + `m` flag pin that
  // intent.
  const re = /^## Archived entries\n[\s\S]*?\n---\n\n?/m;
  return header.replace(re, '');
}

/**
 * Extract `YYYY-MM` months mentioned in the previously-rendered
 * archive link section. The parser is intentionally permissive —
 * it scans the whole header for `journal-YYYY-MM.md` substrings
 * regardless of which line they appear on, because the link line
 * format may evolve over time and we want re-runs to remain
 * idempotent across format tweaks.
 *
 * @param {string} header
 * @returns {string[]}
 */
function parseArchivedMonthsFromHeader(header) {
  const re = /journal-(\d{4}-\d{2})\.md/g;
  const seen = new Set();
  for (const m of header.matchAll(re)) {
    if (m[1]) seen.add(m[1]);
  }
  return [...seen];
}

/**
 * Compose the verbatim archive-file body for one month.
 *
 * @param {string} ym  YYYY-MM
 * @param {Entry[]} monthEntries
 * @returns {string}
 */
function buildArchiveFile(ym, monthEntries) {
  const intro =
    `# Journal archive — ${ym}\n\n` +
    `> Archived from \`Journal.md\` by \`scripts/archive-journal.mjs\`. Verbatim copy — do not edit.\n\n` +
    `---\n\n`;
  // Same join('') reasoning as `applyArchive`'s `recentBlock` —
  // mid-loop bodies carry their own trailing `\n`.
  return intro + monthEntries.map((e) => e.body).join('');
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

// Run only when invoked directly (not when imported by the test).
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === __filename;
if (invokedDirectly) {
  const cutoffArg = process.argv[2];
  const cutoff = cutoffArg ?? defaultCutoff();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoff)) {
    console.error(
      `[archive-journal] invalid cutoff "${cutoff}" — expected YYYY-MM-DD`,
    );
    process.exit(2);
  }

  const original = readFileSync(JOURNAL_PATH, 'utf8');
  const { journalText, archives } = applyArchive(original, cutoff);

  // Ensure archive dir exists (creates `docs/journal-archive/` on
  // the very first run).
  mkdirSync(ARCHIVE_DIR_ABS, { recursive: true });

  let archiveCount = 0;
  for (const [ym, content] of Object.entries(archives)) {
    const path = resolve(ARCHIVE_DIR_ABS, `journal-${ym}.md`);
    writeFileSync(path, content, 'utf8');
    archiveCount += 1;
    console.log(`[archive-journal] wrote ${ARCHIVE_DIR_REL}/journal-${ym}.md`);
  }

  if (journalText !== original) {
    writeFileSync(JOURNAL_PATH, journalText, 'utf8');
    console.log('[archive-journal] updated Journal.md');
  } else {
    console.log('[archive-journal] Journal.md unchanged');
  }

  console.log(
    `[archive-journal] cutoff=${cutoff} archived=${archiveCount} ` +
      `month-files`,
  );
}

/**
 * Today minus `WINDOW_DAYS`, formatted as `YYYY-MM-DD`. Uses local
 * time so a midnight run on the user's machine doesn't cut a day
 * earlier than expected because of UTC offset.
 *
 * @returns {string}
 */
function defaultCutoff() {
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
