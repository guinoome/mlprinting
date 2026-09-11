import { expect, test } from "@playwright/test";

const PHONE_WIDTHS = [320, 390] as const;
const EXPERIENCE_SLUGS = [
  "ivory-lace",
  "blush-botanical",
  "midnight-gold",
] as const;
const STARLIGHT_PHONE_WIDTHS = [360, 375, 390, 393, 412, 430] as const;

for (const width of PHONE_WIDTHS) {
  test.describe(`${width}px phone viewport`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true });

    test("experience finder scrolls inside its rail without widening the page", async ({
      page,
    }) => {
      await page.goto("/#find-your-experience");

      const finder = page.locator("#find-your-experience");
      const rail = page.locator(".experience-finder-rail");
      await expect(finder).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Find your experience." }),
      ).toBeVisible();

      const metrics = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
      expect(
        await rail.evaluate((element) => element.scrollWidth),
      ).toBeGreaterThan(await rail.evaluate((element) => element.clientWidth));
    });

    for (const slug of EXPERIENCE_SLUGS) {
      test(`${slug} owns its opening screen and remains usable`, async ({
        page,
      }) => {
        await page.goto(`/invite-preview?template=${slug}`);

        const entry = page.locator(
          `.inv-entry--${
            slug === "ivory-lace"
              ? "atelier-ivory"
              : slug === "blush-botanical"
                ? "botanical-romance"
                : "midnight-metallic"
          }`,
        );
        const action = entry.locator(".inv-entry-action");
        await expect(entry).toBeVisible();
        await expect(action).toBeVisible();

        const pageWidth = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.client);

        const entryStyle = await entry.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            backgroundImage: style.backgroundImage,
            backgroundSize: style.backgroundSize,
          };
        });
        expect(entryStyle.backgroundImage).toContain(
          `/experiences/${slug}-hero.png`,
        );
        expect(entryStyle.backgroundSize).toBe("cover");

        const actionBox = await action.boundingBox();
        expect(actionBox).not.toBeNull();
        expect(actionBox!.height).toBeGreaterThanOrEqual(44);
        expect(actionBox!.x).toBeGreaterThanOrEqual(0);
        expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(width);

        await action.click();
        await expect(page.locator(".inv-reveal-root")).toHaveAttribute(
          "data-opened",
          "true",
        );
        await expect(entry).toHaveCount(0);
      });
    }
  });
}

test.describe.serial("Starlight phone-width release gate", () => {
  for (const width of STARLIGHT_PHONE_WIDTHS) {
    test(`Starlight keeps its two-stage promise at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/invite-preview?template=starlight-pony-dreamscape");

      const entry = page.locator(".inv-entry--starlight-dreamscape");
      const begin = entry.getByRole("button", { name: /begin the magic/i });
      await expect(entry.getByText("Mia", { exact: true })).toBeVisible();
      await expect(entry.getByText(/turns\s*3/i)).toBeVisible();
      await expect(begin).toBeVisible();

      const entryWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(entryWidth.scroll).toBeLessThanOrEqual(entryWidth.client);

      const beginBox = await begin.boundingBox();
      expect(beginBox).not.toBeNull();
      expect(beginBox!.height).toBeGreaterThanOrEqual(44);
      expect(beginBox!.x).toBeGreaterThanOrEqual(0);
      expect(beginBox!.x + beginBox!.width).toBeLessThanOrEqual(width);

      await begin.click();
      await expect(page.locator(".inv-reveal-root")).toHaveAttribute(
        "data-opened",
        "true",
      );

      const hero = page.locator(".starlight-hero");
      await expect(hero.getByRole("heading", { name: "Mia" })).toBeVisible();
      await expect(hero.getByText(/turns\s*3/i)).toBeVisible();
      await expect(hero.getByText("The magic begins in")).toBeVisible();
      await expect(hero.getByRole("link", { name: /rsvp now/i })).toBeVisible();
      await expect(
        hero.getByRole("img", { name: /Mia, the birthday celebrant/i }),
      ).toBeVisible();

      const revealWidth = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(revealWidth.scroll).toBeLessThanOrEqual(revealWidth.client);
    });
  }
});
