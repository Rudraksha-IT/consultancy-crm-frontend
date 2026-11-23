"use client";

import { createContext, use, useState, type ReactNode } from "react";

import { LABELS } from "@/constants/messages";

type ProductNameValue = { name: string; setName: (name: string) => void };

const ProductNameContext = createContext<ProductNameValue>({
  name: LABELS.productName,
  setName: () => undefined,
});

/**
 * The product's name (first live fixes, ticket 15) for every screen below: given by the server
 * for each page, and changed at once on this page when a Platform Admin saves a new one.
 */
export function ProductNameProvider({ name, children }: { name: string; children: ReactNode }) {
  const [current, setCurrent] = useState(name);
  return (
    <ProductNameContext value={{ name: current, setName: setCurrent }}>
      {children}
    </ProductNameContext>
  );
}

/** The product's name, e.g. "Rudraksha CRM". */
export function useProductName(): string {
  return use(ProductNameContext).name;
}

/** Show a newly saved name on this page now. */
export function useSetProductName(): (name: string) => void {
  return use(ProductNameContext).setName;
}
