"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { PanelFoot } from "@/components/ui/PanelFoot";
import { Section } from "@/components/ui/Section";
import { WORK_FROM_HOME_TEXT as TEXT } from "@/constants/workFromHome";
import { fetchMyWorkFromHome } from "@/lib/api";

import { useWorkFromHome } from "./useWorkFromHome";
import { AskWorkFromHomeDialog } from "./AskWorkFromHomeDialog";
import { WorkFromHomeRows } from "./WorkFromHomeRows";

/**
 * My Work From Home dates on My working hours (spec 132): ask for dates, see each one's status,
 * and cancel one still waiting. Not shown to Admins, who clock in from any network.
 */
export function MyWorkFromHome() {
  const { state, changed } = useWorkFromHome(fetchMyWorkFromHome);
  const [isAsking, setIsAsking] = useState(false);
  if (state.status === "loading") return null;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.loadFailed}</Banner>;
  if (!state.data.canAsk) return null;
  return (
    <Section
      title={TEXT.title}
      aside={
        <Button
          icon="home"
          onClick={() => {
            setIsAsking(true);
          }}
        >
          {TEXT.askForDates}
        </Button>
      }
    >
      <Panel>
        <WorkFromHomeRows dates={state.data.dates} isAdmin={false} onChanged={changed} />
        <PanelFoot>{TEXT.myFoot}</PanelFoot>
      </Panel>
      {isAsking && (
        <AskWorkFromHomeDialog
          onClose={() => {
            setIsAsking(false);
          }}
          onSent={(sent) => {
            setIsAsking(false);
            changed(sent);
          }}
        />
      )}
    </Section>
  );
}
