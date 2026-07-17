import { routes } from "@/lib/config";

/**
 * Sanitise a post-login redirect target.
 *
 * `?redirectTo=` is attacker-controlled: it arrives in a URL that anyone can
 * compose and send to a victim. Redirecting to it unchecked turns the login
 * page into an open redirect — a link that genuinely starts on our domain,
 * survives a real login, and lands the user on a phishing clone of it.
 *
 * Only same-site absolute paths are allowed through. Everything else falls back
 * to the dashboard.
 *
 * Rejected on purpose:
 *   "https://evil.test"  — absolute URL, different origin
 *   "//evil.test"        — protocol-relative; the browser reads this as a host
 *   "/\evil.test"        — backslash, which some parsers fold into "//"
 *   "javascript:..."     — scheme, not a path
 */

/**
 * Control characters and space, by code point rather than a regex with hex
 * escapes — the escapes are easy to typo into a range that silently matches
 * nothing, and this reads as what it means.
 *
 * They matter because browsers strip them while parsing a URL: "/\t/evil.test"
 * reaches this function looking like a path and leaves the browser as
 * "//evil.test" — a host. Reject rather than try to normalise.
 */
function hasUnsafeChars(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function safeRedirect(target: string | undefined | null): string {
  const fallback = routes.dashboard.root;
  if (!target) return fallback;

  // Must be an absolute path, and must not begin a network-path reference.
  if (!target.startsWith("/")) return fallback;
  if (target.startsWith("//")) return fallback;
  if (target.startsWith("/\\")) return fallback;

  if (hasUnsafeChars(target)) return fallback;

  return target;
}
