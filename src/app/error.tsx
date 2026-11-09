"use client"; // Error boundaries must be Client Components

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error
      ? String((error as Error & { digest?: string }).digest ?? "")
      : "";

  return (
    <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col items-center text-center gap-space-md">
      <span className="material-symbols-outlined text-secondary text-[40px]">
        error
      </span>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight">
        A Stitch Came Loose
      </h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant font-light max-w-xl">
        Something went wrong while preparing this page. Please try again, or
        return to the collection.
      </p>
      {digest && (
        <p className="font-label-sm text-label-sm text-outline">Reference: {digest}</p>
      )}
      <div className="flex flex-col sm:flex-row gap-space-md pt-space-sm">
        <button
          className="h-[52px] px-8 rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-md"
          onClick={() => retry()}
          type="button"
        >
          Try Again
        </button>
        <Link
          className="h-[52px] px-8 rounded-full bg-surface-container hover:bg-surface-container-high text-primary transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center justify-center"
          href="/collections"
        >
          Explore Collection
        </Link>
      </div>
    </section>
  );
}
