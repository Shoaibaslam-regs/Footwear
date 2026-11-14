"use client";

import { createPortal } from "react-dom";
import { useDialog } from "@/components/header/useDialog";
import { whatsappUrl } from "@/lib/data";
import { sizeChart } from "@/lib/product-data";

/**
 * Rendered into <body> so no sticky/transformed ancestor (the product page's
 * sticky purchase panel, the quick-view card) can trap it under other content.
 */
export default function SizeGuideModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return createPortal(<SizeGuidePanel onClose={onClose} />, document.body);
}

function SizeGuidePanel({ onClose }: { onClose: () => void }) {
  // Scroll lock, Escape, focus trap and focus restore.
  const panelRef = useDialog<HTMLDivElement>(true, onClose);

  return (
    <div className="sheet-fade fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-primary/60 backdrop-blur-sm">
      <div
        className="min-h-full flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          ref={panelRef}
          aria-labelledby="size-guide-title"
          aria-modal="true"
          role="dialog"
          className="sheet-up bg-surface max-w-2xl w-full p-space-lg pt-space-md sm:pt-space-lg shadow-xl relative rounded-t-2xl sm:rounded-none"
        >
          {/* Phones: the sheet's grab handle */}
          <div aria-hidden="true" className="sm:hidden mx-auto mb-space-sm h-1.5 w-12 rounded-full bg-outline-variant" />
          <div className="flex items-center justify-between pb-space-md border-b border-outline-variant/30">
            <div>
              <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
                Ŕose Atelier Size Help
              </span>
              <h3
                id="size-guide-title"
                className="font-headline-md text-headline-md text-primary font-normal"
              >
                Pakistani Size &amp; Fit Guide
              </h3>
            </div>
            <button
              aria-label="Close modal"
              className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              onClick={onClose}
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">
                close
              </span>
            </button>
          </div>
          <div className="py-space-md space-y-space-md font-body-sm text-body-sm text-on-surface">
            <p className="text-on-surface-variant">
              Shopping by your usual Pakistani size? Find it in the{" "}
              <strong className="text-primary">Pakistan</strong> column. Most
              local brands (Stylo, Metro, Borjan, Bata) use these numbers. On
              our product pages, sizes are shown in EU.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm">
                <caption className="sr-only">
                  Women&apos;s shoe sizes: Pakistan, EU, UK, US and foot length
                </caption>
                <thead className="bg-surface-container-low font-label-uppercase text-label-uppercase text-[10px] uppercase text-primary">
                  <tr>
                    <th
                      className="py-2.5 px-3 bg-secondary-fixed/40"
                      scope="col"
                    >
                      Pakistan
                    </th>
                    <th className="py-2.5 px-3" scope="col">
                      EU
                    </th>
                    <th className="py-2.5 px-3" scope="col">
                      UK
                    </th>
                    <th className="py-2.5 px-3" scope="col">
                      US
                    </th>
                    <th className="py-2.5 px-3" scope="col">
                      Foot (cm)
                    </th>
                    <th className="py-2.5 px-3" scope="col">
                      Foot (in)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-sm">
                  {sizeChart.map((r) => (
                    <tr key={r.eu}>
                      <th
                        className="py-2 px-3 font-semibold text-primary bg-secondary-fixed/20"
                        scope="row"
                      >
                        {r.pk}
                      </th>
                      <td className="py-2 px-3 font-medium">{r.eu}</td>
                      <td className="py-2 px-3">{r.uk}</td>
                      <td className="py-2 px-3">{r.us}</td>
                      <td className="py-2 px-3">{r.cm}</td>
                      <td className="py-2 px-3 text-on-surface-variant">
                        {r.inch}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-space-sm sm:gap-space-md">
              <div className="p-space-sm bg-surface-container-low">
                <p className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-primary font-semibold mb-1">
                  How to measure
                </p>
                <ol className="list-decimal pl-4 space-y-0.5 text-on-surface-variant">
                  <li>Stand on paper with your heel against a wall.</li>
                  <li>Mark the tip of your longest toe.</li>
                  <li>
                    Measure wall to mark in cm, and match the Foot column.
                  </li>
                </ol>
              </div>
              <div className="p-space-sm bg-surface-container-low">
                <p className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-primary font-semibold mb-1">
                  Fit advice
                </p>
                <ul className="list-disc pl-4 space-y-0.5 text-on-surface-variant">
                  <li>Between sizes, or wide feet? Take the next size up.</li>
                  <li>
                    Pointed heels run slim. Sandals and mules are true to size.
                  </li>
                  <li>Measure in the evening, when feet are largest.</li>
                </ul>
              </div>
            </div>

            <div className="p-space-sm bg-surface-container flex items-center justify-between gap-space-sm">
              <span className="font-body-sm text-body-sm text-on-surface">
                Still not sure? Our team will help you choose your size.
              </span>
              <a
                className="font-label-uppercase text-label-uppercase uppercase text-primary underline underline-offset-4 hover:text-secondary whitespace-nowrap"
                href={`${whatsappUrl}?text=${encodeURIComponent("Hello Ŕose Atelier, I need help choosing my shoe size.")}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Ask on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
