import { expect, test } from "@playwright/test";
import { address, createUser, logInAs, pickShoe, putInBag, setupStore } from "./helpers";

test.beforeAll(setupStore);

test("a second order starts a fresh checkout, not the last order's thank-you screen @phone", async ({ page }, info) => {
  const userId = await createUser({ name: "Hina Shah", email: `hina.${info.project.name}@example.com`, savedAddress: address });
  const shoe = await pickShoe();
  await putInBag(userId, shoe.slug, shoe.sizes[0]);
  await logInAs(page, userId, "customer");

  // First order (bank transfer: no code needed).
  await page.goto("/checkout");
  await page.getByLabel("Bank Transfer").check();
  await page.locator('button[type="submit"]:visible', { hasText: "Place Order" }).first().click();
  await expect(page.getByRole("heading", { name: /Thank You/ })).toBeVisible();

  // Keep shopping inside the app (client navigation keeps pages alive in the background).
  await page.getByRole("link", { name: "Continue Shopping" }).click();
  await expect(page).toHaveURL(/\/collections/);
  // Add another shoe from Quick View on the collections page (no full page load:
  // that would clear the kept pages and hide the problem).
  // A shoe that exists in the test database (the built pages may also list real-only products).
  const next = await pickShoe();
  await page.locator('main h3 button[aria-haspopup="dialog"]:visible', { hasText: next.name }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /Add to Bag/ }).click();

  // Back to checkout from the mini bag.
  await page.getByRole("link", { name: /checkout/i }).first().click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.locator('button[type="submit"]:visible', { hasText: "Place Order" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Thank You/ })).toHaveCount(0);
  // …and the shoe just added is still in the bag (the old screen used to empty it).
  await expect(page.getByText("Order Summary").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/1 pair/i).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Shopping Bag \(1 items?\)/ })).toBeVisible();
});
