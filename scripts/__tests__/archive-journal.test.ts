import { describe, expect, it } from 'vitest';
import {
  parseEntries,
  groupEntriesByMonth,
  partitionByCutoff,
  buildArchiveLinkSection,
  applyArchive,
  type Entry,
} from '../archive-journal.mjs';

/**
 * Pure-function tests for the journal archive slicer. The script's
 * I/O wrapper (read Journal.md, write archive files, rewrite
 * Journal.md) is one-shot orchestration around these helpers — if
 * the helpers are right and the I/O is a thin layer, end-to-end
 * correctness follows.
 *
 * Reference: ticket #300.
 */

const JOURNAL_HEADER = `# Sparks of Kether — Build Journal

> **Append only.** Never edit or delete past entries.

## Entries

`;

const ENTRY_OLD = `## 2026-02-15T10:00:00-04:00 — #50: example old entry

**Pushed:** something old.
**Why:** doesn't matter.
**Notes:** None.
**Commit(s):** \`abc1234\`

`;

const ENTRY_BORDERLINE = `## 2026-03-31T23:59:59-04:00 — #99: last day before cutoff

**Pushed:** edge of the cutoff window.
**Why:** edge case.
**Commit(s):** \`def5678\`

`;

const ENTRY_RECENT = `## 2026-04-29T12:34:56-04:00 — #200: recent entry

**Pushed:** modern thing.
**Commit(s):** \`9999999\`

`;

describe('parseEntries', () => {
  it('extracts entries by their `## YYYY-MM-DDTHH:MM:SS` heading', () => {
    const text = JOURNAL_HEADER + ENTRY_OLD + ENTRY_RECENT;
    const { header, entries } = parseEntries(text);
    expect(header).toBe(JOURNAL_HEADER);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.date).toBe('2026-02-15');
    expect(entries[0]?.timestamp).toBe('2026-02-15T10:00:00-04:00');
    expect(entries[1]?.date).toBe('2026-04-29');
  });

  it('preserves the entry body verbatim including the heading line', () => {
    const text = JOURNAL_HEADER + ENTRY_OLD;
    const { entries } = parseEntries(text);
    expect(entries[0]?.body).toBe(ENTRY_OLD);
  });

  it('returns an empty entries array when no entries exist', () => {
    const { entries } = parseEntries(JOURNAL_HEADER);
    expect(entries).toHaveLength(0);
  });

  it('does not match a `## ...` heading that lacks the ISO date prefix', () => {
    // Headings like `## Entries` or `## Entry template` must NOT be
    // misidentified as entries. The header section above already
    // contains an `## Entries` heading; this test is the explicit
    // pin against false matches.
    const text = `# Title\n\n## Some other heading\n\nBody.\n\n## Entries\n\n` +
      ENTRY_OLD;
    const { entries } = parseEntries(text);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.date).toBe('2026-02-15');
  });

  it('captures all consecutive lines until the next entry heading', () => {
    const multilineEntry = `## 2026-02-15T10:00:00-04:00 — #50: multiline

Line 1.

Line 2 with **bold**.

\`\`\`
fenced code
## 2026-99-99 — #999: this is inside a fence, not an entry
\`\`\`

End of body.

`;
    const text = JOURNAL_HEADER + multilineEntry + ENTRY_RECENT;
    const { entries } = parseEntries(text);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.body).toBe(multilineEntry);
  });
});

describe('partitionByCutoff', () => {
  it('puts entries strictly before the cutoff into `older`', () => {
    const entries: Entry[] = [
      mkEntry('2026-02-15'),
      mkEntry('2026-03-31'),
      mkEntry('2026-04-29'),
    ];
    const { older, recent } = partitionByCutoff(entries, '2026-04-01');
    expect(older.map((e) => e.date)).toEqual(['2026-02-15', '2026-03-31']);
    expect(recent.map((e) => e.date)).toEqual(['2026-04-29']);
  });

  it('treats the cutoff date itself as recent (cutoff is inclusive of recent side)', () => {
    const entries: Entry[] = [mkEntry('2026-04-01'), mkEntry('2026-04-02')];
    const { older, recent } = partitionByCutoff(entries, '2026-04-01');
    expect(older).toHaveLength(0);
    expect(recent).toHaveLength(2);
  });

  it('returns empty `older` when all entries are recent (the young-project case)', () => {
    const entries: Entry[] = [mkEntry('2026-04-25'), mkEntry('2026-04-30')];
    const { older, recent } = partitionByCutoff(entries, '2026-03-31');
    expect(older).toHaveLength(0);
    expect(recent).toHaveLength(2);
  });
});

describe('groupEntriesByMonth', () => {
  it('groups entries by `YYYY-MM` and preserves intra-month order', () => {
    const entries: Entry[] = [
      mkEntry('2026-02-15'),
      mkEntry('2026-02-28'),
      mkEntry('2026-03-01'),
    ];
    const groups = groupEntriesByMonth(entries);
    expect(Object.keys(groups).sort()).toEqual(['2026-02', '2026-03']);
    expect(groups['2026-02']).toHaveLength(2);
    expect(groups['2026-02']?.[0]?.date).toBe('2026-02-15');
    expect(groups['2026-03']).toHaveLength(1);
  });
});

describe('applyArchive — idempotency', () => {
  it('produces no further changes on re-run with the same cutoff', () => {
    const original = JOURNAL_HEADER + ENTRY_OLD + ENTRY_BORDERLINE + ENTRY_RECENT;
    const cutoff = '2026-04-01';

    const first = applyArchive(original, cutoff);
    const second = applyArchive(first.journalText, cutoff);

    // The journal text after the second pass must equal the first
    // pass's output verbatim. If the script accidentally re-adds
    // the "Archived entries" header or duplicates archive links,
    // this fails.
    expect(second.journalText).toBe(first.journalText);
    // No new archives on the second pass — everything qualifying
    // was already moved.
    expect(Object.keys(second.archives)).toHaveLength(0);
  });

  it('preserves byte-for-byte content of recent entries across multiple runs', () => {
    // Regression pin: an earlier draft used `entries.join('\n')`
    // when reassembling the recent block, which inflated every
    // gap between entries by one blank line on each round-trip.
    // The bug only surfaced on real Journal.md (multiple entries)
    // because synthetic two-entry inputs hid it. This case
    // exercises three recent entries and confirms the gaps stay
    // stable across two runs.
    const recentA = `## 2026-04-25T10:00:00-04:00 — #1: first

Body A line.

---

`;
    const recentB = `## 2026-04-26T10:00:00-04:00 — #2: second

Body B line.

---

`;
    const recentC = `## 2026-04-27T10:00:00-04:00 — #3: third

Body C line.

`;
    const original = JOURNAL_HEADER + recentA + recentB + recentC;
    const cutoff = '2026-03-31';

    const first = applyArchive(original, cutoff);
    const second = applyArchive(first.journalText, cutoff);

    expect(second.journalText).toBe(first.journalText);
    // The recent entries are present verbatim in both passes.
    expect(first.journalText).toContain(recentA);
    expect(first.journalText).toContain(recentB);
    expect(first.journalText).toContain(recentC);
    // No spurious blank-line inflation between entries: count of
    // entry headings stays at 3.
    const entryHeadingCount = (first.journalText.match(/^## \d{4}-/gm) ?? [])
      .length;
    expect(entryHeadingCount).toBe(3);
  });

  it('strips already-archived entries on first pass; leaves only recent', () => {
    const original = JOURNAL_HEADER + ENTRY_OLD + ENTRY_BORDERLINE + ENTRY_RECENT;
    const { journalText, archives } = applyArchive(original, '2026-04-01');

    expect(journalText).toContain('#200: recent entry');
    expect(journalText).not.toContain('#50: example old entry');
    expect(journalText).not.toContain('#99: last day before cutoff');

    // Two months covered: 2026-02 (one entry), 2026-03 (one entry).
    expect(Object.keys(archives).sort()).toEqual(['2026-02', '2026-03']);
    expect(archives['2026-02']).toContain('#50: example old entry');
    expect(archives['2026-03']).toContain('#99: last day before cutoff');
  });

  it('infrastructure-only run (no entries qualify) adds archive header but no archives', () => {
    // The scenario that ships in this PR: today is 2026-04-30, all
    // entries are from April 2026, cutoff is 2026-03-31, so nothing
    // is archived. We still expect the "Archived entries" header to
    // be inserted so future runs have a stable insertion point.
    const original = JOURNAL_HEADER + ENTRY_RECENT;
    const { journalText, archives } = applyArchive(original, '2026-03-31');

    expect(Object.keys(archives)).toHaveLength(0);
    expect(journalText).toContain('## Archived entries');
    expect(journalText).toContain('#200: recent entry');
  });
});

describe('buildArchiveLinkSection', () => {
  it('lists archives most-recent-first with relative links', () => {
    const months = ['2026-01', '2026-03', '2026-02'];
    const section = buildArchiveLinkSection(months);
    // Most recent first: 2026-03, 2026-02, 2026-01.
    const order = section.match(/journal-(\d{4}-\d{2})\.md/g);
    expect(order).toEqual([
      'journal-2026-03.md',
      'journal-2026-02.md',
      'journal-2026-01.md',
    ]);
    expect(section).toContain('## Archived entries');
    expect(section).toContain('docs/journal-archive/journal-2026-03.md');
  });

  it('emits an empty list section (header only) when no archives exist', () => {
    const section = buildArchiveLinkSection([]);
    expect(section).toContain('## Archived entries');
    expect(section).not.toMatch(/journal-\d{4}-\d{2}\.md/);
  });
});

// Test helper: synthesise a minimal Entry with the given date.
function mkEntry(date: string): Entry {
  return {
    date,
    timestamp: `${date}T12:00:00-04:00`,
    body: `## ${date}T12:00:00-04:00 — #1: synthetic\n\nBody.\n\n`,
  };
}
