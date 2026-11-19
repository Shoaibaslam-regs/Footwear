import "server-only";
import { ObjectId } from "mongodb";
import { cacheLife, cacheTag, io } from "next/cache";
import type { Greeting, GreetingStyle } from "../greetings";
import { getDb } from "./db";

/** Cache tag for greetings: every admin change calls updateTag(GREETINGS_TAG). */
export const GREETINGS_TAG = "greetings";

export type GreetingDoc = {
  _id: ObjectId;
  message: string;
  line: string;
  style: GreetingStyle;
  linkLabel: string;
  linkHref: string;
  startsAt: Date;
  endsAt: Date;
  stoppedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const greetings = async () => (await getDb()).collection<GreetingDoc>("greetings");

export const toGreeting = (d: GreetingDoc): Greeting => ({
  id: d._id.toHexString(),
  message: d.message,
  line: d.line ?? "",
  style: d.style,
  linkLabel: d.linkLabel ?? "",
  linkHref: d.linkHref ?? "",
  startsAt: d.startsAt.toISOString(),
  endsAt: d.endsAt.toISOString(),
  stoppedAt: d.stoppedAt ? d.stoppedAt.toISOString() : null,
  createdAt: d.createdAt.toISOString(),
});

/** Greetings the storefront needs: not stopped, newest first (cached, no clock). */
export async function getGreetings(): Promise<Greeting[]> {
  "use cache";
  cacheTag(GREETINGS_TAG);
  cacheLife("days");
  const docs = await (await greetings()).find({ stoppedAt: null }).sort({ createdAt: -1 }).limit(20).toArray();
  return docs.map(toGreeting);
}

/** Every greeting for the admin list, newest first, with the time statuses are worked out at. */
export async function listGreetingsNow(): Promise<{ rows: Greeting[]; now: number }> {
  await io(); // statuses depend on the time
  const docs = await (await greetings()).find({}).sort({ startsAt: -1 }).toArray();
  return { rows: docs.map(toGreeting), now: Date.now() };
}

export async function getGreeting(id: string): Promise<Greeting | null> {
  if (!ObjectId.isValid(id)) return null;
  const d = await (await greetings()).findOne({ _id: new ObjectId(id) });
  return d ? toGreeting(d) : null;
}
