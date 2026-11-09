import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { deleteImages } from "./images";

export const DAILY_REVIEW_UPLOADS = 12;

type UploadDoc = { _id: string; userId: ObjectId; createdAt: Date };

async function uploads() {
  const col = (await getDb()).collection<UploadDoc>("review_uploads");
  await col.createIndex({ userId: 1, createdAt: -1 });
  return col;
}

export async function uploadsToday(userId: string) {
  return (await uploads()).countDocuments({ userId: new ObjectId(userId), createdAt: { $gt: new Date(Date.now() - 86_400_000) } });
}

export async function recordUpload(userId: string, key: string) {
  await (await uploads()).insertOne({ _id: key, userId: new ObjectId(userId), createdAt: new Date() });
}

/** Keys from `keys` that this user actually uploaded. */
export async function ownedKeys(userId: string, keys: string[]) {
  const docs = await (await uploads()).find({ _id: { $in: keys }, userId: new ObjectId(userId) }).toArray();
  return new Set(docs.map((d) => d._id));
}

/** Deletes review photos from storage and their upload records. */
export async function deleteReviewPhotos(keys: string[]) {
  const list = keys.filter(Boolean);
  if (list.length === 0) return;
  await deleteImages(list);
  await (await uploads()).deleteMany({ _id: { $in: list } });
}
