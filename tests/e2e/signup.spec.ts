import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { address, createUser, db, logInAs, pickShoe, putInBag, setupStore, typeCode, waitForCode } from "./helpers";

test.beforeAll(setupStore);

async function fillSignUp(page: import("@playwright/test").Page, email: string) {
  await page.goto("/register");
  await page.locator("main").getByLabel("Full Name").fill("Sana Malik");
  await page.locator("main").getByLabel("Email").fill(email);
  await page.locator("main").getByLabel("Password", { exact: true }).fill("Secret123");
  await page.locator("main").getByLabel("Confirm Password").fill("Secret123");
  await page.getByRole("button", { name: "Create Account" }).click();
}

test("sign-up: the account is only created after the emailed code; a Gmail alias is refused @phone", async ({ page, browser }, info) => {
  const email = `sana.malik.${info.project.name}@gmail.com`;
  await fillSignUp(page, email);
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
  expect(user?.emailKey).toBe(`sanamalik${info.project.name}@gmail.com`);

  // The same inbox spelled differently can't open a second account (refused before any code is sent).
  const other = await browser.newPage();
  await fillSignUp(other, `Sana.Malik.${info.project.name}+deals@gmail.com`);
  await expect(other.getByText("An account with this email already exists. Please log in.")).toBeVisible();
  await other.close();
});

test("a new account can apply a coupon straight away (no email code)", async ({ page }) => {
  const email = "farah.coupon@example.com";
  const userId = await createUser({ name: "Farah", email, savedAddress: address });
  await (await db()).collection("coupons").insertOne({
    _id: new ObjectId(), code: "HELLO10", type: "percent", value: 10, maxDiscount: null, minOrder: null, fullPriceOnly: false,
    startsAt: null, endsAt: null, maxUses: null, perCustomer: 1, active: true, public: false, uses: 0, createdAt: new Date(), updatedAt: new Date(),
  });
  const shoe = await pickShoe();
  await putInBag(userId, shoe.slug, shoe.sizes[0]);
  await logInAs(page, userId, "customer");
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Have a coupon code?" }).first().click();
  await page.locator("#coupon-code").fill("hello10");
  await page.locator("#coupon-code").press("Enter");
  await expect(page.getByText("HELLO10").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confirm your email" })).toHaveCount(0);
});
