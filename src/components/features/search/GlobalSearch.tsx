"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
  type SubmitEvent,
} from "react";

import clsx from "clsx";

import { Icon } from "@/components/ui/Icon";
import { IconButton } from "@/components/ui/IconButton";
import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { SEARCH_TEXT } from "@/constants/search";
import { SEARCH_MAX_LENGTH } from "@/lib/api";
import { nextResultIndex, studentListHref } from "@/lib/search";

import { RESULT_ATTRIBUTE, SearchResultsPanel } from "./SearchResultsPanel";
import { useGlobalSearch } from "./useGlobalSearch";
import { useSearchShortcut, useShortcutHint } from "./useSearchShortcut";

type GlobalSearchProps = {
  role: Role;
  modules: readonly Module[];
  /**
   * At 1024px and below the box is hidden until the top bar's search icon opens it full width
   * (issue 88); it then has an × to close it.
   */
  isExpanded: boolean;
  /** Close the full-width search: the ×, Escape on an empty box, or a result opening. */
  onCollapse: () => void;
};

/**
 * The top bar's search (spec 29a): Students by name, phone or email and classes by name, from
 * any screen. Ctrl K (⌘ K on a Mac) or "/" opens it; arrow keys move through the results; Escape
 * clears the box, and on an empty box closes the full-width search. Each Role only finds what it
 * may see (the API decides).
 */
export function GlobalSearch({ role, modules, isExpanded, onCollapse }: GlobalSearchProps) {
  const router = useRouter();
  const resultsId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const state = useGlobalSearch(text);
  const isTeacher = role === Role.Teacher;

  function close(): void {
    setText("");
    setIsOpen(false);
  }

  function collapse(): void {
    close();
    onCollapse();
  }

  useSearchShortcut(inputRef);
  useFocusWhenExpanded(inputRef, isExpanded);
  useCloseOnNavigation(close);
  useCloseOnOutsideClick(rootRef, isOpen, () => {
    setIsOpen(false);
  });

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>): void {
    if (event.key === "Escape") closeAndReturn(event);
    else if (isArrowKey(event.key)) moveThroughResults(event, event.key);
  }

  function closeAndReturn(event: KeyboardEvent): void {
    const action = escapeAction(text, isOpen, isExpanded);
    if (action === null) return;
    event.preventDefault();
    if (action === "collapse") {
      collapse();
      return;
    }
    close();
    inputRef.current?.focus();
  }

  function moveThroughResults(event: KeyboardEvent, key: "ArrowDown" | "ArrowUp"): void {
    const links = resultLinks(rootRef);
    if (links.length === 0) return;
    event.preventDefault();
    const at = links.findIndex((link) => link === document.activeElement);
    const next = nextResultIndex(links.length, at, key);
    (links[next] ?? inputRef.current)?.focus();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const wanted = text.trim();
    if (wanted === "") return;
    if (isTeacher) {
      resultLinks(rootRef)[0]?.focus();
      return;
    }
    collapse();
    router.push(studentListHref(wanted));
  }

  const isShown = isOpen && state.status !== "idle";
  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      className={clsx(
        "wide:flex wide:w-full wide:col-start-2 relative min-w-0 flex-1 items-center gap-2",
        isExpanded ? "flex" : "hidden",
      )}
    >
      <SearchField
        inputRef={inputRef}
        text={text}
        placeholder={placeholderFor(role, modules)}
        resultsId={isShown ? resultsId : undefined}
        isExpanded={isExpanded}
        onOpen={() => {
          setIsOpen(true);
        }}
        onType={(value) => {
          setText(value);
          setIsOpen(true);
        }}
        onCollapse={collapse}
      />
      {isShown && (
        <SearchResultsPanel
          id={resultsId}
          state={state}
          isTeacher={isTeacher}
          onChosen={collapse}
        />
      )}
    </form>
  );
}

type SearchFieldProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  text: string;
  placeholder: string;
  /** The results' id while they are shown. */
  resultsId: string | undefined;
  isExpanded: boolean;
  onOpen: () => void;
  onType: (value: string) => void;
  onCollapse: () => void;
};

/** The box with its icon and shortcut hint; opened full width, it also has the × (issue 88). */
function SearchField({
  inputRef,
  text,
  placeholder,
  resultsId,
  isExpanded,
  onOpen,
  onType,
  onCollapse,
}: SearchFieldProps) {
  const shortcut = useShortcutHint();
  return (
    <>
      <div className="relative min-w-0 flex-1">
        <Icon
          name="search"
          className="text-ink-3 pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={text}
          maxLength={SEARCH_MAX_LENGTH}
          autoComplete="off"
          aria-label={SEARCH_TEXT.label}
          aria-controls={resultsId}
          aria-keyshortcuts={shortcut.keys}
          placeholder={placeholder}
          onFocus={onOpen}
          onClick={onOpen}
          onChange={(event) => {
            onType(event.target.value);
          }}
          className="h-side-item rounded-control bg-fill text-input text-ink focus:border-accent focus:bg-paper w-full border border-transparent pr-16 pl-11.5 [&::-webkit-search-cancel-button]:appearance-none"
        />
        <kbd
          aria-hidden="true"
          hidden={text !== "" || isExpanded}
          className="rounded-chip border-rule-2 bg-paper text-small text-ink-3 pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 border px-1.5 font-semibold"
        >
          {shortcut.hint}
        </kbd>
      </div>
      {isExpanded && (
        <span className="wide:hidden contents">
          <IconButton icon="x" label={SEARCH_TEXT.close} onClick={onCollapse} />
        </span>
      )}
    </>
  );
}

/**
 * What Escape does: clear the text (and close the results), or with nothing left to clear close
 * the full-width search; null when there is nothing to do.
 */
function escapeAction(
  text: string,
  isOpen: boolean,
  isExpanded: boolean,
): "clear" | "collapse" | null {
  if (text !== "") return "clear";
  if (isExpanded) return "collapse";
  return isOpen ? "clear" : null;
}

/** Opening the full-width search puts the cursor in its box. */
function useFocusWhenExpanded(
  inputRef: RefObject<HTMLInputElement | null>,
  isExpanded: boolean,
): void {
  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [inputRef, isExpanded]);
}

function isArrowKey(key: string): key is "ArrowDown" | "ArrowUp" {
  return key === "ArrowDown" || key === "ArrowUp";
}

function resultLinks(rootRef: RefObject<HTMLElement | null>): HTMLElement[] {
  return Array.from(rootRef.current?.querySelectorAll<HTMLElement>(`[${RESULT_ATTRIBUTE}]`) ?? []);
}

function placeholderFor(role: Role, modules: readonly Module[]): string {
  if (role === Role.Teacher) return SEARCH_TEXT.teacherPlaceholder;
  const findsClasses = role !== Role.FrontDesk && modules.includes(Module.Batches);
  return findsClasses ? SEARCH_TEXT.placeholder : SEARCH_TEXT.studentsOnlyPlaceholder;
}

/** Opening a result, or any other page, closes the search, as the prototype does. */
function useCloseOnNavigation(close: () => void): void {
  const pathname = usePathname();
  const [shownOn, setShownOn] = useState(pathname);
  if (shownOn !== pathname) {
    setShownOn(pathname);
    close();
  }
}

function useCloseOnOutsideClick(
  rootRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  close: () => void,
): void {
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        closeRef.current();
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, rootRef]);
}
