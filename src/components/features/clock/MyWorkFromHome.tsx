"use client";

import { Banner } from "@/components/ui/Banner";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { WORK_FROM_HOME_TEXT as TEXT } from "@/constants/workFromHome";
import { fetchMyWorkFromHome, type WorkFromHomeDates } from "@/lib/api";

import { AskWorkFromHomeDialog } from "./AskWorkFromHomeDialog";
import { useWorkFromHome } from "./useWorkFromHome";
import { WorkFromHomeRows } from "./WorkFromHomeRows";

type MyWorkFromHomeProps = {
  /** "Ask for dates" (the page's main action, beside its title) was pressed. */
  isAsking: boolean;
  /** The popup closed, sent or not. */
  onAskingDone: () => void;
};

/**
 * The Work from home tab of Working hours (spec 132; UI revamp 16): my dates, each with its
 * status, and cancelling one still waiting. Asking for dates opens from the page's title line.
 * Not shown to Admins, who clock in from any network.
 */
export function MyWorkFromHome({ isAsking, onAskingDone }: MyWorkFromHomeProps) {
  const { state, changed } = useWorkFromHome(fetchMyWorkFromHome);
  return (
    <>
      <MyDates state={state} onChanged={changed} />
      {/* The popup opens at once, even while my dates are still loading. */}
      {isAsking && (
        <AskWorkFromHomeDialog
          onClose={onAskingDone}
          onSent={(sent) => {
            onAskingDone();
            changed(sent);
          }}
        />
      )}
    </>
  );
}

type Mine = Awaited<ReturnType<typeof fetchMyWorkFromHome>>;

type MyDatesProps = {
  state: { status: "loading" } | { status: "failed" } | { status: "loaded"; data: Mine };
  onChanged: (dates: WorkFromHomeDates) => void;
};

function MyDates({ state, onChanged }: MyDatesProps) {
  if (state.status === "loading") return null;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.loadFailed}</Banner>;
  if (!state.data.canAsk) return null;
  return (
    <Panel>
      <WorkFromHomeRows dates={state.data.dates} isAdmin={false} onChanged={onChanged} />
      <PanelFoot>{TEXT.myFoot}</PanelFoot>
    </Panel>
  );
}
