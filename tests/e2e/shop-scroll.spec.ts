import { expect, test } from "@playwright/test";
import { setupStore } from "./helpers";

test.beforeAll(setupStore);

const PAGE = 12; // PAGE_SIZE in lib/catalog-filters.ts

test("the shop loads more shoes as the customer scrolls, page by page @phone", async ({ page }) => {
  await page.goto("/collections");
  const total = Number((await page.getByText(/^\d+ shoes?$/).first().innerText()).match(/\d+/)![0]);
  const cards = page.locator("#catalog-grid article");
  await expect(cards).toHaveCount(Math.min(PAGE, total));
  test.skip(total <= PAGE, "needs more than one page of shoes");

  // Near the end, the next page appears by itself (no page numbers, no jump to the top).
  const y = await page.evaluate(() => window.scrollY);
  await page.getByText(/^Showing \d+ of \d+$/).scrollIntoViewIfNeeded();
  await expect(cards).toHaveCount(Math.min(2 * PAGE, total));
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y);
  if (total <= 2 * PAGE) await expect(page.getByText(`All ${total} shoes shown`)).toBeVisible();

  // A filter change starts again from the first page.
  await page.getByRole("button", { name: /^All\s*\d+$/ }).first().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: /^Heels\s*\d+$/ }).click();
  const heels = Number((await page.getByText(/^\d+ shoes?$/).first().innerText()).match(/\d+/)![0]);
  await expect(cards).toHaveCount(Math.min(PAGE, heels));
});
