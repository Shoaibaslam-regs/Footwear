import "server-only";
import type { ChangeStream, Collection, Document } from "mongodb";
import { getDb } from "./db";

/** What admin tabs are told about. Never includes more than the popup needs. */
export type OrderEvent =
  | { type: "new"; id: string; number: string; name: string; total: number }
  | { type: "change"; id: string };

type Listener = (e: OrderEvent) => void;

type Hub = {
  listeners: Set<Listener>;
  stream: ChangeStream | null;
  poll: ReturnType<typeof setInterval> | null;
  retry: ReturnType<typeof setTimeout> | null;
};

declare global {
  var __eloraOrderHub: Hub | undefined;
}

/** One watcher per server process, shared by every open admin tab. */
const hub: Hub = (globalThis.__eloraOrderHub ??= { listeners: new Set(), stream: null, poll: null, retry: null });

const POLL_MS = 5000;

function emit(e: OrderEvent) {
  for (const l of hub.listeners) {
    try {
      l(e);
    } catch {
      // A closed tab: its own cleanup removes it.
    }
  }
}

const toNew = (d: Document): OrderEvent => ({
  type: "new",
  id: String(d._id),
  number: String(d.number ?? ""),
  name: String(d.customer?.name ?? ""),
  total: Number(d.total ?? 0),
});

function stop() {
  hub.stream?.close().catch(() => {});
  hub.stream = null;
  if (hub.poll) clearInterval(hub.poll);
  hub.poll = null;
  if (hub.retry) clearTimeout(hub.retry);
  hub.retry = null;
}

/**
 * Polling fallback for databases without change streams (a standalone mongod).
 * Atlas and any replica set use the change stream instead.
 */
function startPolling(orders: Collection) {
  let since = new Date();
  hub.poll = setInterval(async () => {
    try {
      const changed = await orders
        .find({ updatedAt: { $gt: since } }, { projection: { number: 1, customer: 1, total: 1, createdAt: 1, updatedAt: 1 } })
        .sort({ updatedAt: 1 })
        .limit(50)
        .toArray();
      for (const d of changed) {
        if (d.updatedAt > since) since = d.updatedAt;
        // insertOrder writes createdAt === updatedAt; any later edit moves updatedAt on.
        emit(+d.createdAt === +d.updatedAt ? toNew(d) : { type: "change", id: String(d._id) });
      }
    } catch {
      // Try again next tick.
    }
  }, POLL_MS);
}

async function start() {
  if (hub.stream || hub.poll || hub.listeners.size === 0) return;
  const orders = (await getDb()).collection("orders");
  try {
    const stream = orders.watch(
      [{ $match: { operationType: { $in: ["insert", "update", "replace", "delete"] } } }],
      { fullDocument: "default" },
    );
    hub.stream = stream;
    stream.on("change", (c) => {
      if (c.operationType === "insert") emit(toNew(c.fullDocument));
      else if ("documentKey" in c) emit({ type: "change", id: String(c.documentKey._id) });
    });
    stream.on("error", (err: { code?: number; codeName?: string }) => {
      stop();
      // 40573 / 40324: change streams need a replica set. Fall back to polling.
      if (err?.code === 40573 || err?.code === 40324 || err?.codeName === "Location40573") {
        if (hub.listeners.size) startPolling(orders);
        return;
      }
      // Dropped connection: reconnect shortly if anyone is still listening.
      hub.retry = setTimeout(() => {
        hub.retry = null;
        start().catch(() => {});
      }, 3000);
    });
  } catch {
    startPolling(orders);
  }
}

/** Starts watching on the first listener and stops after the last one leaves. */
export function subscribeOrders(listener: Listener): () => void {
  hub.listeners.add(listener);
  start().catch(() => {});
  return () => {
    hub.listeners.delete(listener);
    if (hub.listeners.size === 0) stop();
  };
}
