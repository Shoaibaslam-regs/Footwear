import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { address, db, logInAs, setupStore } from "./helpers";

let adminId: ObjectId;
test.beforeAll(async () => {
  adminId = await setupStore();
});

test("a new order is highlighted with a sidebar count until an admin opens it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  const orders = (await db()).collection("orders");
  await orders.updateMany({}, { $set: { viewedAt: new Date() } }); // start from "all seen"
  const _id = new ObjectId();
  const now = new Date();
  await orders.insertOne({
    _id, number: "EL-UNSEEN", userId: new ObjectId(), status: "pending",
    customer: { name: "Mehwish", email: "mehwish@example.com", phone: address.phone }, address: { ...address, country: "PK" },
    items: [], listTotal: 0, discountTotal: 0, shippingFee: 0, total: 0, delivery: { id: "std", name: "Standard" },
    payment: { method: "cod", status: "pending", reference: "" }, trackingNumber: "", history: [], createdAt: now, updatedAt: now,
  });
  await logInAs(page, adminId, "admin");
  await page.goto("/admin/orders");
  const ordersLink = page.getByRole("navigation", { name: "Admin" }).getByRole("link", { name: /Orders/ });
  await expect(ordersLink.getByLabel("1 new")).toBeVisible();
  const row = page.locator("tbody tr", { hasText: "EL-UNSEEN" });
  await expect(row).toHaveClass(/row-unviewed/);
  await expect(row.getByText("New", { exact: true })).toBeVisible();

  // Opening it marks it viewed: the highlight and the count go.
  await row.getByRole("link", { name: "EL-UNSEEN" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${_id.toHexString()}`));
  await expect.poll(async () => (await orders.findOne({ _id }))?.viewedAt).toBeTruthy();
  await expect(ordersLink.getByLabel("1 new")).toHaveCount(0);
  await page.goto("/admin/orders");
  await expect(page.locator("tbody tr", { hasText: "EL-UNSEEN" })).not.toHaveClass(/row-unviewed/);
});
