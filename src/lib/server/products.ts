import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ObjectId, type Db } from "mongodb";
import { bestSellers, newArrivals } from "../data";
import { catalogProducts } from "../collection-data";
import { productId } from "../product-id";
import { MAX_GALLERY, type Listing, type ProductCategory, type ProductStatus } from "../products";
import { products as richDetails } from "../product-data";
import { getDb } from "./db";

export const PRODUCTS_TAG = "products";

export type ProductDoc = Omit<Listing, "id" | "createdAt" | "updatedAt"> & {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

function toListing(d: ProductDoc): Listing {
  const { _id, createdAt, updatedAt, ...rest } = d;
  return {
    ...rest,
    discountPercent: rest.discountPercent ?? 0,
    imageKey: rest.imageKey ?? "",
    otherSales: rest.otherSales ?? 0,
    stock: rest.stock ?? {},
    gallery: rest.gallery?.length
      ? rest.gallery
      : [{ url: rest.image, key: rest.imageKey ?? "", alt: rest.alt, caption: "" }],
    id: _id.toHexString(),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

async function products(): Promise<Db> {
  const db = await getDb();
  await ensureSeeded(db);
  await ensureGalleries(db);
  return db;
}

/* ---------- One-time migration: single image → gallery ---------- */

let migrating: Promise<void> | undefined;

function ensureGalleries(db: Db) {
  migrating ??= (async () => {
    const meta = db.collection<{ _id: string; at: Date }>("meta");
    if (await meta.findOne({ _id: "gallery-v1" })) return;
    const col = db.collection<ProductDoc>("products");
    const legacy = await col.find({ gallery: { $exists: false } }).toArray();
    for (const d of legacy) {
      const gallery = [{ url: d.image, key: d.imageKey ?? "", alt: d.alt, caption: "" }];
      // Editorial pages written in code bring their extra views into the listing.
      for (const v of richDetails[d.slug]?.gallery ?? []) {
        if (gallery.length >= MAX_GALLERY || gallery.some((g) => g.url === v.image)) continue;
        gallery.push({ url: v.image, key: "", alt: v.alt, caption: v.label.replace(/^\d+\s*/, "") });
      }
      await col.updateOne({ _id: d._id }, { $set: { gallery } });
    }
    await meta.updateOne({ _id: "gallery-v1" }, { $setOnInsert: { at: new Date() } }, { upsert: true });
  })().catch((e) => {
    migrating = undefined;
    throw e;
  });
  return migrating;
}

/* ---------- Storefront reads (cached, refreshed by updateTag) ---------- */

export async function getPublishedProducts(): Promise<Listing[]> {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  const db = await products();
  const docs = await db
    .collection<ProductDoc>("products")
    .find({ status: "published" })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(toListing);
}

export async function getPublishedProduct(slug: string): Promise<Listing | null> {
  "use cache";
  cacheTag(PRODUCTS_TAG);
  cacheLife("hours");
  const db = await products();
  const doc = await db
    .collection<ProductDoc>("products")
    .findOne({ slug, status: "published" });
  return doc ? toListing(doc) : null;
}

/* ---------- Admin reads (uncached; callers must requireAdmin first) ---------- */

export async function listAllProducts(opts: {
  q?: string;
  status?: ProductStatus;
  category?: ProductCategory;
} = {}): Promise<Listing[]> {
  const db = await products();
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.category) filter.category = opts.category;
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { slug: rx }, { material: rx }];
  }
  const docs = await db
    .collection<ProductDoc>("products")
    .find(filter)
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map(toListing);
}

export async function getProductById(id: string): Promise<Listing | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await products();
  const doc = await db
    .collection<ProductDoc>("products")
    .findOne({ _id: new ObjectId(id) });
  return doc ? toListing(doc) : null;
}

/* ---------- One-time seed from the original static catalogue ---------- */

let seeding: Promise<void> | undefined;

function ensureSeeded(db: Db) {
  seeding ??= (async () => {
    const meta = db.collection<{ _id: string; at: Date }>("meta");
    if (await meta.findOne({ _id: "products-seed" })) return;
    const col = db.collection<ProductDoc>("products");
    if ((await col.countDocuments()) === 0) {
      await col.insertMany(seedProducts());
    }
    await meta.updateOne(
      { _id: "products-seed" },
      { $setOnInsert: { at: new Date() } },
      { upsert: true },
    );
  })().catch((e) => {
    seeding = undefined;
    throw e;
  });
  return seeding;
}

function guessCategory(text: string): ProductCategory {
  const t = text.toLowerCase();
  if (/bridal|pearl|ivory|evening/.test(t)) return "bridal";
  if (/sandal|slide/.test(t)) return "sandals";
  if (/flat|loafer|ballet|sneaker/.test(t)) return "flats";
  return "heels";
}

function seedProducts(): ProductDoc[] {
  const now = Date.now();
  const bySlug = new Map<string, ProductDoc>();
  const add = (p: Omit<ProductDoc, "_id" | "createdAt" | "updatedAt" | "gallery">) => {
    const existing = bySlug.get(p.slug);
    if (existing) {
      existing.newArrival ||= p.newArrival;
      existing.bestSeller ||= p.bestSeller;
      return;
    }
    const at = new Date(now - bySlug.size * 60_000);
    const gallery = [{ url: p.image, key: "", alt: p.alt, caption: "" }];
    for (const v of richDetails[p.slug]?.gallery ?? []) {
      if (gallery.length < MAX_GALLERY && !gallery.some((g) => g.url === v.image)) {
        gallery.push({ url: v.image, key: "", alt: v.alt, caption: v.label.replace(/^\d+\s*/, "") });
      }
    }
    bySlug.set(p.slug, { ...p, gallery, _id: new ObjectId(), createdAt: at, updatedAt: at });
  };

  for (const p of newArrivals) {
    add({
      slug: productId(p.name, p.href),
      name: p.name,
      category: guessCategory(`${p.name} ${p.spec}`),
      spec: p.spec,
      material: p.material,
      description: "",
      price: p.price,
      image: p.image,
      alt: p.alt,
      badge: p.badge,
      sizes: [35, 36, 37, 38, 39, 40, 41],
      soldOutSizes: [],
      discountPercent: 0,
      imageKey: "",
      otherSales: 0,
      stock: {},
      newArrival: true,
      bestSeller: false,
      status: "published",
    });
  }
  for (const p of bestSellers) {
    add({
      slug: productId(p.name),
      name: p.name,
      category: guessCategory(`${p.name} ${p.detail}`),
      spec: p.detail.split("•")[1]?.trim() ?? "",
      material: p.detail.split("•")[0]?.trim() ?? p.detail,
      description: "",
      price: p.price,
      image: p.image,
      alt: p.alt,
      badge: p.badge,
      sizes: [35, 36, 37, 38, 39, 40, 41],
      soldOutSizes: p.soldOut,
      discountPercent: 0,
      imageKey: "",
      otherSales: 0,
      stock: {},
      newArrival: false,
      bestSeller: true,
      status: "published",
    });
  }
  for (const p of catalogProducts) {
    add({
      slug: productId(p.name, p.href),
      name: p.name,
      category: guessCategory(`${p.name} ${p.spec} ${p.tag}`),
      spec: p.spec,
      material: p.material,
      description: "",
      price: p.price,
      image: p.image,
      alt: p.alt,
      badge: p.badge ?? "",
      sizes: [35, 36, 37, 38, 39, 40, 41],
      soldOutSizes: [],
      discountPercent: 0,
      imageKey: "",
      otherSales: 0,
      stock: {},
      newArrival: false,
      bestSeller: false,
      status: "published",
    });
  }
  return [...bySlug.values()];
}
