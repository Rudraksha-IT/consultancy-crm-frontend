"use client";

import { useEffect, useState } from "react";

import { fetchProductDomain } from "@/lib/api";

/**
 * The product domain every office's address ends in, from the backend's PRODUCT_DOMAIN
 * (issue 64); null while loading or if it can't be loaded (the page still works without it).
 */
export function useProductDomain(): string | null {
  const [domain, setDomain] = useState<string | null>(null);
  useEffect(() => {
    let isCurrent = true;
    fetchProductDomain().then(
      (found) => {
        if (isCurrent) setDomain(found);
      },
      () => {
        // Only the shown address needs it; creating still works and the backend adds the domain.
      },
    );
    return () => {
      isCurrent = false;
    };
  }, []);
  return domain;
}
