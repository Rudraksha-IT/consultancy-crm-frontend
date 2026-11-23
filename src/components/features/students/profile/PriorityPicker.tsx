"use client";

import clsx from "clsx";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type RefObject } from "react";

import { Banner } from "@/components/ui/Banner";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Icon, type IconName } from "@/components/ui/Icon";
import { MenuList } from "@/components/ui/MenuList";
import { useToast } from "@/components/ui/useToast";
import { PRIORITIES, PRIORITY_LABELS, type Priority } from "@/constants/priority";
import { STUDENT_PRIORITY_TEXT as TEXT } from "@/constants/students";
import { saveStudentPriority, type StudentProfile } from "@/lib/api";

type Look = { tone: ChipTone; icon?: IconName; text: string };

/** Each Priority's chip: always its word, with a colour and an arrow for High and Low. */
const LOOKS: Record<Priority, Look> = {
  high: { tone: "bad", icon: "arrowUp", text: "text-bad" },
  normal: { tone: "muted", text: "text-ink-2" },
  low: { tone: "muted", icon: "arrowDown", text: "text-ink-3" },
};

type PriorityPickerProps = {
  profile: StudentProfile;
  /** The Priority was saved; History has a new entry. */
  onSaved: (profile: StudentProfile) => void;
};

/**
 * The Student's Priority beside their name (first live fixes, ticket 10): a small button that
 * opens High, Normal and Low for anyone who may set it, or its chip alone for anyone else.
 */
export function PriorityPicker({ profile, onSaved }: PriorityPickerProps) {
  if (!profile.canSetPriority) {
    const look = LOOKS[profile.priority];
    return (
      <Chip tone={look.tone} {...(look.icon !== undefined && { icon: look.icon })}>
        {TEXT.chip(PRIORITY_LABELS[profile.priority])}
      </Chip>
    );
  }
  return <PriorityMenu profile={profile} onSaved={onSaved} />;
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
  const look = LOOKS[current];

  function close(): void {
    setIsOpen(false);
    buttonRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") close();
  }

  return (
    <div className="grid gap-2">
      <div ref={rootRef} onKeyDown={handleKeyDown} className="relative w-fit">
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
          className={clsx(
            "min-h-control rounded-control border-rule bg-paper text-secondary hover:bg-fill inline-flex cursor-pointer items-center gap-1.5 border px-3 font-semibold",
            look.text,
          )}
        >
          {look.icon !== undefined && <Icon name={look.icon} size="sm" />}
          {TEXT.chip(PRIORITY_LABELS[current])}
          <Icon name="down" size="sm" className="text-ink-3" />
        </button>
        {isOpen && (
          <MenuList
            id={menuId}
            label={TEXT.menu}
            align="start"
            items={PRIORITIES.map((priority) => ({
              label: PRIORITY_LABELS[priority],
              ...(LOOKS[priority].icon !== undefined && { icon: LOOKS[priority].icon }),
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
