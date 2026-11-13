import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { BASE, createUser, db, pickShoe, sessionFor, setupStore } from "./helpers";

/**
 * A login cookie can be genuine but dead: the account was deleted, its
 * password was changed (older logins are signed out), or its role changed.
 * The site must treat it as logged out: no redirect loop, and the login popup.
 */
test.beforeAll(setupStore);

const giveCookie = async (page: import("@playwright/test").Page, value: string) =>
  page.context().addCookies([{ name: "elora_session", value, url: BASE }]);
const cookie = async (page: import("@playwright/test").Page) =>
  (await page.context().cookies()).find((c) => c.name === "elora_session");

test("a cookie for an account that no longer exists: Account opens the login form, no loop", async ({ page }) => {
  await giveCookie(page, await sessionFor(new ObjectId(), "customer"));
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
  await expect(page.locator("main").getByRole("button", { name: "Log In", exact: true })).toBeVisible();
});

test("a cookie from before a password change: Add to Bag shows the login popup and the cookie is removed", async ({ page }) => {
  const id = await createUser({ name: "Zara", email: "zara.stale@example.com" });
  await giveCookie(page, await sessionFor(id, "customer"));
  // The password was changed after this cookie was issued.
  await (await db()).collection("users").updateOne({ _id: id }, { $set: { passwordChangedAt: new Date(Date.now() + 60_000) } });
  const shoe = await pickShoe();
  await page.goto("/collections");
  await page.locator('main h3 button[aria-haspopup="dialog"]:visible', { hasText: shoe.name }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: /Add to Bag/ }).click();
  await expect(page.getByText("Log in to continue")).toBeVisible();
  expect(await cookie(page)).toBeUndefined();
});

test("an old admin cookie for an account that is now a customer: no loop", async ({ page }) => {
  const id = await createUser({ name: "Former Admin", email: "former.admin@example.com", role: "customer" });
  await giveCookie(page, await sessionFor(id, "admin"));
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?denied=admin/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole("heading", { name: /Welcome, Former/ })).toBeVisible();
});
