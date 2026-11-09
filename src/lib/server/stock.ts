import "server-only";
import { getDb } from "./db";
import type { ProductDoc } from "./products";

type Line = { slug: string; size: number; quantity: number };

const products = async () => (await getDb()).collection<ProductDoc>("products");

/**
 * Takes stock for every tracked size, atomically per line (two clients can't
 * both get the last pair). If any line can't be filled, everything taken so
 * far is put back. Untracked sizes (no `stock.<size>`) are always fine.
 */
export async function reserveStock(lines: Line[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const col = await products();
  const taken: Line[] = [];
  for (const l of lines) {
    const field = `stock.${l.size}`;
    const res = await col.updateOne(
      { slug: l.slug, [field]: { $gte: l.quantity } },
      { $inc: { [field]: -l.quantity } },
    );
    if (res.modifiedCount === 1) {
      taken.push(l);
      // Hit zero: mark the size sold out for cards, filters and the product page.
      await col.updateOne({ slug: l.slug, [field]: 0 }, { $addToSet: { soldOutSizes: l.size } });
      continue;
    }
    const p = await col.findOne({ slug: l.slug }, { projection: { name: 1, stock: 1 } });
    const left = p?.stock?.[String(l.size)];
    if (typeof left !== "number") continue; // not tracked
    await releaseStock(taken);
    return {
      ok: false,
      error:
        left === 0
          ? `${p!.name} in EU ${l.size} has just sold out. Please remove it from your bag.`
          : `Only ${left} ${left === 1 ? "pair" : "pairs"} of ${p!.name} in EU ${l.size} left. Please lower the quantity.`,
    };
  }
  return { ok: true };
}

/** Puts stock back (cancelled order or failed checkout). Untracked sizes are skipped. */
export async function releaseStock(lines: Line[]) {
  const col = await products();
  for (const l of lines) {
    const field = `stock.${l.size}`;
    const res = await col.updateOne({ slug: l.slug, [field]: { $exists: true } }, { $inc: { [field]: l.quantity } });
    if (res.modifiedCount === 1) {
      await col.updateOne({ slug: l.slug, [field]: { $gt: 0 } }, { $pull: { soldOutSizes: l.size } });
    }
  }
}
