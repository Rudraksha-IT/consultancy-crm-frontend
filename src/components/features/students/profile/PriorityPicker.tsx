"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";

import { Banner } from "@/components/ui/Banner";
import { Icon } from "@/components/ui/Icon";
import { MENU_IN_ROW_HOLDER, MenuList } from "@/components/ui/MenuList";
import { useToast } from "@/components/ui/useToast";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/constants/priority";
import { STUDENT_PRIORITY_TEXT as TEXT } from "@/constants/students";
import { saveStudentPriority, type StudentProfile } from "@/lib/api";

import { PRIORITY_DOTS, PriorityWord } from "../PriorityWord";

type PriorityPickerProps = {
  profile: StudentProfile;
  /** The Priority was saved; History has a new entry. */
  onSaved: (profile: StudentProfile) => void;
};

/**
 * The Student's Priority with the header's actions (first live fixes, ticket 10): "Priority ● High"
 * as a control that opens High, Normal and Low for anyone who may set it, or as plain text otherwise.
 */
export function PriorityPicker({ profile, onSaved }: PriorityPickerProps) {
  if (!profile.canSetPriority) {
    return (
      <span className={clsx(CONTROL, "cursor-default")}>
        <PriorityValue priority={profile.priority} />
      </span>
    );
  }
  return <PriorityMenu profile={profile} onSaved={onSaved} />;
}

/** On a phone it is small, like the actions beside it: a pill, still 44 tall to tap. */
const CONTROL =
  "min-h-control rounded-control border-rule bg-paper text-body max-phone:rounded-pill max-phone:text-button-sm max-phone:gap-1.5 max-phone:px-3 inline-flex items-center gap-2.5 border px-4";

/** "Priority" quietly, then the dot and the word. */
function PriorityValue({ priority }: { priority: Priority }) {
  return (
    <>
      <span className="text-ink-2">{TEXT.label}</span>
      <span className="text-ink font-semibold">
        <PriorityWord priority={priority} />
      </span>
    </>
  );
}

function PriorityMenu({ profile, onSaved }: PriorityPickerProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { change, problem } = usePriorityChange(profile, onSaved, () => {
    buttonRef.current?.focus();
  });
  useClosesOnOutsideClick(isOpen, rootRef, setIsOpen);
  const current = profile.priority;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== "Escape") return;
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div className="grid gap-2">
      <div ref={rootRef} onKeyDown={handleKeyDown} className={clsx(MENU_IN_ROW_HOLDER, "w-fit")}>
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          aria-label={TEXT.change(PRIORITY_LABELS[current])}
          onClick={() => {
            setIsOpen((open) => !open);
          }}
          className={clsx(CONTROL, "hover:bg-fill cursor-pointer")}
        >
          <PriorityValue priority={current} />
          <Icon name="down" size="sm" className="text-ink-3" />
        </button>
        {isOpen && (
          <MenuList
            id={menuId}
            label={TEXT.menu}
            hasTitle
            isInRow
            items={PRIORITIES.map((priority) => ({
              label: PRIORITY_LABELS[priority],
              hint: TEXT.hints[priority],
              dot: PRIORITY_DOTS[priority],
              isChosen: priority === current,
              onSelect: () => {
                change(priority);
              },
            }))}
            onChosen={() => {
              setIsOpen(false);
            }}
          />
        )}
      </div>
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
    </div>
  );
}

/** Save a new Priority, say so, and put focus back on the button; nothing for the same one. */
function usePriorityChange(
  profile: StudentProfile,
  onSaved: (profile: StudentProfile) => void,
  refocus: () => void,
) {
  const { showToast } = useToast();
  const [problem, setProblem] = useState<string | null>(null);

  function change(priority: Priority): void {
    refocus();
    if (priority === profile.priority) return;
    setProblem(null);
    saveStudentPriority(profile.id, priority).then(
      (saved) => {
        showToast(TEXT.saved(PRIORITY_LABELS[saved.priority]));
        onSaved(saved);
        refocus();
      },
      () => {
        setProblem(TEXT.failed);
      },
    );
  }

  return { change, problem };
}

/** Close the menu when someone clicks anywhere outside it. */
function useClosesOnOutsideClick(
  isOpen: boolean,
  rootRef: RefObject<HTMLDivElement | null>,
  setIsOpen: (isOpen: boolean) => void,
): void {
  useEffect(() => {
    if (!isOpen) return undefined;
    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isOpen, rootRef, setIsOpen]);
}
