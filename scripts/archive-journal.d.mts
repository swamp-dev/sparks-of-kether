// Type declarations for `scripts/archive-journal.mjs`. The
// implementation is plain ESM JavaScript so the script can run
// directly under `node` without a build step; this `.d.mts`
// provides the types its consumers (the unit test) need.
//
// Keep in sync with the JSDoc on the matching exports in the
// `.mjs` file.

export interface Entry {
  /** ISO date prefix `YYYY-MM-DD` taken from the heading. */
  readonly date: string;
  /** Full ISO-8601 timestamp recovered from the heading line, e.g. `2026-04-24T16:09:58-04:00`. */
  readonly timestamp: string;
  /** Verbatim slice of the entry, including its `## …` heading line. */
  readonly body: string;
}

export function parseEntries(text: string): {
  header: string;
  entries: Entry[];
};

export function partitionByCutoff(
  entries: Entry[],
  cutoffYmd: string,
): { older: Entry[]; recent: Entry[] };

export function groupEntriesByMonth(entries: Entry[]): Record<string, Entry[]>;

export function buildArchiveLinkSection(months: string[]): string;

export function applyArchive(
  text: string,
  cutoffYmd: string,
): { journalText: string; archives: Record<string, string> };
