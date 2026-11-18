"use client";

import { useEffect } from "react";
import { markOrderViewedAction } from "@/app/admin/actions";

/**
 * Marks the order viewed once its page is really open in the browser (not when
 * a link prefetches it), so it stops being highlighted in the orders list.
 */
export default function MarkViewed({ id, viewed }: { id: string; viewed: boolean }) {
  useEffect(() => {
    if (!viewed) void markOrderViewedAction(id);
  }, [id, viewed]);
  return null;
}
