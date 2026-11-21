"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { ROUTES } from "@/constants/routes";
import { parseRecordId, type RecordId } from "@/lib/recordId";

import { InboxPage } from "./InboxPage";

/** The address's `with=` names the open conversation; anything not a record id is none. */
export function openIdFrom(value: string | null): RecordId | null {
  return value === null ? null : parseRecordId(value);
}

/** The Inbox, with the open conversation kept in the address (`/inbox?with=<id>`). */
export function InboxRoute() {
  const router = useRouter();
  const openId = openIdFrom(useSearchParams().get("with"));
  const open = useCallback(
    (id: RecordId | null) => {
      router.push(id === null ? ROUTES.inbox : ROUTES.inboxWith(id));
    },
    [router],
  );
  return <InboxPage openId={openId} onOpen={open} />;
}
