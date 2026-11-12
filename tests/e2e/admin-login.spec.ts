import { expect, test } from "@playwright/test";
import { ADMIN_SECRET, createUser, logInAs, setupStore } from "./helpers";

test.beforeAll(setupStore);

test("admins log in only through the secret; customers can't use the admin form", async ({ page }) => {
  // The admin password alone isn't enough on the normal form.
  await page.goto("/login");
  await page.locator("main").getByLabel("Email").fill("owner@example.com");
  await page.locator("main").getByLabel("Password").fill("AdminPass1");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();

  // The secret in the email box opens the admin form.
  await page.locator("main").getByLabel("Email").fill(ADMIN_SECRET);
  await page.locator("main").getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await expect(page.getByText("Admin login")).toBeVisible();

  // The link goes back to the customer form.
  await page.getByRole("button", { name: "Not an admin? Log in as a customer" }).click();
  await expect(page.getByRole("button", { name: "Log In", exact: true })).toBeVisible();

  await page.locator("main").getByLabel("Email").fill(ADMIN_SECRET);
  await page.locator("main").getByLabel("Password").fill("anything");
  await page.getByRole("button", { name: "Log In", exact: true }).click();
  await page.locator("main").getByLabel("Admin email").fill("owner@example.com");
  await page.locator("main").getByLabel("Password").fill("AdminPass1");
  await page.getByRole("button", { name: "Open Admin Panel" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
});

test("visitors and customers are kept out of the admin panel", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);

  const id = await createUser({ name: "Ayesha", email: "ayesha.admincheck@example.com" });
  await logInAs(page, id, "customer");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/account\?denied=admin/);
  await expect(page.getByText("Only Ŕose Atelier admins can open the admin panel.")).toBeVisible();
});
