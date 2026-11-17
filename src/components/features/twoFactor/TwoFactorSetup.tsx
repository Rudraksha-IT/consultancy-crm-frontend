"use client";

import { useEffect, useRef, useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { CodeField } from "@/components/ui/CodeField";
import { useToast } from "@/components/ui/useToast";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";
import { confirmTwoFactorSetup, startTwoFactorSetup, type TwoFactorSide } from "@/lib/api";

import { QrCode } from "./QrCode";
import { RecoveryCodes } from "./RecoveryCodes";
import { isStartAgain, readNumber } from "./secondStep";
import { StartAgain } from "./StartAgain";
import { errorsOf, useRefusal } from "./useRefusal";

// Where the button under the saved recovery codes leads.
const GO_ON: Record<TwoFactorSide, string> = { platform: TEXT.goOn, staff: TEXT.goOnToOffice };

type Phase =
  | { kind: "loading" }
  | { kind: "failed" }
  | { kind: "startAgain" }
  | { kind: "scan"; uri: string; secret: string }
  | { kind: "codes"; codes: readonly string[] };

type TwoFactorSetupProps = {
  /** Setup is confirmed and the codes saved: the Next.js server now holds the login tokens. */
  onDone: () => void;
  onStartAgain: () => void;
  /** False inside a Dialog, whose own title already names the step. */
  showsTitle?: boolean;
  /** A Platform Admin's setup on the Platform (61), or a Staff member's on their office (62). */
  side?: TwoFactorSide;
};

/**
 * Setting up the authenticator app (issue 61): scan the QR code (or type the key), confirm with
 * one number, then save the recovery codes, shown only now.
 */
export function TwoFactorSetup({
  onDone,
  onStartAgain,
  showsTitle = true,
  side = "platform",
}: TwoFactorSetupProps) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const hasStarted = useRef(false);

  useEffect(() => {
    // The secret is shown once per sign-in, so it is asked for only once.
    if (hasStarted.current) return;
    hasStarted.current = true;
    async function start(): Promise<void> {
      try {
        const setup = await startTwoFactorSetup(fetch, side);
        setPhase({ kind: "scan", ...setup });
      } catch (error) {
        setPhase({ kind: isStartAgain(error) ? "startAgain" : "failed" });
      }
    }
    void start();
  }, [side]);

  return (
    <div className="grid gap-5">
      {showsTitle && (
        <h2 className="text-section-title">
          {phase.kind === "codes" ? TEXT.codesTitle : TEXT.setupTitle}
        </h2>
      )}
      <SetupPhase
        side={side}
        goOnLabel={GO_ON[side]}
        phase={phase}
        onConfirmed={(codes) => {
          setPhase({ kind: "codes", codes });
        }}
        onStartAgain={onStartAgain}
        onMustStartAgain={() => {
          setPhase({ kind: "startAgain" });
        }}
        onDone={onDone}
      />
    </div>
  );
}

type SetupPhaseProps = {
  side: TwoFactorSide;
  goOnLabel: string;
  phase: Phase;
  onConfirmed: (codes: readonly string[]) => void;
  onMustStartAgain: () => void;
  onStartAgain: () => void;
  onDone: () => void;
};

function SetupPhase({
  side,
  goOnLabel,
  phase,
  onConfirmed,
  onMustStartAgain,
  onStartAgain,
  onDone,
}: SetupPhaseProps) {
  switch (phase.kind) {
    case "loading":
      return <p className="text-ink-2">{TEXT.loadingSetup}</p>;
    case "failed":
      return <SetupFailed onStartAgain={onStartAgain} />;
    case "startAgain":
      return <StartAgain onStartAgain={onStartAgain} />;
    case "scan":
      return (
        <ScanAndConfirm
          side={side}
          uri={phase.uri}
          secret={phase.secret}
          onConfirmed={onConfirmed}
          onMustStartAgain={onMustStartAgain}
        />
      );
    default:
      return <SaveCodes codes={phase.codes} goOnLabel={goOnLabel} onDone={onDone} />;
  }
}

/** Setup shows the key once per sign-in: after a failure, the person logs in again. */
function SetupFailed({ onStartAgain }: { onStartAgain: () => void }) {
  return (
    <div className="grid gap-5">
      <Banner tone="problem">{TEXT.setupFailed}</Banner>
      <Button variant="primary" size="lg" onClick={onStartAgain}>
        {TEXT.backToLogIn}
      </Button>
    </div>
  );
}

type ScanAndConfirmProps = {
  side: TwoFactorSide;
  uri: string;
  secret: string;
  onConfirmed: (codes: readonly string[]) => void;
  onMustStartAgain: () => void;
};

function ScanAndConfirm({ side, uri, secret, onConfirmed, onMustStartAgain }: ScanAndConfirmProps) {
  const { showToast } = useToast();
  const refusal = useRefusal();
  const [isChecking, setIsChecking] = useState(false);

  async function copyKey(): Promise<void> {
    try {
      await navigator.clipboard.writeText(secret);
      showToast(TEXT.keyCopied);
    } catch {
      refusal.setProblem(TEXT.copyFailed);
    }
  }

  async function confirm(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    refusal.clear();
    const code = readNumber(new FormData(event.currentTarget));
    if (code === null) {
      refusal.setFieldError(TEXT.enterNumber);
      return;
    }
    setIsChecking(true);
    try {
      onConfirmed(await confirmTwoFactorSetup(code, fetch, side));
    } catch (error) {
      setIsChecking(false);
      if (isStartAgain(error)) onMustStartAgain();
      else refusal.show(error, false);
    }
  }

  return (
    <form noValidate className="grid gap-5" onSubmit={(event) => void confirm(event)}>
      <p className="text-ink-2">{TEXT.setupIntro}</p>
      <QrCode value={uri} label={TEXT.qrLabel} />
      <div className="grid gap-2">
        <p className="text-ink-2">{TEXT.cantScan}</p>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <code
            aria-label={TEXT.secretLabel}
            className="rounded-control bg-fill min-w-0 px-3 py-2 tracking-wide break-all tabular-nums select-all"
          >
            {groupedKey(secret)}
          </code>
          <Button icon="copy" size="sm" onClick={() => void copyKey()}>
            {TEXT.copyKey}
          </Button>
        </div>
      </div>
      <CodeField label={TEXT.confirmLabel} name="code" errors={errorsOf(refusal.fieldError)} />
      {refusal.problem !== null && <Banner tone="problem">{refusal.problem}</Banner>}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isChecking}
        loadingLabel={TEXT.checking}
      >
        {TEXT.confirm}
      </Button>
    </form>
  );
}

type SaveCodesProps = { codes: readonly string[]; goOnLabel: string; onDone: () => void };

function SaveCodes({ codes, goOnLabel, onDone }: SaveCodesProps) {
  const [hasSaved, setHasSaved] = useState(false);
  return (
    <div className="grid gap-5">
      <p className="text-ink-2">{TEXT.codesIntro}</p>
      <RecoveryCodes codes={codes} />
      <CheckboxField
        label={TEXT.savedThem}
        name="savedThem"
        isChecked={hasSaved}
        onChange={setHasSaved}
      />
      <Button variant="primary" size="lg" isDisabled={!hasSaved} onClick={onDone}>
        {goOnLabel}
      </Button>
    </div>
  );
}

/** The key in groups of four, easier to read and type into an app. */
function groupedKey(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}
