/**
 * Theme handling — Ph1.md §5 (Basic Preferences).
 *
 * The stored preference is one of three values; the *applied* theme is only
 * ever light or dark. "SYSTEM" is a rule, not a colour, and resolving it is
 * this module's job.
 */

export type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

export const THEME_STORAGE_KEY = "ml-dep-theme";

/** The attribute app/globals.css keys its dark palette off. */
export const THEME_ATTRIBUTE = "data-theme";

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "LIGHT") return "light";
  if (preference === "DARK") return "dark";

  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Apply a theme now and remember it locally.
 *
 * localStorage is not the source of truth — the database is (see the Preference
 * model). It exists so the inline script below can paint the right colours on
 * the very first frame, before any server data has been fetched.
 */
export function applyTheme(preference: ThemePreference): void {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute(
    THEME_ATTRIBUTE,
    resolveTheme(preference),
  );

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode, or storage disabled. The theme still applied; only the
    // no-flash optimisation is lost, and that is not worth throwing over.
  }
}

/**
 * Runs before first paint, inlined in <head>.
 *
 * Kept as a string on purpose: it must execute synchronously, ahead of React
 * and ahead of the first paint. Anything else means the page renders light,
 * hydrates, then snaps to dark — the flash every themed site is judged on.
 *
 * Deliberately tiny and self-contained. It reads only our own storage key, and
 * has no interpolated values, so there is nothing here for a caller to inject.
 */
export const themeInitScript = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var dark = stored === 'DARK' ||
      ((!stored || stored === 'SYSTEM') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('${THEME_ATTRIBUTE}', dark ? 'dark' : 'light');
  } catch (e) {}
})();
`;
