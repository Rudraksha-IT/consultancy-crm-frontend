"use client";

import { useEffect, useRef, useState } from "react";

import { COMMUNICATION_TEXT as TEXT, type ReadyMadeKind } from "@/constants/communication";
import {
  fetchReadyMade,
  fetchReadyMadeDraft,
  type NewEmail,
  type ReadyMadeEntry,
  type ReadyMadeTarget,
} from "@/lib/api";

import type { Pane } from "./ComposerParts";

/** The ready-made email to open on, e.g. Payment received from a receipt. */
/**
 * The ready-made email to open on, the record it is about, and words to start from instead of
 * its own: a subject line, and a line added under the greeting (a Course's brochures, ticket 10).
 */
export type StartWith = {
  kind: ReadyMadeKind;
  record?: number;
  text?: { subject: string; line: string };
};

/** The ready-made emails offered, while they load, or that they couldn't load. */
export type ReadyMadeMenu =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; entries: readonly ReadyMadeEntry[] };

/** The ready-made email chosen, and the record it is about (null when it needs none). */
export type ReadyMadeChoice = { kind: ReadyMadeKind; record: number | null };

/** One ask for a draft; `turn` makes asking again for the same email a new ask. */
type DraftRequest = ReadyMadeChoice & { turn: number };

export type ComposerText = {
  pane: Pane;
  setPane: (pane: Pane) => void;
  subject: string;
  setSubject: (subject: string) => void;
  subjectError: string | null;
  body: string;
  setBody: (body: string) => void;
  menu: ReadyMadeMenu;
  choice: ReadyMadeChoice;
  /** Choose another ready-made email: its text replaces the subject line and message. */
  choose: (kind: ReadyMadeKind) => void;
  /** Pick the record the email is about. */
  pick: (record: number) => void;
  /** Changed since the ready-made text was put in, so it can be started again. */
  isEdited: boolean;
  startAgain: () => void;
  /** The chosen email couldn't be filled in (the text stays as it was). */
  hasDraftFailed: boolean;
  /** The email to send, trimmed; or null, with the subject line marked and focused, if it is empty. */
  checked: (form: HTMLFormElement) => NewEmail | null;
};

type ComposerTextOptions = {
  target: ReadyMadeTarget;
  startWith: StartWith | undefined;
  /** The Plain email's greeting and sign-off, shown until the ready-made emails arrive. */
  firstBody: string;
};

/**
 * What is being written (ticket 09): it opens on the Plain email's greeting and sign-off, then on
 * the first ready-made email that can be used (or `startWith`), filled in by the backend. Choosing
 * another email or record replaces the subject line and message; anything typed before the
 * ready-made emails arrive is kept.
 */
export function useComposerText({
  target,
  startWith,
  firstBody,
}: ComposerTextOptions): ComposerText {
  const [pane, setPane] = useState<Pane>("write");
  const [subject, setSubjectText] = useState("");
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [body, setBodyText] = useState(firstBody);
  const [isEdited, setEdited] = useState(false);
  const touched = useRef(false);
  const [choice, setChoice] = useState<ReadyMadeChoice>({ kind: "plain", record: null });
  const [request, setRequest] = useState<DraftRequest | null>(null);
  const menu = useMenu(target, startWith, touched, (first) => {
    setChoice(first);
    setRequest({ ...first, turn: 0 });
  });
  const startText = useRef(startWith?.text);
  const hasDraftFailed = useDraft(target, request, (draft) => {
    const text = startText.current;
    startText.current = undefined;
    setSubjectText(text?.subject ?? draft.subject);
    setBodyText(text === undefined ? draft.body : withLine(draft.body, text.line));
    setSubjectError(null);
    setEdited(false);
  });

  function ask(next: ReadyMadeChoice): void {
    setChoice(next);
    setRequest((last) => ({ ...next, turn: (last?.turn ?? 0) + 1 }));
  }

  function edited(): void {
    touched.current = true;
    setEdited(true);
  }

  function checked(form: HTMLFormElement): NewEmail | null {
    const trimmed = subject.trim();
    if (trimmed !== "") {
      setSubjectError(null);
      return { subject: trimmed, body: body.trim() };
    }
    setSubjectError(TEXT.writeSubject);
    setPane("write");
    focusField(form, "subject");
    return null;
  }

  return {
    pane,
    setPane,
    subject,
    setSubject: (value) => {
      setSubjectText(value);
      edited();
    },
    subjectError,
    body,
    setBody: (value) => {
      setBodyText(value);
      edited();
    },
    menu,
    choice,
    choose: (kind) => {
      ask({ kind, record: firstRecordOf(menu, kind) });
    },
    pick: (record) => {
      ask({ kind: choice.kind, record });
    },
    isEdited: isEdited && menu.status === "ready",
    startAgain: () => {
      ask(choice);
    },
    hasDraftFailed: hasDraftFailed === request,
    checked,
  };
}

/** Load the ready-made emails once; then open on the first choice unless something was typed. */
function useMenu(
  target: ReadyMadeTarget,
  startWith: StartWith | undefined,
  touched: { readonly current: boolean },
  onFirst: (choice: ReadyMadeChoice) => void,
): ReadyMadeMenu {
  const [menu, setMenu] = useState<ReadyMadeMenu>({ status: "loading" });
  // All fixed while the composer is open.
  const [fixed] = useState(() => ({ target, startWith, touched, onFirst }));
  useEffect(() => {
    let isCancelled = false;
    fetchReadyMade(fixed.target).then(
      (entries) => {
        if (isCancelled) return;
        setMenu({ status: "ready", entries });
        if (!fixed.touched.current) fixed.onFirst(firstChoice(entries, fixed.startWith));
      },
      () => {
        if (!isCancelled) setMenu({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [fixed]);
  return menu;
}

/**
 * Fetch the draft for each request and hand it over; a newer request wins. Returns the request
 * that failed last, if any.
 */
function useDraft(
  target: ReadyMadeTarget,
  request: DraftRequest | null,
  onDraft: (draft: { subject: string; body: string }) => void,
): DraftRequest | null {
  const [failed, setFailed] = useState<DraftRequest | null>(null);
  const [fixed] = useState(() => ({ target, onDraft }));
  useEffect(() => {
    if (request === null) return undefined;
    let isCancelled = false;
    fetchReadyMadeDraft(fixed.target, request.kind, request.record).then(
      (draft) => {
        if (!isCancelled) fixed.onDraft(draft);
      },
      () => {
        if (!isCancelled) setFailed(request);
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [fixed, request]);
  return failed;
}

/** The email asked for if it can be used, else the first that can (Plain email last of all). */
function firstChoice(
  entries: readonly ReadyMadeEntry[],
  startWith: StartWith | undefined,
): ReadyMadeChoice {
  const entry = firstUsable(entries, startWith?.kind);
  if (entry === undefined) return { kind: "plain", record: null };
  return { kind: entry.kind, record: recordOf(entry, startWith?.record) };
}

/** The record asked for if it is one to pick, else the first (newest); null when there is none. */
function recordOf(entry: ReadyMadeEntry, wanted: number | undefined): number | null {
  const found = entry.records.find((record) => record.id === wanted) ?? entry.records[0];
  return found?.id ?? null;
}

function firstUsable(
  entries: readonly ReadyMadeEntry[],
  wanted: ReadyMadeKind | undefined,
): ReadyMadeEntry | undefined {
  const usable = entries.filter((entry) => entry.unavailable === null);
  return (
    usable.find((entry) => entry.kind === wanted) ??
    usable.find((entry) => entry.kind !== "plain") ??
    usable.find((entry) => entry.kind === "plain")
  );
}

function firstRecordOf(menu: ReadyMadeMenu, kind: ReadyMadeKind): number | null {
  if (menu.status !== "ready") return null;
  return menu.entries.find((entry) => entry.kind === kind)?.records[0]?.id ?? null;
}

/** The message with `line` as its first paragraph after the greeting. */
function withLine(body: string, line: string): string {
  const greetingEnd = body.indexOf("\n\n");
  if (greetingEnd === -1) return `${line}\n\n${body}`;
  const rest = body.slice(greetingEnd + 2).replace(/^\n+/, "");
  return `${body.slice(0, greetingEnd)}\n\n${line}\n\n${rest}`;
}

function focusField(form: HTMLFormElement, name: string): void {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLElement) field.focus();
}
