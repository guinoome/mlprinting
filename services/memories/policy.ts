export type MemoryWindowState = "disabled" | "not-open" | "open" | "closed";
export function memoryWindowState(
  settings: { enabled: boolean; opensAt: Date | null; closesAt: Date | null },
  now = new Date(),
): MemoryWindowState {
  if (!settings.enabled) return "disabled";
  if (settings.opensAt && now < settings.opensAt) return "not-open";
  if (settings.closesAt && now > settings.closesAt) return "closed";
  return "open";
}
export function approvedContentMayBePublic(mode: string): boolean {
  return mode === "GUEST_GALLERY" || mode === "LIVE_WALL";
}
