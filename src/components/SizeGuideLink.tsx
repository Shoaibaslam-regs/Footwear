"use client";

import { useCallback, useState } from "react";
import SizeGuideModal from "./product/SizeGuideModal";

/** Text button that opens the International Size & Fit Guide modal. */
export default function SizeGuideLink({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button
        aria-haspopup="dialog"
        className={className}
        onClick={() => setOpen(true)}
        type="button"
      >
        {children}
      </button>
      <SizeGuideModal open={open} onClose={close} />
    </>
  );
}
