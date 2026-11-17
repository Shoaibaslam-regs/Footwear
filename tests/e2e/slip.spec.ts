import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { address, db, logInAs, setupStore } from "./helpers";

let adminId: ObjectId;
test.beforeAll(async () => {
  adminId = await setupStore();
});

test("Print slip opens the print dialog in one tap, on the same page (order page and list)", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop");
  // Record print() calls instead of opening the real dialog (in every frame).
  await context.addInitScript(() => {
    window.print = () => {
      const top = window.top as Window & { __printed?: string[] };
      top.__printed = [...(top.__printed ?? []), location.pathname];
    };
  });
  const shoe = await (await db()).collection("products").findOne({ status: "published" });
  const _id = new ObjectId();
  const now = new Date();
  await (await db()).collection("orders").insertOne({
    _id, number: "EL-SLIP01", userId: new ObjectId(), status: "pending",
    customer: { name: "Hina Shah", email: "hina@example.com", phone: address.phone }, address: { ...address, country: "PK" },
    items: [{ slug: shoe!.slug, name: shoe!.name, size: 38, quantity: 1, unitPrice: shoe!.price, listPrice: shoe!.price, discountPercent: 0, image: shoe!.image, alt: shoe!.name }],
    listTotal: shoe!.price, discountTotal: 0, shippingFee: 0, total: shoe!.price, delivery: { id: "std", name: "Standard" },
    payment: { method: "cod", status: "pending", reference: "" }, trackingNumber: "", history: [], createdAt: now, updatedAt: now,
  });
  await logInAs(page, adminId, "admin");
  const printed = () => page.evaluate(() => (window as Window & { __printed?: string[] }).__printed ?? []);

  // Order page
  await page.goto(`/admin/orders/${_id.toHexString()}`);
  const pagesBefore = context.pages().length;
  await page.getByRole("button", { name: "Print slip" }).click();
  await expect.poll(printed).toEqual([`/admin/orders/${_id.toHexString()}/slip`]);
  expect(context.pages()).toHaveLength(pagesBefore); // no new tab
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${_id.toHexString()}$`));
  // The frame really holds this order's slip.
  await expect(page.frameLocator("#slip-print-frame").getByText("EL-SLIP01").first()).toBeVisible();

  // Orders list: the row's Print button does the same.
  await page.goto("/admin/orders");
  await page.locator("tbody tr", { hasText: "EL-SLIP01" }).getByRole("button", { name: "Print" }).click();
  await expect.poll(async () => (await printed()).length).toBe(1);
  expect(context.pages()).toHaveLength(pagesBefore);
  await expect(page).toHaveURL(/\/admin\/orders$/);
});
