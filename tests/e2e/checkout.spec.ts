import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { address, createUser, db, logInAs, makeReturning, pickShoe, putInBag, setupStore, typeCode, waitForCode } from "./helpers";

let adminId: ObjectId;
test.beforeAll(async () => {
  adminId = await setupStore();
});

const placeOrder = (page: import("@playwright/test").Page) =>
  page.locator('button[type="submit"]:visible', { hasText: "Place Order" }).first().click();

test("COD from a new customer: confirmed by email code, then it joins the admin queue @phone", async ({ page, browser }, info) => {
  const email = `nadia.${info.project.name}@example.com`;
  const userId = await createUser({ name: "Nadia Khan", email, savedAddress: address });
  const shoe = await pickShoe();
  await putInBag(userId, shoe.slug, shoe.sizes[0]);
  await logInAs(page, userId, "customer");

  await page.goto("/checkout");
  await expect(page.getByLabel("Cash on Delivery")).toBeChecked();
  await placeOrder(page);
  await expect(page.getByRole("heading", { name: "Confirm your order" })).toBeVisible();
  expect(await (await db()).collection("orders").countDocuments({ userId })).toBe(0); // nothing placed yet

  await typeCode(page, await waitForCode(email));
  await expect(page.getByRole("heading", { name: /Thank You/ })).toBeVisible();

  const order = await (await db()).collection("orders").findOne({ userId });
  expect(order?.codeConfirmed).toBe(true);
  expect(order?.payment.method).toBe("cod");
  expect((await (await db()).collection("carts").findOne({ _id: userId }))?.bag).toHaveLength(0);

  // The admin sees it in the queue with the tag.
  const admin = await browser.newPage();
  await logInAs(admin, adminId, "admin");
  await admin.goto("/admin/orders");
  const row = admin.locator("tbody tr", { hasText: order!.number });
  await expect(row).toContainText("Email confirmed");
  await expect(row.locator(".tag", { hasText: /^#\d+$/ })).toBeVisible();
  await admin.close();
});

test("a customer with a delivered order places COD without a code", async ({ page }) => {
  const email = "omar@example.com";
  const userId = await createUser({ name: "Omar", email, savedAddress: address });
  await (await db()).collection("orders").insertOne({
    _id: new ObjectId(), number: "EL-PAST01", userId, status: "delivered", customer: { name: "Omar", email, phone: address.phone },
    address: { ...address, country: "PK" }, items: [], listTotal: 0, discountTotal: 0, shippingFee: 0, total: 0,
    delivery: { id: "std", name: "Standard" }, payment: { method: "cod", status: "paid", reference: "" }, trackingNumber: "T", history: [],
    createdAt: new Date(Date.now() - 10 * 86_400_000), updatedAt: new Date(Date.now() - 10 * 86_400_000),
  });
  const shoe = await pickShoe();
  await putInBag(userId, shoe.slug, shoe.sizes[0]);
  await logInAs(page, userId, "customer");
  await page.goto("/checkout");
  await placeOrder(page);
  await expect(page.getByRole("heading", { name: /Thank You/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confirm your order" })).toHaveCount(0);
});

test("a coupon applied at checkout is taken off the order total", async ({ page }) => {
  const email = "bilal@example.com";
  const userId = await createUser({ name: "Bilal", email, savedAddress: address });
  await (await db()).collection("coupons").insertOne({
    _id: new ObjectId(), code: "TEST20", type: "percent", value: 20, maxDiscount: null, minOrder: null, fullPriceOnly: false,
    startsAt: null, endsAt: null, maxUses: null, perCustomer: 1, active: true, public: false, uses: 0, createdAt: new Date(), updatedAt: new Date(),
  });
  const shoe = await pickShoe();
  await putInBag(userId, shoe.slug, shoe.sizes[0]);
  await makeReturning(userId); // Cash on Delivery without the email code
  await logInAs(page, userId, "customer");

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Have a coupon code?" }).first().click();
  await page.locator("#coupon-code").fill("test20");
  await page.locator("#coupon-code").press("Enter");
  await expect(page.getByText("TEST20").first()).toBeVisible();

  await placeOrder(page);
  await expect(page.getByRole("heading", { name: /Thank You/ })).toBeVisible();
  const order = await (await db()).collection("orders").findOne({ userId, status: { $ne: "delivered" } });
  expect(order?.coupon).toMatchObject({ code: "TEST20", discount: Math.round(shoe.price * 0.2) });
  expect(order?.total).toBe(shoe.price - Math.round(shoe.price * 0.2) + order!.shippingFee);
  expect((await (await db()).collection("coupons").findOne({ code: "TEST20" }))?.uses).toBe(1);
});

test("a coupon on 1 pair takes the percent off only the dearest pair", async ({ page }) => {
  const userId = await createUser({ name: "Rabia", email: "rabia@example.com", savedAddress: address });
  await (await db()).collection("coupons").insertOne({
    _id: new ObjectId(), code: "ONEPAIR", type: "percent", value: 20, maxPairs: 1, maxDiscount: null, minOrder: null, fullPriceOnly: false,
    startsAt: null, endsAt: null, maxUses: null, perCustomer: 1, active: true, public: false, uses: 0, createdAt: new Date(), updatedAt: new Date(),
  });
  // Two different shoes, two pairs of the cheaper one.
  const shoes = (await (await db()).collection("products").find({ status: "published", discountPercent: 0 }).sort({ price: -1 }).toArray()) as unknown as { slug: string; price: number; sizes: number[] }[];
  const onSite = await pickShoe();
  const dear = onSite;
  const cheap = shoes.find((s) => s.slug !== dear.slug && s.price < dear.price && s.sizes?.length)!;
  await (await db()).collection("carts").updateOne(
    { _id: userId },
    { $set: { bag: [{ slug: dear.slug, size: dear.sizes[0], quantity: 1, addedAt: new Date() }, { slug: cheap.slug, size: cheap.sizes[0], quantity: 2, addedAt: new Date() }], wishlist: [] } },
    { upsert: true },
  );
  await makeReturning(userId); // Cash on Delivery without the email code
  await logInAs(page, userId, "customer");
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Have a coupon code?" }).first().click();
  await page.locator("#coupon-code").fill("ONEPAIR");
  await page.locator("#coupon-code").press("Enter");
  await expect(page.getByText("ONEPAIR").first()).toBeVisible();
  await placeOrder(page);
  await expect(page.getByRole("heading", { name: /Thank You/ })).toBeVisible();
  const order = await (await db()).collection("orders").findOne({ userId, status: { $ne: "delivered" } });
  expect(order?.coupon).toMatchObject({ code: "ONEPAIR", discount: Math.round(dear.price * 0.2) });
  expect(order?.total).toBe(dear.price + 2 * cheap.price - Math.round(dear.price * 0.2) + order!.shippingFee);
});

test("checkout offers Cash on Delivery only, and the server refuses any other method", async ({ page }) => {
  const userId = await createUser({ name: "Sana", email: "sana.cod@example.com", savedAddress: address });
  const shoe = await pickShoe();
  await putInBag(userId, shoe.slug, shoe.sizes[0]);
  await makeReturning(userId);
  await logInAs(page, userId, "customer");
  await page.goto("/checkout");
  await expect(page.getByText("Cash on Delivery").filter({ visible: true }).first()).toBeVisible();
  for (const other of ["EasyPaisa", "JazzCash", "Bank Transfer", "Debit / Credit Card"]) await expect(page.getByLabel(other)).toHaveCount(0);

  // A tampered form (someone edits the page) is refused, and no order is made.
  await page.locator('input[name="paymentMethod"]').evaluate((el: HTMLInputElement) => (el.value = "bank"));
  await placeOrder(page);
  await expect(page.getByText("Choose a payment method.").first()).toBeVisible();
  expect(await (await db()).collection("orders").countDocuments({ userId, status: { $ne: "delivered" } })).toBe(0);
});
