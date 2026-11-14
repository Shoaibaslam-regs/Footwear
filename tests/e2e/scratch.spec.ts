import { expect, test, type Page } from "@playwright/test";
import { ObjectId } from "mongodb";
import { createUser, db, logInAs, setupStore } from "./helpers";

test.beforeAll(async () => {
  await setupStore();
  await (await db()).collection("coupons").updateOne(
    { code: "SCRATCH20" },
    { $setOnInsert: { _id: new ObjectId(), code: "SCRATCH20", type: "percent", value: 20, maxDiscount: null, minOrder: null, fullPriceOnly: true, startsAt: null, endsAt: null, maxUses: null, perCustomer: 1, active: true, public: true, uses: 0, createdAt: new Date(), updatedAt: new Date() } },
    { upsert: true },
  );
});

/** Swipes across the card `rows` times with the mouse; returns how much of the gold is gone. */
async function swipe(page: Page, rows: number[]) {
  const box = (await page.locator('canvas[role="img"]').boundingBox())!;
  for (const r of rows) {
    await page.mouse.move(box.x + 12, box.y + box.height * r);
    await page.mouse.down();
    for (let x = 12; x < box.width - 12; x += 10) await page.mouse.move(box.x + x, box.y + box.height * r);
    await page.mouse.up();
  }
}
const scratched = async (page: Page) => Number((await page.getByText(/% Scratched|Revealed/).first().innerText()).match(/\d+/)?.[0] ?? 100);
const gold = (page: Page) =>
  page.locator('canvas[role="img"]').evaluate((c: HTMLCanvasElement) => {
    // Average gold left along the first stroke's line (0–255).
    const ctx = c.getContext("2d")!;
    const y = Math.round(c.height * 0.5);
    const row = ctx.getImageData(0, y, c.width, 1).data;
    let sum = 0;
    for (let i = 3; i < row.length; i += 4) sum += row[i];
    return Math.round(sum / (row.length / 4));
  });

test("scratching is rough: one swipe leaves a gold film, a few rubs reveal the code", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1500 }); // the whole card on screen
  await logInAs(page, await createUser({ name: "Mehwish", email: "mehwish.scratch@example.com" }), "customer");
  await page.goto("/offers/SCRATCH20");
  await expect(page.locator('canvas[role="img"]')).toBeVisible();
  await page.waitForTimeout(800); // foil drawn

  // One pass along the middle: some gold left on that line (a film), and no reveal yet.
  await swipe(page, [0.5]);
  const afterOne = await gold(page);
  expect(afterOne).toBeGreaterThan(30); // not wiped clean in one swipe
  expect(await page.getByText("Revealed").count()).toBe(0);

  // Rubbing the same line again takes more gold off.
  await swipe(page, [0.5]);
  expect(await gold(page)).toBeLessThan(afterOne);

  // Gold crumbs appear while scratching.
  await page.mouse.move(100, 100);
  const flakes = await page.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>('canvas[aria-hidden="true"].pointer-events-none');
    return c ? c.width > 0 : false;
  });
  expect(flakes).toBe(true);

  // Enough rubbing reveals the card.
  let rounds = 0;
  for (; rounds < 6 && (await page.getByText("Revealed").count()) === 0; rounds++) {
    await swipe(page, [0.15, 0.3, 0.45, 0.6, 0.75, 0.9]);
  }
  await expect(page.getByText("Revealed")).toBeVisible();
  console.log(`revealed after the first two swipes plus ${rounds} rounds of 6`);
  await expect(page.getByText("SCRATCH20").first()).toBeVisible();
  expect(await scratched(page)).toBe(100);
});

test("the reveal happens once, even when the finger stays down and keeps scratching", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1500 });
  await logInAs(page, await createUser({ name: "Iqra", email: "iqra.scratch@example.com" }), "customer");
  // Each reveal tells the server (a server action POST); count them.
  let reveals = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.headers()["next-action"] && r.url().includes("/offers/")) reveals++;
  });
  await page.goto("/offers/SCRATCH20");
  await expect(page.locator('canvas[role="img"]')).toBeVisible();
  await page.waitForTimeout(800);

  // One long stroke without lifting the mouse: back and forth across the card,
  // well past the reveal point.
  const box = (await page.locator('canvas[role="img"]').boundingBox())!;
  await page.mouse.move(box.x + 12, box.y + 12);
  await page.mouse.down();
  for (let pass = 0; pass < 8 && (await page.getByText("Revealed").count()) === 0; pass++) {
    for (let r = 0.08; r < 0.95; r += 0.06) {
      for (let x = 12; x < box.width - 12; x += 24) await page.mouse.move(box.x + x, box.y + box.height * r, { steps: 2 });
    }
  }
  await expect(page.getByText("Revealed")).toBeVisible();
  // Keep scratching after the reveal, still without lifting.
  for (let x = 12; x < box.width - 12; x += 8) await page.mouse.move(box.x + x, box.y + box.height * 0.5);
  await page.mouse.up();
  await page.waitForTimeout(800);
  expect(reveals).toBe(1);
});
