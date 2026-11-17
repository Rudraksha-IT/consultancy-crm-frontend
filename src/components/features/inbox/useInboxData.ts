"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { HTTP_STATUS } from "@/constants/api";
import {
  ApiRequestError,
  fetchConversation,
  fetchConversations,
  type InboxConversation,
  type InboxThread,
} from "@/lib/api";

export type ConversationsState =
  | { status: "loading" }
  | { status: "loaded"; conversations: InboxConversation[] }
  | { status: "failed" };

export type ThreadState =
  | { status: "loading" }
  | { status: "loaded"; thread: InboxThread }
  | { status: "notFound" }
  | { status: "failed" };

/**
 * My conversations, loaded again whenever `version` changes (a new message was found, or I
 * read or sent one). A failed reload keeps the list already shown.
 */
export function useConversations(version: string): ConversationsState {
  const [state, setState] = useState<ConversationsState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    fetchConversations().then(
      (conversations) => {
        if (!isCancelled) setState({ status: "loaded", conversations });
      },
      () => {
        if (isCancelled) return;
        setState((current) => (current.status === "loaded" ? current : { status: "failed" }));
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [version]);

  return state;
}

type Loaded = { personId: number; value: ThreadState };

/**
 * The open conversation, loaded when it opens and again whenever `version` changes. Opening it
 * marks the other person's messages read, so `onLoaded` lets the menu count catch up. A failed
 * reload keeps the conversation already shown. The second value replaces it, e.g. after sending.
 */
export function useThread(
  personId: number,
  version: string,
  onLoaded: () => void,
): [ThreadState, (thread: InboxThread) => void] {
  const [state, setState] = useState<Loaded>({ personId, value: { status: "loading" } });
  const loaded = useEffectEvent(onLoaded);

  useEffect(() => {
    let isCancelled = false;
    fetchConversation(personId).then(
      (thread) => {
        if (isCancelled) return;
        setState({ personId, value: { status: "loaded", thread } });
        loaded();
      },
      (error: unknown) => {
        if (isCancelled) return;
        setState((current) => afterFailure(current, personId, error));
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [personId, version]);

  const shown: ThreadState = state.personId === personId ? state.value : { status: "loading" };
  const replace = (thread: InboxThread): void => {
    setState({ personId, value: { status: "loaded", thread } });
  };
  return [shown, replace];
}

function afterFailure(current: Loaded, personId: number, error: unknown): Loaded {
  if (error instanceof ApiRequestError && error.status === HTTP_STATUS.notFound) {
    return { personId, value: { status: "notFound" } };
  }
  const isShowing = current.personId === personId && current.value.status === "loaded";
  return isShowing ? current : { personId, value: { status: "failed" } };
}
