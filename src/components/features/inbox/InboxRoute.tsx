"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { ROUTES } from "@/constants/routes";

import { InboxPage } from "./InboxPage";

/** The address's `with=` names the open conversation; anything not a plain positive id is none. */
export function openIdFrom(value: string | null): number | null {
  if (value === null || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

/** The Inbox, with the open conversation kept in the address (`/inbox?with=<id>`). */
export function InboxRoute() {
  const router = useRouter();
  const openId = openIdFrom(useSearchParams().get("with"));
  const open = useCallback(
    (id: number | null) => {
      router.push(id === null ? ROUTES.inbox : ROUTES.inboxWith(id));
    },
    [router],
  );
  return <InboxPage openId={openId} onOpen={open} />;
}
