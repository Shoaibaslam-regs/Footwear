"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NewOrder = { id: string; number: string; name: string; total: number };
type Change = { id: string };

const pkr = (n: number) => `PKR ${n.toLocaleString("en-US")}`;

/** Pages that show order data and should update by themselves. */
function watches(pathname: string, changedId?: string) {
  if (pathname === "/admin" || pathname === "/admin/orders" || pathname.startsWith("/admin/users")) return true;
  // An order's own page (and its slip) only when that order changed.
  const m = pathname.match(/^\/admin\/orders\/([^/]+)/);
  return !!m && (changedId === undefined || m[1] === changedId);
}

/** Short two-note chime. Browsers allow it once the admin has clicked on the page. */
function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {}
}

/**
 * Live order updates for the admin panel over Server-Sent Events
 * (/api/admin/orders/stream). A new order pops up a card, plays a chime and
 * counts in the tab title; pages that list orders refresh themselves.
 */
export default function LiveOrders() {
  const router = useRouter();
  const pathname = usePathname();
  const [live, setLive] = useState(false);
  const [popups, setPopups] = useState<NewOrder[]>([]);
  const unseen = useRef(0);
  /** Orders already announced: a reconnect's catch-up may send one again. */
  const announced = useRef(new Set<string>());
  const baseTitle = useRef<string | null>(null);
  const path = useRef(pathname);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    path.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // Several events in a burst (a status change writes twice) → one refresh.
    const refreshSoon = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 400);
    };
    const setTitle = () => {
      baseTitle.current ??= document.title.replace(/^\(\d+\)\s*/, "");
      document.title = unseen.current ? `(${unseen.current}) ${baseTitle.current}` : baseTitle.current;
    };
    const onFocus = () => {
      unseen.current = 0;
      if (baseTitle.current) document.title = baseTitle.current;
      baseTitle.current = null;
    };

    const es = new EventSource("/api/admin/orders/stream");
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false); // EventSource retries by itself.
    es.addEventListener("new", (e) => {
      const o = JSON.parse((e as MessageEvent).data) as NewOrder;
      if (announced.current.has(o.id)) return;
      announced.current.add(o.id);
      setPopups((p) => [o, ...p.filter((x) => x.id !== o.id)].slice(0, 3));
      chime();
      if (!document.hasFocus()) {
        unseen.current += 1;
        setTitle();
      }
      if (watches(path.current)) refreshSoon();
    });
    es.addEventListener("change", (e) => {
      const { id } = JSON.parse((e as MessageEvent).data) as Change;
      if (watches(path.current, id)) refreshSoon();
    });
    window.addEventListener("focus", onFocus);
    return () => {
      es.close();
      window.removeEventListener("focus", onFocus);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [router]);

  // Each card closes itself after a while; hovering doesn't matter, the order stays in the list.
  useEffect(() => {
    if (popups.length === 0) return;
    const id = setTimeout(() => setPopups((p) => p.slice(0, -1)), 20_000);
    return () => clearTimeout(id);
  }, [popups]);

  const dismiss = (id: string) => setPopups((p) => p.filter((x) => x.id !== id));

  return (
    <>
      <span
        className="hidden sm:inline-flex items-center gap-1.5 text-xs muted"
        title={live ? "New orders appear here without refreshing." : "Reconnecting to live updates…"}
      >
        <span
          aria-hidden="true"
          className={`w-2 h-2 rounded-full ${live ? "bg-[#6ccb5f] ring-2 ring-white/30 motion-safe:animate-pulse" : "bg-white/40"}`}
        />
        {live ? "Live" : "Offline"}
      </span>

      <div aria-live="polite" className="fixed z-[70] top-[76px] right-4 left-4 sm:left-auto sm:w-[340px] flex flex-col gap-2 pointer-events-none">
        {popups.map((o) => (
          <div key={o.id} className="panel pointer-events-auto p-3 shadow-lg flex items-start gap-3 a-pop" role="status">
            <span aria-hidden="true" className="mt-0.5 w-8 h-8 shrink-0 rounded-full bg-[var(--a-accent-soft)] flex items-center justify-center font-bold">
              ✓
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">New order {o.number}</p>
              <p className="muted text-[13px] truncate">
                {o.name} · {pkr(o.total)}
              </p>
              <div className="mt-2 flex gap-2">
                <Link className="btn btn-primary btn-sm" href={`/admin/orders/${o.id}`} onClick={() => dismiss(o.id)}>
                  Open order
                </Link>
                <Link className="btn btn-sm" href={`/admin/orders/${o.id}/slip?print=1`} onClick={() => dismiss(o.id)} target="_blank">
                  Print slip
                </Link>
              </div>
            </div>
            <button aria-label="Dismiss" className="muted hover:text-[var(--a-text)] text-lg leading-none px-1" onClick={() => dismiss(o.id)} type="button">
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
