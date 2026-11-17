import { expect, test } from "@playwright/test";
import { db, setupStore } from "./helpers";

test.beforeAll(setupStore);

test("Recently Viewed lists the shoes seen before, newest first, and keeps them across visits @phone", async ({ page }) => {
  const shoes = (await (await db()).collection("products").find({ status: "published" }).limit(4).toArray()) as unknown as { slug: string; name: string }[];
  for (const s of shoes.slice(0, 3)) {
    await page.goto(`/products/${s.slug}`);
    // Wait until the page has recorded the visit (it does so once it has loaded).
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("elora:recently-viewed") ?? "[]")[0])).toBe(s.slug);
  }
  await page.goto(`/products/${shoes[3].slug}`);
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Recently Viewed" }) });
  await expect(section).toBeVisible();
  const names = section.locator("a .line-clamp-2");
  await expect(names).toHaveText([shoes[2].name, shoes[1].name, shoes[0].name]);
  // The current shoe is never listed, and the history survives the visit.
  await expect(section.getByText(shoes[3].name, { exact: true })).toHaveCount(0);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("elora:recently-viewed") ?? "[]"));
  expect(saved.slice(0, 4)).toEqual([shoes[3].slug, shoes[2].slug, shoes[1].slug, shoes[0].slug]);
});
