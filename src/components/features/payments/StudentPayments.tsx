"use client";

import { useState, type ReactNode } from "react";

import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { MESSAGES } from "@/constants/messages";
import { PAYMENT_TEXT } from "@/constants/payments";
import type { PaymentPage } from "@/lib/api";

import { PaymentTable } from "./PaymentTable";
import { usePaymentPage } from "./usePaymentPage";

type StudentPaymentsProps = {
  studentId: number;
  /** A Payment was changed or deleted: History has a new entry, and this list remounts. */
  onChanged: () => void;
  /** Shown beside the title, e.g. "Take a payment". */
  aside?: ReactNode;
};

/** The Payments one Student has made, on their Fees tab (Admins only; spec 74-75). */
export function StudentPayments({ studentId, onChanged, aside }: StudentPaymentsProps) {
  const [page, setPage] = useState(1);
  const state = usePaymentPage({ from: "", to: "", search: "", purpose: "", studentId }, page, 0);

  return (
    <Section title={PAYMENT_TEXT.paymentsReceived} aside={aside}>
      <Panel>
        {state.status === "loading" && <p className="text-ink-2 px-6 py-5">{MESSAGES.loading}</p>}
        {state.status === "loaded" ? (
          <Loaded page={state.page} onPage={setPage} onChanged={onChanged} />
        ) : (
          state.status !== "loading" && (
            <div className="px-6 py-5">
              <Banner tone="problem">{PAYMENT_TEXT.listFailed}</Banner>
            </div>
          )
        )}
      </Panel>
    </Section>
  );
}

type LoadedProps = {
  page: PaymentPage;
  onPage: (page: number) => void;
  onChanged: () => void;
};

function Loaded({ page, onPage, onChanged }: LoadedProps) {
  return (
    <>
      {page.rows.length === 0 ? (
        <EmptyState>{PAYMENT_TEXT.noPaymentsYet}</EmptyState>
      ) : (
        <PaymentTable payments={page.rows} showsStudent={false} onChanged={onChanged} />
      )}
      <Pager
        summary={PAYMENT_TEXT.paymentsCount(page.count)}
        count={page.count}
        page={page.page}
        pageSize={page.pageSize}
        onPage={onPage}
      />
    </>
  );
}
