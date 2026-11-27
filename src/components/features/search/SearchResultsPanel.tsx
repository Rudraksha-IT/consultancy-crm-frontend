"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";

import { ROUTES } from "@/constants/routes";
import { SEARCH_TEXT } from "@/constants/search";
import type { FoundBatch, FoundClassStudent, FoundStudent, SearchResults } from "@/lib/api";
import { studentListHref } from "@/lib/search";

import type { GlobalSearchState } from "./useGlobalSearch";

/** Marks each result link, so the arrow keys can move through them in order. */
export const RESULT_ATTRIBUTE = "data-search-result";

const RESULT_LINK =
  "flex min-h-side-item min-w-0 items-center justify-between gap-3 px-5 py-2.5 hover:bg-fill focus-visible:bg-fill focus-visible:-outline-offset-3";

type Shown = Exclude<GlobalSearchState, { status: "idle" }>;

const WAITING_TEXT: Record<Exclude<Shown["status"], "loaded">, string> = {
  loading: SEARCH_TEXT.searching,
  "too-many": SEARCH_TEXT.tooMany,
  failed: SEARCH_TEXT.failed,
};

type SearchResultsPanelProps = {
  id: string;
  state: Shown;
  isTeacher: boolean;
  /** Called when a result is opened, so the search closes. */
  onChosen: () => void;
};

/** The results under the search box: Students, then classes, at most 5 of each. */
export function SearchResultsPanel({ id, state, isTeacher, onChosen }: SearchResultsPanelProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={SEARCH_TEXT.results}
      aria-live="polite"
      className="rounded-panel border-rule bg-paper shadow-lift absolute inset-x-0 top-full z-20 mt-2 overflow-hidden border"
    >
      {state.status === "loaded" ? (
        <Found
          text={state.text}
          results={state.results}
          isTeacher={isTeacher}
          onChosen={onChosen}
        />
      ) : (
        <Message>{WAITING_TEXT[state.status]}</Message>
      )}
    </div>
  );
}

type FoundProps = {
  text: string;
  results: SearchResults;
  isTeacher: boolean;
  onChosen: () => void;
};

function Found({ text, results, isTeacher, onChosen }: FoundProps) {
  if (results.students.length === 0 && results.batches.length === 0) {
    return (
      <Message>
        {SEARCH_TEXT.nothing(text)}
        {isTeacher && SEARCH_TEXT.teacherNothing}
      </Message>
    );
  }
  return (
    <>
      <Group title={SEARCH_TEXT.students} isShown={results.students.length > 0}>
        {results.students.map((found) => (
          <li key={found.id}>
            {found.kind === "student" ? (
              <StudentLink found={found} onChosen={onChosen} />
            ) : (
              <ClassStudentLink found={found} onChosen={onChosen} />
            )}
          </li>
        ))}
      </Group>
      <Group title={SEARCH_TEXT.classes} isShown={results.batches.length > 0}>
        {results.batches.map((batch) => (
          <li key={batch.id}>
            <BatchLink batch={batch} onChosen={onChosen} />
          </li>
        ))}
      </Group>
      {!isTeacher && <SeeAllLink text={text} results={results} onChosen={onChosen} />}
    </>
  );
}

/** One group of results, named for screen readers by its heading. */
function Group({
  title,
  isShown,
  children,
}: {
  title: string;
  isShown: boolean;
  children: ReactNode;
}) {
  const headingId = useId();
  if (!isShown) return null;
  return (
    <div role="group" aria-labelledby={headingId}>
      <h3 id={headingId} className="text-small text-ink-3 px-5 pt-3.5 pb-1.5 font-semibold">
        {title}
      </h3>
      <ul>{children}</ul>
    </div>
  );
}

function ResultLink({
  href,
  onChosen,
  className = "text-ink",
  children,
}: {
  href: string;
  onChosen: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      {...{ [RESULT_ATTRIBUTE]: "" }}
      onClick={onChosen}
      className={`${RESULT_LINK} ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * What is on a result's right. It takes half the row at most and is cut with "…" (whole on
 * hover), so a long Stage and counsellor never squeeze the name (ticket 25).
 */
function Detail({ children }: { children: string }) {
  return (
    <small
      title={children}
      className="text-small text-ink-2 max-w-1/2 shrink-0 truncate text-right"
    >
      {children}
    </small>
  );
}

function StudentLink({ found, onChosen }: { found: FoundStudent; onChosen: () => void }) {
  return (
    <ResultLink href={ROUTES.student(found.id)} onChosen={onChosen}>
      <span className="min-w-0 truncate">
        <b>{found.name}</b>{" "}
        <small className="text-small text-ink-2 tabular-nums">{found.phone}</small>
      </span>
      <Detail>
        {SEARCH_TEXT.studentDetail(found.stage, found.assignedCounsellor?.name ?? null)}
      </Detail>
    </ResultLink>
  );
}

function ClassStudentLink({ found, onChosen }: { found: FoundClassStudent; onChosen: () => void }) {
  return (
    <ResultLink href={ROUTES.batch(found.batch.id)} onChosen={onChosen}>
      <b className="min-w-0 truncate">{found.name}</b>
      <Detail>{SEARCH_TEXT.inYourClass}</Detail>
    </ResultLink>
  );
}

function BatchLink({ batch, onChosen }: { batch: FoundBatch; onChosen: () => void }) {
  return (
    <ResultLink href={ROUTES.batch(batch.id)} onChosen={onChosen}>
      <b className="min-w-0 truncate">{batch.name}</b>
      <Detail>{batch.timeSlot}</Detail>
    </ResultLink>
  );
}

function SeeAllLink({ text, results, onChosen }: Omit<FoundProps, "isTeacher">) {
  if (results.studentCount === 0) return null;
  const hasMore = results.studentCount > results.students.length;
  return (
    <ResultLink
      href={studentListHref(text)}
      onChosen={onChosen}
      className="border-rule text-accent border-t font-semibold"
    >
      {hasMore ? SEARCH_TEXT.seeAll(results.studentCount, text) : SEARCH_TEXT.openList}
    </ResultLink>
  );
}

function Message({ children }: { children: ReactNode }) {
  return <p className="text-ink-2 px-5 py-4">{children}</p>;
}
