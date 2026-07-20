/**
 * Human-facing booking IDs — "ML-2026-0042".
 *
 * Pure: the caller passes in the highest reference already issued for the year,
 * so the numbering rule is testable without a database.
 *
 * The sequence comes from the highest existing reference, never a row count. A
 * count hands the same number out twice the first time an order is deleted, and
 * a duplicated booking ID is the kind of thing that is only noticed once two
 * customers have been quoted under it.
 */

const PATTERN = /^ML-(\d{4})-(\d+)$/;

export function formatReference(year: number, sequence: number): string {
  return `ML-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseReference(
  reference: string,
): { year: number; sequence: number } | null {
  const match = PATTERN.exec(reference);
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

export function nextReference(
  year: number,
  highestExisting: string | null,
): string {
  const parsed = highestExisting ? parseReference(highestExisting) : null;

  // A reference from an earlier year does not carry over — the sequence
  // restarts each January.
  if (!parsed || parsed.year !== year) return formatReference(year, 1);

  return formatReference(year, parsed.sequence + 1);
}
