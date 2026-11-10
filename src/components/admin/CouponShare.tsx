"use client";

import { useState } from "react";
import { alertDialog } from "@/components/Dialogs";

/** Copy the offer link, or open WhatsApp with a ready-to-send message. */
export default function CouponShare({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        className="btn btn-sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            await alertDialog({ title: "Copy this link", message: url, variant: "admin" });
          }
        }}
        type="button"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
      <a className="btn btn-sm" href={`https://wa.me/?text=${encodeURIComponent(message)}`} rel="noopener noreferrer" target="_blank">
        WhatsApp
      </a>
    </div>
  );
}
