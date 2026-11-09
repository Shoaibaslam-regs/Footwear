import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "./db";

export const SALES_TAG = "sales";

/** Pairs sold online per product slug (every order except cancelled ones). */
export async function getOnlineSales(): Promise<Record<string, number>> {
  "use cache";
  cacheTag(SALES_TAG);
  cacheLife("hours");
  const rows = await (await getDb())
    .collection("orders")
    .aggregate<{ _id: string; units: number }>([
      { $match: { status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.slug", units: { $sum: "$items.quantity" } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.units]));
}
