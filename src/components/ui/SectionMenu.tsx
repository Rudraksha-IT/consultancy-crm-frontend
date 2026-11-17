"use client";

import clsx from "clsx";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { Icon } from "./Icon";
import { useChosenInView } from "./useChosenInView";
import { usePhoneWidth } from "./usePhoneWidth";

/** One section of a settings page: its place in the menu, and what it shows when chosen. */
export type MenuSection = {
  id: string;
  title: string;
  /** One short line under the title. Leave it out when the content shows its own title. */
  description?: string;
  /** The content draws its own title (a single settings part), so no title is added above it. */
  hasOwnTitle?: boolean;
  content: ReactNode;
};

/** Which section is chosen and, at phone width, whether it is open or the list is shown. */
export type SectionChoice = {
  current: string;
  isOpen: boolean;
  /** Chooses a section; at phone width it also opens it. */
  choose: (id: string) => void;
  /** Phone width: back to the list of sections. */
  showList: () => void;
};

/**
 * The chosen section of a settings page. It lives in the page, so arriving at the page always
 * starts at the first section, and at phone width at the list (design system: Settings pages).
 */
export function useSectionChoice(first: string): SectionChoice {
  const [current, setCurrent] = useState(first);
  const [isOpen, setIsOpen] = useState(false);
  const choose = useCallback((id: string) => {
    setCurrent(id);
    setIsOpen(true);
  }, []);
  const showList = useCallback(() => {
    setIsOpen(false);
  }, []);
  return { current, isOpen, choose, showList };
}

type SectionMenuProps = {
  /** The page's name; names the menu for screen readers. */
  label: string;
  /** The way back to the list at phone width, e.g. "All of Configuration". */
  backLabel: string;
  sections: readonly MenuSection[];
  choice: SectionChoice;
  /**
   * Every section stays in the page, only hidden, so typing in a form survives switching
   * sections (Edit details). Otherwise only the chosen section is drawn.
   */
  keepsAllMounted?: boolean;
  /** Shown under the section, and under the list at phone width (Edit details' Save bar). */
  footer?: ReactNode;
};

const CHOSEN = '[aria-current="true"]';

type Focus = "none" | "back" | "item";

/**
 * The one section menu of every settings page (Configuration, Settings, the Platform account and
 * a Student's Edit details): one section at a time on every width. Above 1024 the menu is on the
 * left; from 641 to 1024 it is a sideways strip that keeps the chosen section in view; at 640 and
 * below the page opens on a list of sections, and a chosen section shows alone with a way back.
 */
export function SectionMenu({
  label,
  backLabel,
  sections,
  choice,
  keepsAllMounted,
  footer,
}: SectionMenuProps) {
  const isPhone = usePhoneWidth();
  const focus = useMenuFocus(choice.isOpen);
  const current = shownSection(sections, choice.current);
  const view = menuView(isPhone, choice.isOpen);
  useChosenInView(focus.stripRef, current, CHOSEN);

  return (
    <div className="wide:grid-cols-[var(--spacing-settings-menu)_minmax(0,1fr)] max-phone:gap-4 grid grid-cols-1 items-start gap-8">
      {view.showsMenu && (
        <SectionNav
          label={label}
          sections={sections}
          current={current}
          isList={isPhone}
          stripRef={focus.stripRef}
          onChoose={(id) => {
            if (isPhone) focus.next("back");
            choice.choose(id);
          }}
        />
      )}
      <div className="grid min-w-0 gap-8">
        {view.showsBack && (
          <BackButton
            label={backLabel}
            buttonRef={focus.backRef}
            onBack={() => {
              focus.next("item");
              choice.showList();
            }}
          />
        )}
        {sections.map((section) => (
          <SectionBox
            key={section.id}
            section={section}
            isShown={view.showsSection && section.id === current}
            keepsMounted={keepsAllMounted}
          />
        ))}
        {footer}
      </div>
    </div>
  );
}

/** What is drawn: above phone width the menu and the section; at phone width one or the other. */
function menuView(isPhone: boolean, isOpen: boolean) {
  const isListShown = isPhone && !isOpen;
  return {
    showsMenu: !isPhone || isListShown,
    showsBack: isPhone && isOpen,
    showsSection: !isListShown,
  };
}

/** The chosen section, or the first one when the chosen one is gone (a Module switched off). */
function shownSection(sections: readonly MenuSection[], chosen: string): string {
  if (sections.some((section) => section.id === chosen)) return chosen;
  return sections[0]?.id ?? "";
}

/**
 * At phone width, opening a section moves focus to the way back, and going back moves it to the
 * section's row in the list. Choosing from elsewhere (a failed save) leaves focus alone.
 */
function useMenuFocus(isOpen: boolean) {
  const stripRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<Focus>("none");

  useEffect(() => {
    const target: Record<Focus, () => HTMLElement | null | undefined> = {
      none: () => null,
      back: () => backRef.current,
      item: () => stripRef.current?.querySelector<HTMLElement>(CHOSEN),
    };
    const next = focusNext.current;
    focusNext.current = "none";
    target[next]()?.focus();
  }, [isOpen]);

  return {
    stripRef,
    backRef,
    next: (target: Focus) => {
      focusNext.current = target;
    },
  };
}

type SectionNavProps = {
  label: string;
  sections: readonly MenuSection[];
  current: string;
  /** Phone width: the list of sections, rows with arrows. */
  isList: boolean;
  stripRef: RefObject<HTMLElement | null>;
  onChoose: (id: string) => void;
};

function SectionNav({ label, sections, current, isList, stripRef, onChoose }: SectionNavProps) {
  return (
    <nav
      ref={stripRef}
      aria-label={label}
      className={clsx(
        "min-w-0",
        isList
          ? "bg-paper border-rule rounded-panel grid overflow-hidden border"
          : "wide:sticky wide:top-24 wide:grid wide:overflow-visible flex gap-1 overflow-x-auto",
      )}
    >
      {sections.map((section) => (
        <MenuItem
          key={section.id}
          title={section.title}
          isCurrent={section.id === current}
          isListRow={isList}
          onChoose={() => {
            onChoose(section.id);
          }}
        />
      ))}
    </nav>
  );
}

type BackButtonProps = {
  label: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onBack: () => void;
};

function BackButton({ label, buttonRef, onBack }: BackButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onBack}
      className="min-h-control text-secondary text-accent rounded-control inline-flex items-center gap-1.5 justify-self-start font-semibold"
    >
      <Icon name="left" size="sm" />
      {label}
    </button>
  );
}

type SectionBoxProps = {
  section: MenuSection;
  isShown: boolean;
  keepsMounted: boolean | undefined;
};

/** One section's place in the page: drawn only when shown, unless the page keeps every one. */
function SectionBox({ section, isShown, keepsMounted }: SectionBoxProps) {
  if (keepsMounted !== true && !isShown) return null;
  return (
    <div data-section={section.id} hidden={!isShown} className="min-w-0">
      <MenuSectionBody section={section} />
    </div>
  );
}

type MenuItemProps = {
  title: string;
  isCurrent: boolean;
  /** Phone width: a row of the list of sections, with an arrow. */
  isListRow: boolean;
  onChoose: () => void;
};

function MenuItem({ title, isCurrent, isListRow, onChoose }: MenuItemProps) {
  return (
    <button
      type="button"
      aria-current={isCurrent}
      onClick={onChoose}
      className={clsx(
        "relative flex items-center text-left",
        isListRow
          ? "min-h-row border-rule text-ink active:bg-fill justify-between gap-3 border-b pr-3 pl-4 font-medium last:border-b-0"
          : [
              "min-h-control rounded-control flex-none px-3.5 font-semibold whitespace-nowrap",
              isCurrent
                ? "bg-paper text-accent before:w-active-line before:rounded-r-chip before:absolute before:inset-y-2 before:left-0 before:bg-current"
                : "text-ink-2 hover:bg-fill-2",
            ],
      )}
    >
      {title}
      {isListRow && <Icon name="right" size="sm" className="text-ink-3" />}
    </button>
  );
}

/** One section: its title and short description above its content, unless it has its own. */
function MenuSectionBody({ section }: { section: MenuSection }) {
  const titleId = useId();
  if (section.hasOwnTitle === true) return section.content;
  return (
    <section aria-labelledby={titleId} className="grid min-w-0 content-start gap-6">
      <div className="grid gap-2">
        <h2 id={titleId} className="text-section-title">
          {section.title}
        </h2>
        {section.description !== undefined && <p className="text-ink-2">{section.description}</p>}
      </div>
      {section.content}
    </section>
  );
}
