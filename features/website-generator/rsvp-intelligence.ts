export type RsvpStatusFilter = "all" | "attending" | "declined" | "pending";
export interface RsvpCriteria {
  query: string;
  status: RsvpStatusFilter;
}
export function parseRsvpCriteria(input: {
  q?: string | string[];
  status?: string | string[];
}): RsvpCriteria {
  const rawQuery = Array.isArray(input.q) ? input.q[0] : input.q;
  const rawStatus = Array.isArray(input.status)
    ? input.status[0]
    : input.status;
  const status: RsvpStatusFilter = [
    "attending",
    "declined",
    "pending",
  ].includes(rawStatus ?? "")
    ? (rawStatus as RsvpStatusFilter)
    : "all";
  return { query: (rawQuery ?? "").trim().slice(0, 120), status };
}
export interface RsvpExportRow {
  guestName: string;
  attending: boolean;
  guestCount: number;
  message: string | null;
  createdAt: Date;
}
function csvCell(value: string | number): string {
  let safe = String(value);
  if (/^[=+\-@]/.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function rsvpCsv(rows: RsvpExportRow[]): string {
  const header = [
    "Guest name",
    "Status",
    "Party size",
    "Message",
    "Submitted at",
  ];
  const lines = rows.map((row) =>
    [
      row.guestName,
      row.attending ? "Attending" : "Declined",
      row.guestCount,
      row.message ?? "",
      row.createdAt.toISOString(),
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.map(csvCell).join(","), ...lines].join("\r\n");
}
