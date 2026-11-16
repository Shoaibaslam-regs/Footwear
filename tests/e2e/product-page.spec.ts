import { expect, test } from "@playwright/test";
import { db, pickShoe, setupStore } from "./helpers";

test.beforeAll(setupStore);

test("product page: this shoe's own facts, and Add to Bag stays in reach on phones @phone", async ({ page }, info) => {
  const shoe = await pickShoe();
  const listing = (await (await db()).collection("products").findOne({ slug: shoe.slug }))!;
  await page.goto(`/products/${shoe.slug}`);

  // "How it's made" shows this listing's material, never another shoe's figures.
  const craft = page.getByRole("heading", { name: /Made by Hand/ }).locator("xpath=ancestor::section[1]");
  await expect(craft).toContainText(listing.material);
  await expect(page.getByText(/carbon support|Comfortable for 8 Hours/)).toHaveCount(0);

  // One main Add to Bag; no quantity stepper.
  await expect(page.getByRole("button", { name: "Increase quantity" })).toHaveCount(0);
  const bar = page.locator("div.fixed.bottom-0").filter({ has: page.getByRole("button", { name: /Add to Bag|In Bag/ }) });
  if (info.project.name !== "phone") return; // the bar is for phones and tablets
  await expect(bar).toHaveCount(0); // the main button is on screen
  await craft.scrollIntoViewIfNeeded();
  await expect(bar).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toHaveCount(0);
});
