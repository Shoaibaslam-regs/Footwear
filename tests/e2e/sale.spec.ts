import { expect, test } from "@playwright/test";
import { BASE, address, createUser, db, logInAs, makeReturning, pickShoe, putInBag, setupStore } from "./helpers";

let adminId: Awaited<ReturnType<typeof setupStore>>;
test.beforeAll(async () => {
  adminId = await setupStore();
});

/** "YYYY-MM-DDTHH:MM" in Pakistan time, `ms` from now (for datetime-local inputs). */
const pkt = (ms: number) => new Date(Date.now() + ms + 5 * 3_600_000).toISOString().slice(0, 16);
const rs = (n: number) => n.toLocaleString("en-US");

/** A full-price shoe on the site that pickShoe() (used by the other tests) doesn't pick. */
async function saleShoe() {
  const taken = (await pickShoe()).slug;
  const html = await (await fetch(`${BASE}/collections`)).text();
  const onSite = new Set([...html.matchAll(/\/products\/([a-z0-9-]+)/g)].map((x) => x[1]));
  const shoes = (await (await db()).collection("products").find({ status: "published", discountPercent: 0 }).sort({ price: 1 }).toArray()) as unknown as {
    slug: string;
    name: string;
    price: number;
    sizes: number[];
  }[];
  return shoes.find((s) => s.slug !== taken && onSite.has(s.slug) && s.sizes?.length)!;
}

test("a sale: created in the admin, shown on the site, charged at checkout, stopped early", async ({ browser }) => {
  const shoe = await saleShoe();
  const salePrice = Math.round(shoe.price * 0.7);

  // 1. The admin creates a sale on one hand-picked shoe, live from an hour ago.
  const admin = await browser.newPage();
  await logInAs(admin, adminId, "admin");
  await admin.goto("/admin/sales/new");
  await admin.getByLabel("Name", { exact: true }).fill("11.11 Sale");
  await admin.getByLabel("Tag on cards").fill("11.11");
  await admin.getByLabel("Starts (Pakistan time)").fill(pkt(-3_600_000));
  await admin.getByLabel("Ends (Pakistan time)").fill(pkt(86_400_000));
  await admin.getByLabel("Hand-picked shoes").check();
  await admin.getByLabel(`Percent off ${shoe.name}`).fill("30");
  await expect(admin.getByText("Up to 30% off")).toBeVisible(); // the preview works it out
  await admin.getByRole("button", { name: "Create sale" }).click();
  await expect(admin.getByText("Saved 11.11 Sale.")).toBeVisible();
  await expect(admin.locator("tbody tr", { hasText: "11.11 Sale" }).getByText("Live")).toBeVisible();

  // 2. Customers see the banner on the home page and the sale price on the shoe.
  const userId = await createUser({ name: "Sana", email: "sana.sale@example.com", savedAddress: address });
  const page = await browser.newPage();
  await logInAs(page, userId, "customer");
  await page.goto("/");
  await expect(page.getByRole("region", { name: "11.11 Sale, up to 30% off" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Shop the Sale/ })).toBeVisible();
  await page.goto(`/products/${shoe.slug}`);
  await expect(page.getByText(/11\.11 Sale ends/)).toBeVisible();
  await expect(page.locator("main").getByText(rs(salePrice)).first()).toBeVisible();

  // 3. Checkout charges the sale price, and the order remembers the sale.
  await putInBag(userId, shoe.slug, shoe.sizes[0]);
  await makeReturning(userId);
  await page.goto("/checkout");
  await page.locator('button[type="submit"]:visible', { hasText: "Place Order" }).first().click();
  await expect(page.getByRole("heading", { name: /Thank You/ })).toBeVisible();
  const order = await (await db()).collection("orders").findOne({ userId, status: { $ne: "delivered" } });
  expect(order?.items[0]).toMatchObject({ slug: shoe.slug, unitPrice: salePrice, listPrice: shoe.price, discountPercent: 30, sale: { name: "11.11 Sale" } });

  // 4. The admin stops it early: prices go back at once.
  await admin.goto("/admin/sales");
  await admin.locator("tbody tr", { hasText: "11.11 Sale" }).getByRole("button", { name: "Stop" }).click();
  await admin.getByRole("button", { name: "Stop sale" }).click();
  await expect(admin.getByText("Sale stopped. Every price is back to normal.")).toBeVisible();
  await page.goto(`/products/${shoe.slug}`);
  await expect(page.locator("main").getByText(rs(shoe.price)).first()).toBeVisible();
  await expect(page.getByText(/11\.11 Sale ends/)).toHaveCount(0);
  await page.goto("/");
  await page.waitForTimeout(500);
  await expect(page.getByRole("region", { name: /11\.11 Sale/ })).toHaveCount(0);
  await admin.close();
});
