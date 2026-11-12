import { expect, test } from "@playwright/test";
import { db, setupStore, typeCode, waitForCode } from "./helpers";

test.beforeAll(setupStore);

test("sign-up: the account is only created after the emailed code @phone", async ({ page }, info) => {
  const email = `sana.${info.project.name}@example.com`;
  await page.goto("/register");
  await page.locator("main").getByLabel("Full Name").fill("Sana Malik");
  await page.locator("main").getByLabel("Email").fill(email);
  await page.locator("main").getByLabel("Password", { exact: true }).fill("Secret123");
  await page.locator("main").getByLabel("Confirm Password").fill("Secret123");
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(page.getByRole("heading", { name: "Confirm your email" })).toBeVisible();
  expect(await (await db()).collection("users").countDocuments({ email })).toBe(0);

  const code = await waitForCode(email);
  await typeCode(page, code === "000000" ? "111111" : "000000");
  await expect(page.getByText("That code isn't right. 4 tries left.")).toBeVisible();

  // The boxes clear after a wrong code; typing the right one sends it once.
  await expect(page.getByLabel("Digit 1 of 6")).toHaveValue("");
  await typeCode(page, code);
  await expect(page).toHaveURL(/\/account/);
  const user = await (await db()).collection("users").findOne({ email });
  expect(user?.emailVerifiedAt).toBeTruthy();
  expect(user?.role).toBe("customer");
});
