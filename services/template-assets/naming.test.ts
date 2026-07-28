import { describe, expect, it } from "vitest";
import {
  defaultDisplayName,
  extensionOf,
  slugifyFilename,
  templateAssetPath,
  templateThumbnailPath,
} from "./naming";

const AT = new Date("2026-07-28T09:15:00.000Z");
const ID = "3f1c2b4a-0000-4000-8000-000000000abc";

describe("extensionOf", () => {
  it("reads the last extension", () => {
    expect(extensionOf("cover.PNG")).toBe(".png");
    expect(extensionOf("design.final.v2.jpg")).toBe(".jpg");
  });

  it("treats a dotfile as having no extension", () => {
    expect(extensionOf(".env")).toBe("");
    expect(extensionOf("noextension")).toBe("");
  });
});

describe("slugifyFilename", () => {
  it("reduces a filename to a url-safe slug", () => {
    expect(slugifyFilename("Rustic Garden Invite.png")).toBe(
      "rustic-garden-invite",
    );
    expect(slugifyFilename("Debut_2026 (final).jpg")).toBe("debut-2026-final");
  });

  /**
   * The security case. A filename is attacker-controlled: it arrives in a
   * multipart header and nothing upstream constrains it. Collapsing every
   * non-alphanumeric run to a hyphen defuses traversal, absolute paths,
   * backslashes and NUL in one rule, rather than a blocklist that has to
   * predict each trick.
   */
  it("cannot escape its folder", () => {
    for (const hostile of [
      "../../secrets.png",
      "..\\..\\windows\\system32.png",
      "/etc/passwd.png",
      "....//....//x.png",
    ]) {
      const slug = slugifyFilename(hostile);
      expect(slug, hostile).not.toContain("/");
      expect(slug, hostile).not.toContain("\\");
      expect(slug, hostile).not.toContain("..");
    }
  });

  it("never returns an empty segment", () => {
    expect(slugifyFilename("___.png")).toBe("artwork");
    expect(slugifyFilename("....png")).toBe("artwork");
    expect(slugifyFilename("🎉.png")).toBe("artwork");
  });

  it("caps the length without leaving a trailing hyphen", () => {
    const slug = slugifyFilename(`${"a-".repeat(80)}.png`);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("templateAssetPath", () => {
  it("folders by year and month and leads with the row id", () => {
    expect(templateAssetPath(ID, "Rustic Garden.png", AT)).toBe(
      `covers/2026/07/${ID}-rustic-garden.png`,
    );
  });

  /**
   * The brief's "duplicate filenames" requirement. Two admins uploading the
   * same filename must not collide, and must not overwrite one another —
   * which is what reusing the supplied name would do.
   */
  it("gives two uploads of the same filename different paths", () => {
    const a = templateAssetPath("11111111-0000-4000-8000-00000000aaaa", "cover.png", AT);
    const b = templateAssetPath("22222222-0000-4000-8000-00000000bbbb", "cover.png", AT);
    expect(a).not.toBe(b);
  });

  it("keeps the extension so storage serves the right content type", () => {
    expect(templateAssetPath(ID, "a.webp", AT).endsWith(".webp")).toBe(true);
  });

  it("pads the month", () => {
    const path = templateAssetPath(ID, "x.png", new Date("2026-01-05T00:00:00Z"));
    expect(path.startsWith("covers/2026/01/")).toBe(true);
  });
});

describe("templateThumbnailPath", () => {
  it("sits beside the original and is always webp", () => {
    expect(templateThumbnailPath("covers/2026/07/abc-rustic.png")).toBe(
      "covers/2026/07/abc-rustic-thumb.webp",
    );
  });
});

describe("defaultDisplayName", () => {
  it("title-cases the filename", () => {
    expect(defaultDisplayName("rustic-garden-invite.png")).toBe(
      "Rustic Garden Invite",
    );
    expect(defaultDisplayName("Debut_2026 (final).jpg")).toBe(
      "Debut 2026 Final",
    );
  });

  it("falls back rather than naming something the empty string", () => {
    expect(defaultDisplayName("___.png")).toBe("Artwork");
    expect(defaultDisplayName("🎉🎉.jpg")).toBe("Artwork");
  });

  /**
   * ".png" is a hidden file *named* ".png", not an extension — extensionOf says
   * so, and this follows from it. Documented rather than special-cased because
   * validation rejects a file with no permitted extension long before a display
   * name is ever needed, so contorting the rule here would buy nothing.
   */
  it("reads a dotfile literally", () => {
    expect(defaultDisplayName(".png")).toBe("Png");
  });
});
