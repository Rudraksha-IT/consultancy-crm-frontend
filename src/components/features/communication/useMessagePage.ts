"use client";

import { useEffect, useState } from "react";

import type { MessagePage } from "@/lib/api";

export type MessagePageState =
  { status: "loading" } | { status: "loaded"; page: MessagePage } | { status: "failed" };

/** One page of messages from `load`, loaded again whenever `page` or `load` changes. */
export function useMessagePage(
  load: (page: number) => Promise<MessagePage>,
  page: number,
): MessagePageState {
  const [state, setState] = useState<MessagePageState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    load(page).then(
      (loaded) => {
        if (!isCancelled) setState({ status: "loaded", page: loaded });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [load, page]);

  return state;
}
