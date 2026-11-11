import { getCurrentUser } from "@/lib/auth/dal";
import { subscribeOrders, type OrderEvent } from "@/lib/server/order-events";

/**
 * GET → a Server-Sent Events stream of order activity for the admin panel:
 * `new` when a customer places an order, `change` when one is updated or deleted.
 * The browser's EventSource reconnects by itself (and re-checks the login).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Please log in.", { status: 401 });
  if (user.role !== "admin") return new Response("Admins only.", { status: 403 });

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
      send("retry: 3000\n: connected\n\n");
      const unsubscribe = subscribeOrders((e: OrderEvent) => send(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
      // Keeps proxies from closing an idle connection.
      const ping = setInterval(() => send(": ping\n\n"), 25_000);
      cleanup = () => {
        clearInterval(ping);
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
