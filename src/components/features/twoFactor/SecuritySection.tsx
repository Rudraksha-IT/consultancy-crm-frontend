"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { Panel } from "@/components/ui/Panel";
import { ROUTES } from "@/constants/routes";
import { TWO_FACTOR_TEXT as TEXT } from "@/constants/twoFactor";
import { useFullPageNavigation } from "@/hooks/useFullPageNavigation";
import { switchTwoFactorOn, type TwoFactorSide, type TwoFactorState } from "@/lib/api";

import { NewRecoveryCodesDialog } from "./NewRecoveryCodesDialog";
import { SwitchOffDialog } from "./SwitchOffDialog";
import { TwoFactorSetup } from "./TwoFactorSetup";
import type { MyTwoFactor } from "./useMyTwoFactor";

// Where switching on leads: the login page once signed out, the page back after setup.
const SIDE_ROUTES: Record<TwoFactorSide, { login: string; afterSetup: string }> = {
  platform: { login: ROUTES.platformLogin, afterSetup: ROUTES.platformAccount },
  staff: { login: ROUTES.login, afterSetup: ROUTES.mySettings },
};

type Open = "none" | "switchOn" | "setup" | "switchOff" | "newCodes";

type SecuritySectionProps = {
  twoFactor: MyTwoFactor;
  onChanged: (state: TwoFactorState) => void;
  /** The Platform Admin's Account page (issue 61), or a Staff member's My settings (issue 62). */
  side?: TwoFactorSide;
};

/**
 * My own two-step login: on or off, the recovery codes left, switching on (setup starts at
 * once), switching off (when I may), and new recovery codes.
 */
export function SecuritySection({ twoFactor, onChanged, side = "platform" }: SecuritySectionProps) {
  if (twoFactor.kind === "loading") return <p className="text-ink-2">{TEXT.loadingState}</p>;
  if (twoFactor.kind === "failed") return <Banner tone="problem">{TEXT.stateFailed}</Banner>;
  return <SecurityPanel state={twoFactor.state} onChanged={onChanged} side={side} />;
}

type SecurityPanelProps = {
  state: TwoFactorState;
  onChanged: (state: TwoFactorState) => void;
  side: TwoFactorSide;
};

function SecurityPanel({ state, onChanged, side }: SecurityPanelProps) {
  const [open, setOpen] = useState<Open>("none");
  const [problem, setProblem] = useState<string | null>(null);

  function close(): void {
    setOpen("none");
  }

  return (
    <Panel isPadded>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <StateLine state={state} />
        <Actions state={state} onOpen={setOpen} />
      </div>
      {state.required && !state.canSwitchOff && (
        <p className="text-ink-2">{TEXT.adminRequiresIt}</p>
      )}
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
      <SwitchOnDialogs
        side={side}
        open={open}
        onOpen={setOpen}
        onFailed={() => {
          setProblem(TEXT.failed);
          close();
        }}
      />
      <SwitchOffDialog
        side={side}
        isOpen={open === "switchOff"}
        onClose={close}
        onSwitchedOff={(next) => {
          close();
          onChanged(next);
        }}
      />
      <NewRecoveryCodesDialog
        side={side}
        isOpen={open === "newCodes"}
        onClose={close}
        onMade={(left) => {
          onChanged({ ...state, recoveryCodesLeft: left });
        }}
      />
    </Panel>
  );
}

function StateLine({ state }: { state: TwoFactorState }) {
  return (
    <div className="grid min-w-0 gap-1">
      <p className="flex flex-wrap items-center gap-3">
        <span className="font-semibold">{TEXT.stateLabel}</span>
        <Chip tone={state.required ? "good" : "muted"} icon={state.required ? "check" : "x"}>
          {state.required ? TEXT.stateOn : TEXT.stateOff}
        </Chip>
      </p>
      {state.setUp && <p className="text-ink-2">{TEXT.codesLeft(state.recoveryCodesLeft)}</p>}
    </div>
  );
}

function Actions({ state, onOpen }: { state: TwoFactorState; onOpen: (open: Open) => void }) {
  if (!state.required) {
    return (
      <Button
        variant="primary"
        icon="shield"
        onClick={() => {
          onOpen("switchOn");
        }}
      >
        {TEXT.switchOn}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      {state.setUp && (
        <Button
          onClick={() => {
            onOpen("newCodes");
          }}
        >
          {TEXT.newCodes}
        </Button>
      )}
      {state.canSwitchOff && (
        <Button
          variant="danger"
          onClick={() => {
            onOpen("switchOff");
          }}
        >
          {TEXT.switchOff}
        </Button>
      )}
    </div>
  );
}

type SwitchOnDialogsProps = {
  side: TwoFactorSide;
  open: Open;
  onOpen: (open: Open) => void;
  onFailed: () => void;
};

/** Confirm switching on; then this session has ended and setup goes on in a dialog. */
function SwitchOnDialogs({ side, open, onOpen, onFailed }: SwitchOnDialogsProps) {
  const navigate = useFullPageNavigation();
  const [isSwitchingOn, setIsSwitchingOn] = useState(false);

  async function switchOn(): Promise<void> {
    setIsSwitchingOn(true);
    try {
      await switchTwoFactorOn(fetch, side);
      onOpen("setup");
    } catch {
      onFailed();
    }
    setIsSwitchingOn(false);
  }

  function toLogin(): void {
    navigate(SIDE_ROUTES[side].login);
  }

  return (
    <>
      <Dialog
        isOpen={open === "switchOn"}
        title={TEXT.switchOnTitle}
        onClose={() => {
          onOpen("none");
        }}
        footer={
          <>
            <Button
              onClick={() => {
                onOpen("none");
              }}
            >
              {TEXT.cancel}
            </Button>
            <Button
              variant="primary"
              isLoading={isSwitchingOn}
              loadingLabel={TEXT.switchingOn}
              onClick={() => void switchOn()}
            >
              {TEXT.switchOnConfirm}
            </Button>
          </>
        }
      >
        <p>{TEXT.switchOnBody}</p>
      </Dialog>
      {/* Signed out already: closing leaves setup for the next login. */}
      <Dialog isOpen={open === "setup"} title={TEXT.setupTitle} onClose={toLogin}>
        <TwoFactorSetup
          side={side}
          showsTitle={false}
          onDone={() => {
            navigate(SIDE_ROUTES[side].afterSetup);
          }}
          onStartAgain={toLogin}
        />
      </Dialog>
    </>
  );
}
