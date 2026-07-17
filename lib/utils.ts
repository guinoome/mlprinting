import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind class names, resolving conflicts.
 * Shared by every design-system component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Initials for an avatar fallback.
 *
 * Falls back to the first character for a single-word name, and to "?" for
 * nothing usable — an avatar with an empty circle reads as a broken image.
 * Uses the first and last word, so "Maria Luisa Santos" gives "MS" rather
 * than "ML", which is what a person would write.
 */
export function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";

  const first = [...words[0]!][0] ?? "";
  const last = words.length > 1 ? ([...words[words.length - 1]!][0] ?? "") : "";

  return (first + last).toUpperCase() || "?";
}

/**
 * Format a byte count for display.
 * Binary units (1024), because that is what a file manager reports and a
 * mismatch between the two reads as a bug.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);

  // Whole numbers for bytes; one decimal above that.
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}
