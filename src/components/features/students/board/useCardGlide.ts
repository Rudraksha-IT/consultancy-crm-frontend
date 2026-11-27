"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";

import { markFor, MOVE, placeIn, slideFrom, startOffset, type Place } from "@/lib/motion";

type Seen = { place: Place; stage: string | undefined };

/**
 * After the board is drawn again (a move, a filter, more cards), each card glides from where it
 * was to where it is now, and one that crossed to another column is ringed for a second (design
 * system: Movement). `drawn` changes whenever the columns do. Nothing moves the first time, or
 * with less motion.
 */
export function useCardGlide(boardRef: RefObject<HTMLElement | null>, drawn: unknown): void {
  const seen = useRef(new Map<string, Seen>());
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (board === null) return;
    const now = new Map<string, Seen>();
    board.querySelectorAll<HTMLElement>("[data-card]").forEach((card) => {
      const id = card.dataset.card ?? "";
      const stage = card.closest<HTMLElement>("[data-column]")?.dataset.column;
      const place = placeIn(board, card);
      now.set(id, { place, stage });
      const old = seen.current.get(id);
      if (old !== undefined) glide(card, old, { place, stage });
    });
    seen.current = now;
  }, [boardRef, drawn]);
}

/** Glides one card from where it was; across to another column it takes longer and is ringed. */
function glide(card: HTMLElement, old: Seen, now: Seen): void {
  const start = startOffset(old.place, now.place);
  if (start === null) return;
  const hasCrossed = old.stage !== now.stage;
  // A card keeps its own width as it glides: only its place changes.
  slideFrom(card, { ...start, scaleX: 1 }, hasCrossed ? MOVE.ms.cross : MOVE.ms.glide);
  if (hasCrossed) markFor(card, "landed", "", MOVE.ms.ring);
}
