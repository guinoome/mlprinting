import { expect, test } from "@playwright/test";

const PHONE_WIDTHS = [320, 390] as const;
const EXPERIENCE_SLUGS = [
  "ivory-lace",
  "blush-botanical",
  "midnight-gold",
] as const;

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
