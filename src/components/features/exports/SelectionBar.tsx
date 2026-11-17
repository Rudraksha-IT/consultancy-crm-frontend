"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CONTROL_CLASSES } from "@/components/ui/Field";
import { useToast } from "@/components/ui/useToast";
import { ContactKind, SELECTION_TEXT } from "@/constants/exports";
import { contactsToCopy, type Contact } from "@/lib/exports";

type SelectionBarProps = {
  /** The ticked rows' Students, from the rows already loaded. */
  selected: readonly Contact[];
  onClear: () => void;
};

type Fallback = { kind: ContactKind; text: string };

/**
 * Shown while rows are ticked: how many, "Copy emails", "Copy phones" and "Clear" (spec 31a).
 * When the browser won't let us copy, the text opens in a dialog, selected, to copy by hand.
 */
export function SelectionBar({ selected, onClear }: SelectionBarProps) {
  const { showToast } = useToast();
  const [fallback, setFallback] = useState<Fallback | null>(null);
  if (selected.length === 0) return null;

  async function copy(kind: ContactKind): Promise<void> {
    const copied = contactsToCopy(selected, kind);
    if (copied.count === 0) {
      showToast(SELECTION_TEXT.noneToCopy(kind));
      return;
    }
    try {
      await navigator.clipboard.writeText(copied.text);
      showToast(SELECTION_TEXT.copied(copied.count, kind, copied.missing));
    } catch {
      setFallback({ kind, text: copied.text });
    }
  }

  return (
    <div
      role="region"
      aria-label={SELECTION_TEXT.barLabel}
      className="bg-tint border-rule flex flex-wrap items-center gap-3 border-b px-6 py-3"
    >
      <b className="text-accent mr-auto" aria-live="polite">
        {SELECTION_TEXT.selected(selected.length)}
      </b>
      <Button
        size="sm"
        icon="copy"
        onClick={() => {
          void copy(ContactKind.Email);
        }}
      >
        {SELECTION_TEXT.copyEmails}
      </Button>
      <Button
        size="sm"
        icon="copy"
        onClick={() => {
          void copy(ContactKind.Phone);
        }}
      >
        {SELECTION_TEXT.copyPhones}
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear}>
        {SELECTION_TEXT.clear}
      </Button>
      {fallback !== null && (
        <CopyByHandDialog
          fallback={fallback}
          onClose={() => {
            setFallback(null);
          }}
        />
      )}
    </div>
  );
}

function CopyByHandDialog({ fallback, onClose }: { fallback: Fallback; onClose: () => void }) {
  const boxRef = useRef<HTMLTextAreaElement>(null);
  // After the dialog has moved focus in, select the text so Ctrl+C copies it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      boxRef.current?.select();
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <Dialog
      isOpen
      title={SELECTION_TEXT.copyTitle(fallback.kind)}
      onClose={onClose}
      footer={
        <Button variant="primary" onClick={onClose}>
          {SELECTION_TEXT.done}
        </Button>
      }
    >
      <div className="grid gap-4">
        <p className="text-ink-2">{SELECTION_TEXT.copyFallback}</p>
        <textarea
          ref={boxRef}
          readOnly
          rows={6}
          aria-label={SELECTION_TEXT.copyBox(fallback.kind)}
          value={fallback.text}
          onFocus={(event) => {
            event.target.select();
          }}
          className={`${CONTROL_CLASSES} resize-y py-3`}
        />
      </div>
    </Dialog>
  );
}
