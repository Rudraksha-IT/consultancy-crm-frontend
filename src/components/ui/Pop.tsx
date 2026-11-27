"use client";

import { useRef, type ComponentProps, type RefObject } from "react";

import { useLeaving } from "./useMovement";

type PopProps = Omit<ComponentProps<"div">, "ref"> & {
  /** For whoever opened it, to place it or move the cursor into it. */
  ref?: RefObject<HTMLDivElement | null>;
};

/**
 * A small panel that opens from the button that owns it (design system: Movement): it eases in
 * from the button, and a copy of it fades out when it closes. How it looks and what it holds are
 * the caller's.
 */
export function Pop({ ref, children, ...rest }: PopProps) {
  const own = useRef<HTMLDivElement | null>(null);
  useLeaving(own, "pop");
  return (
    <div
      {...rest}
      ref={(node) => {
        own.current = node;
        if (ref !== undefined) ref.current = node;
      }}
      data-move="pop"
    >
      {children}
    </div>
  );
}
