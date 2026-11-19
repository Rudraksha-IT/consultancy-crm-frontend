"use client";

import { useEffect, useState } from "react";

import {
  fetchPayments,
  InvalidFieldsError,
  type PaymentFilters,
  type PaymentPage,
} from "@/lib/api";

export type PaymentPageState =
  | { status: "loading" }
  | { status: "loaded"; page: PaymentPage }
  | { status: "refused"; fieldErrors: Partial<Record<string, string[]>> }
  | { status: "failed" };

/**
 * Load one page of Payments, again when the filters, the page or `version` change. An answer
 * that arrives after a newer request is dropped.
 */
export function usePaymentPage(
  filters: PaymentFilters,
  page: number,
  version: number,
): PaymentPageState {
  const [state, setState] = useState<PaymentPageState>({ status: "loading" });
  const { from, to, search, feeTypeId, studentId } = filters;

  useEffect(() => {
    let isCancelled = false;
    async function load(): Promise<void> {
      try {
        const found = await fetchPayments({ from, to, search, feeTypeId, studentId }, page);
        if (!isCancelled) setState({ status: "loaded", page: found });
      } catch (error) {
        if (isCancelled) return;
        if (error instanceof InvalidFieldsError) {
          setState({ status: "refused", fieldErrors: error.fieldErrors });
        } else {
          setState({ status: "failed" });
        }
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [from, to, search, feeTypeId, studentId, page, version]);

  return state;
}
