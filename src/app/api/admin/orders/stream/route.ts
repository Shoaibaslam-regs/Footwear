import { getCurrentUser } from "@/lib/auth/dal";
import { getDb } from "@/lib/server/db";
import { subscribeOrders, type OrderEvent } from "@/lib/server/order-events";

/**
 * Vercel (and other serverless hosts) stop a function after `maxDuration`.
 * The stream closes itself a little earlier, the browser's EventSource
 * reconnects after `retry`, and the catch-up below sends any order placed in
 * between, so none is missed.
 */
export const maxDuration = 300;
const CLOSE_AFTER_MS = 270_000;
const PING_MS = 25_000;
/** Catch-up looks back a little further than the last mark, for clock drift between servers. */
const CATCH_UP_SLACK_MS = 5_000;

/**
 * GET → a Server-Sent Events stream of order activity for the admin panel:
 * `new` when a customer places an order, `change` when one is updated or deleted.
 *
 * Every ping carries `id: <time>`, so the browser always remembers when it last
 * heard from the server and sends it back as `Last-Event-ID` when it reconnects.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please log in.", { status: 401 });
  if (user.role !== "admin") return new Response("Admins only.", { status: 403 });

  // Orders placed while this browser was reconnecting.
  const lastSeen = Number(request.headers.get("last-event-id"));
  const missed: OrderEvent[] = [];
  if (Number.isFinite(lastSeen) && lastSeen > 0) {
    const since = new Date(lastSeen - CATCH_UP_SLACK_MS);
    const docs = await (await getDb())
      .collection("orders")
      .find({ createdAt: { $gt: since } }, { projection: { number: 1, customer: 1, total: 1 } })
      .sort({ createdAt: 1 })
      .limit(20)
      .toArray();
    for (const d of docs) {
      missed.push({ type: "new", id: String(d._id), number: String(d.number ?? ""), name: String(d.customer?.name ?? ""), total: Number(d.total ?? 0) });
    }
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      // An `id:` line with no data moves the browser's Last-Event-ID without firing an event.
      const mark = () => send(`id: ${Date.now()}\n\n`);
      const event = (e: OrderEvent) => send(`id: ${Date.now()}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);

      send("retry: 3000\n: connected\n\n");
      mark();
      missed.forEach(event);
      const unsubscribe = subscribeOrders(event);
      const ping = setInterval(mark, PING_MS);
      // End cleanly before the host's time limit; the browser reconnects and catches up.
      const stop = setTimeout(() => cleanup(), CLOSE_AFTER_MS);
      cleanup = () => {
        clearInterval(ping);
        clearTimeout(stop);
        unsubscribe();
        cleanup = () => {};
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener("abort", () => cleanup(), { once: true });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // nginx: don't buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
