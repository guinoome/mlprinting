import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveTheme, themeInitScript, THEME_STORAGE_KEY } from "./theme";

afterEach(() => vi.unstubAllGlobals());

/** Stub matchMedia to report a system preference. */
function stubSystemDark(dark: boolean) {
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: dark && query.includes("dark"),
    }),
  });
}

describe("resolveTheme", () => {
  it("resolves the explicit preferences without consulting the system", () => {
    expect(resolveTheme("LIGHT")).toBe("light");
    expect(resolveTheme("DARK")).toBe("dark");
  });

  it("follows the system preference for SYSTEM", () => {
    stubSystemDark(true);
    expect(resolveTheme("SYSTEM")).toBe("dark");

    stubSystemDark(false);
    expect(resolveTheme("SYSTEM")).toBe("light");
  });

  it("defaults to light on the server, where no system preference exists", () => {
    // window is undefined during SSR; resolveTheme must not throw there.
    expect(resolveTheme("SYSTEM")).toBe("light");
  });
});

describe("themeInitScript", () => {
  it("reads the same storage key applyTheme writes", () => {
    expect(themeInitScript).toContain(THEME_STORAGE_KEY);
  });

  it("carries no interpolated user data", () => {
    expect(themeInitScript).not.toContain("${");
  });

  it("swallows its own errors so a storage exception cannot block first paint", () => {
    expect(themeInitScript).toContain("catch");
  });
});
