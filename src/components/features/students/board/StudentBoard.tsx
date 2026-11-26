"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { LABELS } from "@/constants/messages";
import { Priority } from "@/constants/priority";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { JOURNEY_STAGES, STAGE_LABELS, Stage } from "@/constants/stages";
import { BOARD_TEXT, COUNTRY_LABELS } from "@/constants/students";
import type { BoardStudent, StaffContext } from "@/lib/api";

import { BEAD_CLASSES } from "./beads";
import { MoveDialog } from "./MoveDialog";
import { useBoardMove } from "./useBoardMove";
import { useCardGlide } from "./useCardGlide";
import type { BoardColumn, StudentBoard as Board } from "./useStudentBoard";

type Viewer = StaffContext["staff"];

type StudentBoardProps = {
  board: Board;
  /** Who is looking: an Admin moves anyone, a counsellor only their own Students. */
  viewer: Viewer;
};

/** Only the Assigned Counsellor or an Admin may change a Student's Stage (GLOSSARY). */
function canMove(viewer: Viewer, student: BoardStudent): boolean {
  return viewer.role === Role.Admin || student.assignedCounsellor?.id === viewer.id;
}

/**
 * Students as a board: a column for each Stage of the journey (or only the one the Stage filter
 * names), a card for each Student. A card opens the Student; dragging it to another column or its
 * Move button changes their Stage, through the one move flow. Lost Students are not on the board.
 */
export function StudentBoard({ board, viewer }: StudentBoardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const focusAfterMove = useRef<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [moving, setMoving] = useState<BoardStudent | null>(null);
  const [dragged, setDragged] = useState<BoardStudent | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const move = useBoardMove(async (student) => {
    await board.refresh();
    focusAfterMove.current = student.id;
    setMoves((count) => count + 1);
  });

  // Once a moved card is drawn in its new column, the cursor goes back to its Move button; if the
  // card left the board (marked Lost), to the board itself.
  useEffect(() => {
    const id = focusAfterMove.current;
    const root = rootRef.current;
    if (id === null || root === null) return;
    focusAfterMove.current = null;
    const buttons = [...root.querySelectorAll<HTMLElement>("[data-move-for]")];
    (buttons.find((button) => button.dataset.moveFor === id) ?? root).focus();
  }, [moves]);

  useCardGlide(rootRef, board.columns);

  function endDrag(): void {
    setDragged(null);
    setOver(null);
  }

  return (
    <>
      {move.failure !== null && (
        <div className="px-gutter pb-3">
          <Banner tone="problem">{move.failure}</Banner>
        </div>
      )}
      <div
        ref={rootRef}
        tabIndex={-1}
        role="group"
        aria-label={BOARD_TEXT.boardLabel}
        data-wide-page=""
        className="px-gutter pb-gutter overflow-x-auto outline-none"
      >
        <div data-board="" data-cols={board.columns.length}>
          {board.columns.map((column) => (
            <Column
              key={column.stage}
              column={column}
              isOver={over === column.stage}
              onOver={
                dragged === null
                  ? undefined
                  : () => {
                      setOver(column.stage);
                    }
              }
              onDrop={() => {
                const student = dragged;
                endDrag();
                if (student !== null) void move.moveTo(student, column.stage);
              }}
              onShowMore={() => {
                board.showMore(column.stage);
              }}
            >
              {column.status === "loaded" &&
                column.students.map((student) => (
                  <Card
                    key={student.id}
                    student={student}
                    canMove={canMove(viewer, student)}
                    isDragged={dragged?.id === student.id}
                    onDragStart={() => {
                      setDragged(student);
                    }}
                    onDragEnd={endDrag}
                    onMove={() => {
                      setMoving(student);
                    }}
                    onBringBack={() => void move.moveTo(student, Stage.Counselling)}
                  />
                ))}
            </Column>
          ))}
        </div>
      </div>
      {moving !== null && (
        <MoveDialog
          student={moving}
          onClose={() => {
            setMoving(null);
          }}
          onChoose={(stage) => {
            setMoving(null);
            void move.moveTo(moving, stage);
          }}
        />
      )}
      {move.dialogs}
    </>
  );
}

type ColumnProps = {
  column: BoardColumn;
  isOver: boolean;
  /** Set while a card is being dragged: the pointer is over this column. */
  onOver: (() => void) | undefined;
  onDrop: () => void;
  onShowMore: () => void;
  children: ReactNode;
};

function Column({ column, isOver, onOver, onDrop, onShowMore, children }: ColumnProps) {
  function handleDragOver(event: DragEvent<HTMLElement>): void {
    if (onOver === undefined) return;
    event.preventDefault();
    onOver();
  }

  return (
    <section
      aria-label={columnLabel(column)}
      data-column={column.stage}
      data-over={isOver}
      onDragOver={handleDragOver}
      onDrop={(event) => {
        event.preventDefault();
        onDrop();
      }}
      className="bg-fill rounded-dialog min-h-65 min-w-0 p-2.5"
    >
      <ColumnHead column={column} />
      <div data-cards="" className="grid gap-2">
        {children}
        <ColumnState column={column} />
      </div>
      <ShowMore column={column} onShowMore={onShowMore} />
    </section>
  );
}

/** "Lead, 3" once the column is loaded; the Stage alone until then. */
function columnLabel(column: BoardColumn): string {
  const name = STAGE_LABELS[column.stage];
  return column.status === "loaded" ? BOARD_TEXT.columnLabel(name, column.count) : name;
}

/** The Stage's bead (a hollow ring for Lost), its name and how many Students are there. */
function ColumnHead({ column }: { column: BoardColumn }) {
  const at = JOURNEY_STAGES.findIndex((stage) => stage === column.stage);
  return (
    <h2 className="text-secondary flex items-center justify-between gap-2 px-1.5 pt-1 pb-2.5 font-semibold">
      <span className="inline-flex items-center gap-2">
        <i
          aria-hidden="true"
          data-bead=""
          className={clsx(
            "rounded-pill block size-2.5 flex-none",
            BEAD_CLASSES[at] ?? "border-rule-2 border",
          )}
        />
        {STAGE_LABELS[column.stage]}
      </span>
      {column.status === "loaded" && (
        <span aria-hidden="true" className="text-ink-3 font-medium tabular-nums">
          {column.count}
        </span>
      )}
    </h2>
  );
}

/** What a column says when it has no cards to show: loading, failed, or nobody there. */
function ColumnState({ column }: { column: BoardColumn }) {
  if (column.status === "loading") return <ColumnNote>{BOARD_TEXT.loading}</ColumnNote>;
  if (column.status === "failed") return <ColumnNote>{BOARD_TEXT.failed}</ColumnNote>;
  if (column.students.length > 0) return null;
  return <ColumnNote>{BOARD_TEXT.nobodyHere}</ColumnNote>;
}

function ShowMore({ column, onShowMore }: { column: BoardColumn; onShowMore: () => void }) {
  if (column.status !== "loaded" || !column.hasMore) return null;
  return (
    <div className="mt-2 grid">
      <Button
        size="sm"
        isLoading={column.isLoadingMore}
        loadingLabel={BOARD_TEXT.loading}
        label={BOARD_TEXT.showMoreOf(STAGE_LABELS[column.stage])}
        onClick={onShowMore}
      >
        {BOARD_TEXT.showMore}
      </Button>
    </div>
  );
}

function ColumnNote({ children }: { children: string }) {
  return (
    <p className="rounded-menu border-rule-2 text-small text-ink-3 border border-dashed px-2 py-4.5 text-center">
      {children}
    </p>
  );
}

type CardProps = {
  student: BoardStudent;
  canMove: boolean;
  isDragged: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: () => void;
  onBringBack: () => void;
};

const OWN_JOB = "a, button";

function Card(props: CardProps) {
  const { student, canMove } = props;
  const linkRef = useRef<HTMLAnchorElement>(null);
  const isLost = student.stage === Stage.Lost;
  const isDraggable = canMove && !isLost;

  /** A click anywhere on the card opens the Student; its link and buttons keep their own job. */
  function handleClick(event: MouseEvent<HTMLElement>): void {
    if (event.target instanceof Element && event.target.closest(OWN_JOB) !== null) return;
    linkRef.current?.click();
  }

  function handleDragStart(event: DragEvent<HTMLElement>): void {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", student.name);
    props.onDragStart();
  }

  return (
    <article
      data-card={student.id}
      data-dragging={props.isDragged}
      draggable={isDraggable}
      onClick={handleClick}
      onDragStart={isDraggable ? handleDragStart : undefined}
      onDragEnd={props.onDragEnd}
      className="bg-board-card rounded-menu grid min-w-0 gap-1.5 p-3"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-2">
        <Link
          ref={linkRef}
          href={ROUTES.student(student.id)}
          draggable={false}
          className="text-name text-ink min-w-0 font-semibold wrap-anywhere no-underline"
        >
          {student.name}
        </Link>
        {student.priority === Priority.High && (
          <Chip tone="bad" icon="arrowUp">
            {LABELS.highPriority}
          </Chip>
        )}
      </div>
      <p className="text-secondary text-ink-2">{student.nextStep}</p>
      <p className="text-small text-ink-2 flex flex-wrap gap-x-2.5">
        <span>{COUNTRY_LABELS[student.country]}</span>
        <span className="tabular-nums">
          {BOARD_TEXT.documents(student.documents.done, student.documents.total)}
        </span>
      </p>
      <div className="text-small text-ink-2 flex flex-wrap items-center justify-between gap-x-2">
        <CardCounsellor counsellor={student.assignedCounsellor} />
        {canMove && (
          <span className="-my-1 -mr-1.5 ml-auto">
            <CardAction student={student} onMove={props.onMove} onBringBack={props.onBringBack} />
          </span>
        )}
      </div>
    </article>
  );
}

/** The counsellor's initials in a small round, named for screen readers; or "No counsellor". */
function CardCounsellor({ counsellor }: { counsellor: BoardStudent["assignedCounsellor"] }) {
  if (counsellor === null) return <span>{BOARD_TEXT.noCounsellor}</span>;
  return (
    <span
      role="img"
      aria-label={BOARD_TEXT.counsellorNamed(counsellor.name)}
      title={counsellor.name}
    >
      <Avatar name={counsellor.name} size="xs" />
    </span>
  );
}

type CardActionProps = Pick<CardProps, "student" | "onMove" | "onBringBack">;

/** Move, or for a Lost Student the way back to Counselling. */
function CardAction({ student, onMove, onBringBack }: CardActionProps) {
  if (student.stage === Stage.Lost) {
    return (
      <Button
        size="sm"
        label={BOARD_TEXT.bringBackNamed(LABELS.bringBackToCounselling, student.name)}
        onClick={onBringBack}
      >
        {LABELS.bringBackToCounselling}
      </Button>
    );
  }
  return (
    <button
      type="button"
      data-move-for={student.id}
      aria-label={BOARD_TEXT.moveNamed(student.name)}
      onClick={onMove}
      className="rounded-control text-button-sm text-ink-2 hover:bg-fill hover:text-ink min-h-control px-button-sm inline-flex cursor-pointer items-center font-medium"
    >
      {BOARD_TEXT.move}
    </button>
  );
}
