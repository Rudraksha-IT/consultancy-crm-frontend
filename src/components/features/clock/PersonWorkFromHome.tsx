"use client";

import type { RecordId } from "@/lib/recordId";
import { useCallback, useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/useToast";
import { WORK_FROM_HOME_TEXT as TEXT } from "@/constants/workFromHome";
import { fetchPersonWorkFromHome, setWorkFromHome } from "@/lib/api";

import { useWorkFromHome } from "./useWorkFromHome";
import { WorkFromHomeDialog } from "./WorkFromHomeDialog";
import { WorkFromHomeRows } from "./WorkFromHomeRows";
import { firstName } from "./workFromHomeFailure";

type PersonWorkFromHomeProps = { staffId: RecordId };

/**
 * One employee's Work From Home dates, for Admins (spec 133): approve or decline a request, set
 * dates directly, or end them. An Admin never needs any.
 */
export function PersonWorkFromHome({ staffId }: PersonWorkFromHomeProps) {
  const load = useCallback(() => fetchPersonWorkFromHome(staffId), [staffId]);
  const { state, changed } = useWorkFromHome(load);
  const [isSetting, setIsSetting] = useState(false);
  const { showToast } = useToast();
  if (state.status === "loading") return null;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.loadFailed}</Banner>;
  const { name } = state.data;
  if (!state.data.needsDates) {
    return (
      <Panel>
        <EmptyState>{TEXT.adminNeedsNone}</EmptyState>
      </Panel>
    );
  }
  return (
    <Section
      title={TEXT.title}
      aside={
        <Button
          icon="home"
          onClick={() => {
            setIsSetting(true);
          }}
        >
          {TEXT.setDates}
        </Button>
      }
    >
      <Panel>
        <WorkFromHomeRows dates={state.data.dates} isAdmin onChanged={changed} />
        <PanelFoot>{TEXT.personFoot(firstName(name))}</PanelFoot>
      </Panel>
      {isSetting && (
        <WorkFromHomeDialog
          title={TEXT.setTitle(name)}
          intro={TEXT.setIntro}
          saveLabel={TEXT.saveDates}
          onClose={() => {
            setIsSetting(false);
          }}
          onSave={async (wanted) => {
            const made = await setWorkFromHome(staffId, wanted);
            showToast(TEXT.datesSaved);
            setIsSetting(false);
            changed(made);
          }}
        />
      )}
    </Section>
  );
}
