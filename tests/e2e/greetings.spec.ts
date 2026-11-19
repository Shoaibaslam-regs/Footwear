import { expect, test } from "@playwright/test";
import { ObjectId } from "mongodb";
import { logInAs, setupStore } from "./helpers";

let adminId: ObjectId;
test.beforeAll(async () => {
  adminId = await setupStore();
});

const pkt = (ms: number) => new Date(Date.now() + ms + 5 * 3_600_000).toISOString().slice(0, 16);

test("a greeting fills the plaque on its own, and rides on a scroll above a sale", async ({ browser }, info) => {
  test.skip(info.project.name !== "desktop");
  const admin = await browser.newPage();
  await logInAs(admin, adminId, "admin");

  // 1. Create a greeting, live now.
  await admin.goto("/admin/greetings/new");
  await admin.getByLabel("Greeting", { exact: true }).fill("Eid Mubarak");
  await admin.getByLabel(/Short line under it/).fill("Wishing you and your family joy and peace.");
  await admin.getByLabel("Occasion").selectOption("eid");
  await admin.getByLabel("Starts (Pakistan time)").fill(pkt(-3_600_000));
  await admin.getByLabel("Ends (Pakistan time)").fill(pkt(3 * 86_400_000));
  await admin.getByRole("button", { name: "Create greeting" }).click();
  await expect(admin.getByText("Saved Eid Mubarak.")).toBeVisible();
  await expect(admin.locator("tbody tr", { hasText: "Eid Mubarak" }).getByText("Showing")).toBeVisible();

  // 2. With no sale, the plaque carries the greeting.
  const page = await browser.newPage();
  await page.goto("/");
  const plaque = page.getByRole("region", { name: "Eid Mubarak" });
  await expect(plaque).toBeVisible();
  await expect(plaque.getByText("Wishing you and your family joy and peace.")).toBeVisible();
  await expect(page.locator(".pf-scroll")).toHaveCount(0);

  // 3. Add a sale: the sale takes the plaque, the greeting moves to the gold scroll.
  await admin.goto("/admin/sales/new");
  await admin.getByLabel("Name", { exact: true }).fill("Eid Sale");
  await admin.getByLabel("Tag on cards").fill("EID");
  await admin.getByLabel("Starts (Pakistan time)").fill(pkt(-3_600_000));
  await admin.getByLabel("Ends (Pakistan time)").fill(pkt(86_400_000));
  await admin.getByLabel("Whole store").check();
  await admin.locator('input[name="percent"]').fill("20");
  await admin.getByRole("button", { name: "Create sale" }).click();
  await expect(admin.getByText("Saved Eid Sale.")).toBeVisible();
  await page.goto("/");
  const both = page.getByRole("region", { name: /Eid Mubarak\. Eid Sale, up to 20% off/ });
  await expect(both).toBeVisible();
  await expect(page.locator(".pf-scroll")).toHaveText("Eid Mubarak");
  await expect(page.locator('.sale-petals [data-motif="eid"]').first()).toBeAttached(); // the greeting's motif wins

  // Greeting set to None: the sale's motif (winter) falls instead.
  await admin.goto("/admin/sales");
  await admin.locator("tbody tr", { hasText: "Eid Sale" }).getByRole("link", { name: "Edit" }).click();
  await admin.getByLabel("Falling motif").selectOption("winter");
  await admin.getByRole("button", { name: "Save changes" }).click();
  await expect(admin.getByText("Saved Eid Sale.")).toBeVisible();
  await admin.goto("/admin/greetings");
  await admin.locator("tbody tr", { hasText: "Eid Mubarak" }).getByRole("link", { name: "Edit" }).click();
  await admin.getByLabel("Occasion").selectOption("none");
  await admin.getByRole("button", { name: "Save changes" }).click();
  await expect(admin.getByText("Saved Eid Mubarak.")).toBeVisible();
  await page.goto("/");
  await expect(page.locator('.sale-petals [data-motif="winter"]').first()).toBeAttached();
  await expect(page.locator('.sale-petals [data-motif="eid"]')).toHaveCount(0);

  // 4. Clean up for the other tests: stop the sale, take the greeting down.
  await admin.goto("/admin/sales");
  await admin.locator("tbody tr", { hasText: "Eid Sale" }).getByRole("button", { name: "Stop" }).click();
  await admin.getByRole("button", { name: "Stop sale" }).click();
  await admin.goto("/admin/greetings");
  await admin.locator("tbody tr", { hasText: "Eid Mubarak" }).getByRole("button", { name: "Take down" }).click();
  await admin.getByRole("button", { name: "Take down" }).last().click();
  await expect(admin.getByText("Greeting taken down.")).toBeVisible();
  await page.goto("/");
  await page.waitForTimeout(800);
  await expect(page.getByRole("region", { name: /Eid Mubarak/ })).toHaveCount(0);
});
