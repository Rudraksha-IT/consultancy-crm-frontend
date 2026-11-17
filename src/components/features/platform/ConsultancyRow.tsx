import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { RowItem } from "@/components/ui/RowItem";
import {
  ADMIN_TEXT,
  ConsultancyStatus,
  SETUP_TEXT,
  SetupState,
  STATUS_TEXT,
} from "@/constants/consultancyStatus";
import { LABELS, MESSAGES } from "@/constants/messages";
import { FEATURES, isSwitchable } from "@/constants/modules";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import type { ConsultancyOverview } from "@/lib/api";

import { ConsultancyStatusChip } from "./ConsultancyStatusChip";
import { SetupStateChip } from "./SetupStateChip";

type ConsultancyRowProps = {
  consultancy: ConsultancyOverview;
  onChangeStatus: (consultancy: ConsultancyOverview) => void;
  onOpenFeatures: (consultancy: ConsultancyOverview) => void;
  onOpenOffice: (consultancy: ConsultancyOverview) => void;
  onChooseColours: (consultancy: ConsultancyOverview) => void;
  /** Add admin: invite an Admin into this office (issue 64). */
  onAddAdmin: (consultancy: ConsultancyOverview) => void;
  /** Try again for an office whose setup failed; settles once the API has answered. */
  onTryAgain: (consultancy: ConsultancyOverview) => Promise<void>;
};

/**
 * One Consultancy in the Platform list: its Status, extra features and actions. A Terminated
 * one is final, so it keeps only its Status. One still being set up, or whose setup failed,
 * shows that instead, with its actions switched off until it is ready (issue 60). On a phone the
 * feature chips are dropped (they are in Features) and the buttons sit in a two-column grid.
 */
export function ConsultancyRow(props: ConsultancyRowProps) {
  const { consultancy } = props;
  const isTerminated = consultancy.status === ConsultancyStatus.Terminated;
  const isReady = consultancy.setupState === SetupState.Ready;
  return (
    <RowItem
      title={
        <span className="flex flex-wrap items-center gap-3">
          {consultancy.name}
          {consultancy.setupState === SetupState.Ready ? (
            <ConsultancyStatusChip consultancy={consultancy} />
          ) : (
            <SetupStateChip state={consultancy.setupState} />
          )}
        </span>
      }
      meta={
        <span>
          {consultancy.host}
          {!isReady && <span className="block">{SETUP_TEXT.notReadyHint}</span>}
        </span>
      }
      right={!isTerminated && <RowActions {...props} />}
    >
      {!isTerminated && <FeatureChips consultancy={consultancy} />}
    </RowItem>
  );
}

/** The row's actions; every one but Try again waits until the office is set up. */
function RowActions({
  consultancy,
  onChangeStatus,
  onOpenFeatures,
  onOpenOffice,
  onChooseColours,
  onAddAdmin,
  onTryAgain,
}: ConsultancyRowProps) {
  const isReady = consultancy.setupState === SetupState.Ready;
  return (
    <span className="max-phone:grid max-phone:w-full max-phone:grid-cols-2 max-phone:gap-2 max-phone:*:w-full max-phone:*:min-w-0 max-phone:*:whitespace-normal flex flex-wrap gap-3">
      {consultancy.setupState === SetupState.Failed && (
        <TryAgainButton onTryAgain={() => onTryAgain(consultancy)} />
      )}
      <Button
        icon="userplus"
        isDisabled={!isReady}
        onClick={() => {
          onAddAdmin(consultancy);
        }}
      >
        {ADMIN_TEXT.addAdmin}
      </Button>
      <Button
        icon="sliders"
        isDisabled={!isReady}
        onClick={() => {
          onOpenFeatures(consultancy);
        }}
      >
        {LABELS.features}
      </Button>
      <Button
        icon="palette"
        isDisabled={!isReady}
        onClick={() => {
          onChooseColours(consultancy);
        }}
      >
        {LABELS.colours}
      </Button>
      <Button
        icon="shield"
        isDisabled={!isReady}
        onClick={() => {
          onOpenOffice(consultancy);
        }}
      >
        {SUPPORT_TEXT.open}
      </Button>
      <Button
        variant="ghost"
        isDisabled={!isReady}
        onClick={() => {
          onChangeStatus(consultancy);
        }}
      >
        {STATUS_TEXT.changeStatus}
      </Button>
    </span>
  );
}

function TryAgainButton({ onTryAgain }: { onTryAgain: () => Promise<void> }) {
  const [isSending, setIsSending] = useState(false);
  return (
    <Button
      variant="primary"
      isLoading={isSending}
      loadingLabel={SETUP_TEXT.tryingAgain}
      onClick={() => {
        setIsSending(true);
        void onTryAgain().finally(() => {
          setIsSending(false);
        });
      }}
    >
      {SETUP_TEXT.tryAgain}
    </Button>
  );
}

function FeatureChips({ consultancy }: { consultancy: ConsultancyOverview }) {
  const features = consultancy.modules.filter(isSwitchable);
  if (features.length === 0) {
    return (
      <p className="text-small text-ink-2 max-phone:hidden mt-2">{MESSAGES.onlyStandardFeatures}</p>
    );
  }
  return (
    <ul aria-label={LABELS.featuresOn} className="max-phone:hidden mt-2 flex flex-wrap gap-2">
      {features.map((module) => (
        <li key={module}>
          <Chip tone="accent" hasDot={false}>
            {FEATURES[module].label}
          </Chip>
        </li>
      ))}
    </ul>
  );
}
