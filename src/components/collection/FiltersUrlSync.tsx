"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { syncFiltersFromUrl } from "@/lib/catalog-filters";

/** Keeps the filter store in step with client-side navigations to /collections?… */
export default function FiltersUrlSync() {
  const params = useSearchParams();
  useEffect(() => {
    syncFiltersFromUrl();
  }, [params]);
  return null;
}
