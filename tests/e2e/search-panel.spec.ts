import { expect, test, type Page } from "@playwright/test";
import { createUser, logInAs, setupStore } from "./helpers";

test.beforeAll(setupStore);

const search = (page: Page) => page.getByPlaceholder("Find your next pair…");
async function openSearch(page: Page) {
  await page.getByRole("button", { name: "Search" }).click();
  await expect(search(page)).toBeVisible();
}

test("search closes when another header link is clicked, on desktop", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop header");
  await logInAs(page, await createUser({ name: "Sara", email: "sara.search@example.com" }), "customer");
  await page.goto("/");

  await openSearch(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Shop" }).click();
  await expect(page).toHaveURL(/\/collections/);
  await expect(search(page)).toHaveCount(0);

  await openSearch(page);
  await page.getByRole("link", { name: /^Shopping Bag/ }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(search(page)).toHaveCount(0);

  await openSearch(page);
  await page.getByRole("link", { name: "Account" }).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(search(page)).toHaveCount(0);

  // A link to the page already open closes it too.
  await openSearch(page);
  await page.getByRole("link", { name: "Account" }).click();
  await expect(search(page)).toHaveCount(0);

  // The search icon still toggles it, and Esc still closes it.
  await openSearch(page);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(search(page)).toHaveCount(0);
  await openSearch(page);
  await page.keyboard.press("Escape");
  await expect(search(page)).toHaveCount(0);
});

test("search closes when the menu or the bag is tapped, on phones @phone", async ({ page }, info) => {
  test.skip(info.project.name !== "phone", "phone header");
  await page.goto("/");
  await openSearch(page);
  await page.getByRole("button", { name: "Open Menu" }).click();
  await expect(search(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Close Menu" }).click();

  await openSearch(page);
  await page.getByRole("link", { name: /^Shopping Bag/ }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(search(page)).toHaveCount(0);
});
