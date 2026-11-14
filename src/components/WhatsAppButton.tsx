"use client";

import { usePathname } from "next/navigation";
import { whatsappUrl } from "@/lib/data";

/** Floating "chat with us" button; on product pages it mentions the product. */
export default function WhatsAppButton() {
  const pathname = usePathname();
  if (pathname.startsWith("/checkout")) return null; // checkout has its own help card
  const product = pathname.match(/^\/products\/([a-z0-9-]+)/)?.[1];
  const text = product ? "Hello Ŕose Atelier, I'm interested in this pair." : "Hello Ŕose Atelier, I have a question.";
  return (
    <a
      aria-label="Chat with us on WhatsApp"
      // A small espresso circle with a gold icon, in the site's colours; on hover it opens to "Chat".
      className="group fixed z-40 right-4 bottom-[calc(1rem+var(--bottom-bar,0px))] sm:right-6 sm:bottom-[calc(1.5rem+var(--bottom-bar,0px))] h-12 sm:h-[52px] min-w-12 sm:min-w-[52px] px-3 sm:px-[14px] rounded-[999px] bg-primary text-secondary-fixed ring-1 ring-secondary-fixed/30 shadow-[0_10px_30px_rgba(33,27,25,0.28)] flex items-center justify-center transition-[bottom,box-shadow] duration-300 hover:shadow-[0_14px_36px_rgba(33,27,25,0.36)]"
      href={`${whatsappUrl}?text=${encodeURIComponent(text)}`}
      // Add the full product link at click time (same markup on server and client).
      onClick={(e) => {
        if (product) e.currentTarget.href = `${whatsappUrl}?text=${encodeURIComponent(`${text} ${window.location.href}`)}`;
      }}
      rel="noopener noreferrer"
      target="_blank"
    >
      <svg aria-hidden="true" className="w-[22px] h-[22px] shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 5.83 2.42 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
      </svg>
      {/* Mouse devices: the label slides out on hover. */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap font-label-uppercase text-[10px] uppercase tracking-[0.24em] text-surface-container-lowest transition-[max-width,margin] duration-500 ease-[var(--ease-lux)] group-hover:max-w-16 group-hover:ml-2 motion-reduce:transition-none">
        Chat
      </span>
    </a>
  );
}
