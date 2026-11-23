import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { RowItem } from "@/components/ui/RowItem";
import {
  ConsultancyStatus,
  SETUP_TEXT,
  SetupState,
  STATUS_TEXT,
} from "@/constants/consultancyStatus";
import { LABELS } from "@/constants/messages";
import { SUPPORT_TEXT } from "@/constants/supportAccess";
import type { ConsultancyOverview } from "@/lib/api";

import { ConsultancyStatusChip } from "./ConsultancyStatusChip";
import { SetupStateChip } from "./SetupStateChip";

type ConsultancyRowProps = {
  consultancy: ConsultancyOverview;
  onChangeStatus: (consultancy: ConsultancyOverview) => void;
  /** Its Configuration: Features, Colours and Admins (ticket 16). */
  onConfigure: (consultancy: ConsultancyOverview) => void;
  onOpenOffice: (consultancy: ConsultancyOverview) => void;
  /** Try again for an office whose setup failed; settles once the API has answered. */
  onTryAgain: (consultancy: ConsultancyOverview) => Promise<void>;
};

/**
 * One Consultancy in the Platform list: its Status and three actions, Configuration, Open office
 * and Change status (ticket 16: its Features are seen inside Configuration). A Terminated one is
 * final, so it keeps only its Status. One still being set up, or whose setup failed, shows that
 * instead, with its actions switched off until it is ready (issue 60). On a phone the buttons
 * sit in a grid.
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
    />
  );
}

/** The row's actions; every one but Try again waits until the office is set up. */
function RowActions({
  consultancy,
  onChangeStatus,
  onConfigure,
  onOpenOffice,
  onTryAgain,
}: ConsultancyRowProps) {
  const isReady = consultancy.setupState === SetupState.Ready;
  return (
    <span className="max-phone:grid max-phone:w-full max-phone:grid-cols-2 max-phone:gap-2 max-phone:*:w-full max-phone:*:min-w-0 max-phone:*:whitespace-normal flex flex-wrap gap-3">
      {consultancy.setupState === SetupState.Failed && (
        <TryAgainButton onTryAgain={() => onTryAgain(consultancy)} />
      )}
      <Button
        icon="sliders"
        isDisabled={!isReady}
        onClick={() => {
          onConfigure(consultancy);
        }}
      >
        {LABELS.configuration}
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
