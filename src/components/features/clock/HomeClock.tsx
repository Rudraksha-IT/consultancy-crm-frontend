"use client";

import clsx from "clsx";
import { useState, type ReactNode } from "react";

import { useDates } from "@/components/features/shell/dateDisplay";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon, type IconName } from "@/components/ui/Icon";
import { IconLink } from "@/components/ui/IconLink";
import { useToast } from "@/components/ui/useToast";
import { HTTP_STATUS } from "@/constants/api";
import { CLOCK_TEXT as TEXT } from "@/constants/clock";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { WORK_FROM_HOME_TEXT as WFH } from "@/constants/workFromHome";
import { ClockRefusedError, clockIn, clockOut, type MyClock, updatingOr } from "@/lib/api";
import { durationText, elapsedMinutes, officeTime } from "@/lib/clock";

import { AskWorkFromHomeDialog } from "./AskWorkFromHomeDialog";
import { useMyClock } from "./useMyClock";

type Refusal = { message: string; isNoNetwork: boolean };

/**
 * The small clock on the right of the Home greeting (spec 103): whether I'm clocked in and for
 * how long, whether I'm on the office network, Clock in or Clock out, and a link to my month.
 * Every time shown comes from the server. Shown for every Role while Clock-in is on. Everyone but
 * an Admin can ask for Work From Home dates from here (issue 87).
 */
export function HomeClock() {
  const { state, show, sinceAnswerMs } = useMyClock();
  if (state.status === "loading") return null;
  if (state.status === "failed") return <p className="text-small text-ink-2">{TEXT.loadFailed}</p>;
  return <ClockCard clock={state.clock} sinceAnswerMs={sinceAnswerMs} onAnswer={show} />;
}

type ClockCardProps = {
  clock: MyClock;
  sinceAnswerMs: number;
  onAnswer: (clock: MyClock) => void;
};

/**
 * What's going on, Clock in or out, my month and Work from home. On a phone: the status and the
 * calendar icon on top, Clock in/out full width under them, with Work from home beside it.
 */
function ClockCard({ clock, sinceAnswerMs, onAnswer }: ClockCardProps) {
  const dates = useDates();
  const { staff } = useCurrentStaff();
  const { isSending, refusal, act, closeRefusal } = useClockAction(clock, onAnswer);
  const look = lookOf(clock, sinceAnswerMs, dates.date);
  const action = actionOf(clock);
  const canAsk = staff.role !== Role.Admin;
  return (
    <div
      role="region"
      aria-label={TEXT.region}
      className="rounded-panel border-rule bg-paper shadow-raise max-phone:w-full max-phone:grid max-phone:grid-cols-[auto_minmax(0,1fr)_auto] max-phone:gap-x-3 max-phone:gap-y-2.5 max-phone:py-3 max-phone:pr-3 max-phone:pl-4 flex max-w-full flex-wrap items-center gap-3 border py-1.5 pr-1.5 pl-3.5"
    >
      <span
        className={clsx(
          "max-phone:col-start-1 max-phone:row-start-1 grid",
          TONE_CLASSES[look.tone],
        )}
      >
        <Icon name="clock" size="lg" />
      </span>
      <div className="text-small text-ink-2 max-phone:col-start-2 max-phone:row-start-1 grid min-w-0 flex-1 basis-48 gap-px">
        <b className={TITLE_CLASSES[look.tone]}>{look.title}</b>
        <span>{look.line}</span>
        <NetworkLine clock={clock} />
      </div>
      <span
        data-clock-action=""
        className={clsx(
          "max-phone:row-start-2 max-phone:grid contents",
          canAsk ? "max-phone:col-span-2" : "max-phone:col-span-full",
        )}
      >
        <Button
          size="sm"
          variant={look.isPrimary ? "primary" : "secondary"}
          icon={action.icon}
          isLoading={isSending}
          onClick={() => void act(action.kind)}
        >
          {action.label}
        </Button>
      </span>
      <span className="max-phone:col-start-3 max-phone:row-start-1 max-phone:block contents">
        <IconLink href={ROUTES.clock} icon="batches" label={TEXT.myMonth} />
      </span>
      <AskAndRefusal canAsk={canAsk} refusal={refusal} onCloseRefusal={closeRefusal} />
    </div>
  );
}

/**
 * Work from home beside the clock, and the dialog when clocking was refused. Anyone but an Admin
 * may ask for dates, from the button or from a refusal off the office network.
 */
function AskAndRefusal({
  canAsk,
  refusal,
  onCloseRefusal,
}: {
  canAsk: boolean;
  refusal: Refusal | null;
  onCloseRefusal: () => void;
}) {
  const [isAsking, setIsAsking] = useState(false);
  const ask = () => {
    onCloseRefusal();
    setIsAsking(true);
  };
  const close = () => {
    setIsAsking(false);
  };
  return (
    <>
      {canAsk && (
        <span
          data-wfh=""
          className="max-phone:col-start-3 max-phone:row-start-2 max-phone:grid contents"
        >
          <Button size="sm" variant="ghost" icon="home" onClick={ask}>
            {WFH.askOnClock}
          </Button>
        </span>
      )}
      <RefusedDialog refusal={refusal} onClose={onCloseRefusal} onAsk={canAsk ? ask : null} />
      {isAsking && <AskWorkFromHomeDialog onClose={close} onSent={close} />}
    </>
  );
}

type Action = { kind: "in" | "out"; label: string; icon: IconName };

function actionOf(clock: MyClock): Action {
  return clock.open === null
    ? { kind: "in", label: TEXT.clockIn, icon: "clock" }
    : { kind: "out", label: TEXT.clockOut, icon: "logout" };
}

/** Clock in or out, then say so; a refusal off the office network opens a dialog. */
function useClockAction(clock: MyClock, onAnswer: (clock: MyClock) => void) {
  const { showToast } = useToast();
  const dates = useDates();
  const [isSending, setIsSending] = useState(false);
  const [refusal, setRefusal] = useState<Refusal | null>(null);

  async function send(kind: Action["kind"]): Promise<string> {
    if (kind === "out") {
      const answer = await clockOut();
      onAnswer(answer.clock);
      return TEXT.clockedOut(officeTime(answer.clock.now), durationText(answer.minutes));
    }
    const answer = await clockIn();
    onAnswer(answer.clock);
    const marked = answer.markedNotClockedOut;
    const note = marked === null ? "" : TEXT.markedNotOut(dates.date(marked));
    return `${TEXT.clockedIn(officeTime(answer.clock.now))}${note}`;
  }

  async function act(kind: Action["kind"]): Promise<void> {
    setIsSending(true);
    try {
      showToast(await send(kind));
    } catch (error) {
      refused(error);
    }
    setIsSending(false);
  }

  function refused(error: unknown): void {
    if (error instanceof ClockRefusedError && error.status === HTTP_STATUS.forbidden) {
      setRefusal({ message: error.message, isNoNetwork: clock.officeNetwork === "none" });
      return;
    }
    showToast(error instanceof ClockRefusedError ? error.message : updatingOr(error, TEXT.failed));
  }

  return {
    isSending,
    refusal,
    act,
    closeRefusal: () => {
      setRefusal(null);
    },
  };
}

const TONE_CLASSES = { good: "text-good", warn: "text-warn", quiet: "text-ink-3" } as const;
const TITLE_CLASSES = { good: "text-ink", warn: "text-warn", quiet: "text-ink" } as const;

type Look = {
  tone: keyof typeof TONE_CLASSES;
  title: string;
  line: string;
  isPrimary: boolean;
};

function lookOf(clock: MyClock, sinceAnswerMs: number, date: (iso: string) => string): Look {
  if (clock.open !== null) {
    const minutes = elapsedMinutes(clock.open.clockedInAt, clock.now, sinceAnswerMs);
    return {
      tone: "good",
      title: TEXT.inSince(officeTime(clock.open.clockedInAt)),
      line: durationText(minutes),
      isPrimary: false,
    };
  }
  if (clock.forgottenDay !== null) {
    return {
      tone: "warn",
      title: TEXT.forgotten(date(clock.forgottenDay)),
      line: TEXT.adminCanFix,
      isPrimary: true,
    };
  }
  return closedLook(clock);
}

function closedLook(clock: MyClock): Look {
  if (clock.lastOut === null) {
    return { tone: "quiet", title: TEXT.notIn, line: TEXT.clockInWhenYouStart, isPrimary: true };
  }
  return {
    tone: "quiet",
    title: TEXT.outAt(officeTime(clock.lastOut)),
    line: TEXT.today(durationText(clock.todayMinutes)),
    isPrimary: false,
  };
}

const NETWORK_LOOK = {
  on: { icon: "wifi", words: TEXT.onNetwork, className: "text-good" },
  off: { icon: "alert", words: TEXT.offNetwork, className: "text-warn" },
  none: { icon: "alert", words: TEXT.noNetwork, className: "text-warn" },
} as const;

/** Off the office network, an Admin or someone on Work From Home dates may still clock in. */
const ANYWHERE_LOOK = {
  admin: { icon: "home", words: WFH.adminAnywhere, className: "text-good" },
  work_from_home: { icon: "home", words: WFH.workingFromHome, className: "text-good" },
} as const;

function NetworkLine({ clock }: { clock: MyClock }) {
  const look =
    clock.officeNetwork === "on" || clock.anywhere === null
      ? NETWORK_LOOK[clock.officeNetwork]
      : ANYWHERE_LOOK[clock.anywhere];
  return (
    <span className={clsx("inline-flex items-center gap-1.5", look.className)}>
      <Icon name={look.icon} size="sm" />
      {look.words}
    </span>
  );
}

type RefusedDialogProps = {
  refusal: Refusal | null;
  onClose: () => void;
  /** Anyone but an Admin may ask for Work From Home dates instead, when off the network. */
  onAsk: (() => void) | null;
};

function RefusedDialog({ refusal, onClose, onAsk }: RefusedDialogProps) {
  if (refusal === null) return null;
  // With no office network set up, Work From Home isn't the answer: the Admin must add one.
  if (refusal.isNoNetwork) {
    return <RefusedBox title={TEXT.cantYetTitle} refusal={refusal} onClose={onClose} />;
  }
  if (onAsk === null) {
    return <RefusedBox title={TEXT.notOnNetworkTitle} refusal={refusal} onClose={onClose} />;
  }
  return (
    <RefusedBox
      title={TEXT.notOnNetworkTitle}
      refusal={refusal}
      onClose={onClose}
      note={`${TEXT.nothingRecordedShort} ${WFH.askInstead}`}
      ask={<Button onClick={onAsk}>{WFH.askToWorkFromHome}</Button>}
    />
  );
}

type RefusedBoxProps = {
  title: string;
  refusal: Refusal;
  onClose: () => void;
  note?: string;
  ask?: ReactNode;
};

function RefusedBox({
  title,
  refusal,
  onClose,
  note = TEXT.nothingRecorded,
  ask = null,
}: RefusedBoxProps) {
  return (
    <Dialog
      isOpen
      title={title}
      onClose={onClose}
      footer={
        <>
          {ask}
          <Button variant="primary" onClick={onClose}>
            {TEXT.ok}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p>{refusal.message}</p>
        <p className="text-small text-ink-2">{note}</p>
      </div>
    </Dialog>
  );
}
