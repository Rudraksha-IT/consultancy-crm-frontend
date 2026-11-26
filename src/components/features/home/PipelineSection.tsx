"use client";

import Link from "next/link";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Section } from "@/components/ui/Section";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { PipelineThread } from "@/components/ui/PipelineThread";
import { Loading } from "@/components/ui/Loading";
import { HOME_TEXT } from "@/constants/home";
import { Module } from "@/constants/modules";
import { ROUTES } from "@/constants/routes";
import { JOURNEY_STAGES, Stage } from "@/constants/stages";
import { fetchPipeline } from "@/lib/api";

import { useLoaded, type Loaded } from "./useLoaded";

/** The Student list filtered to one Stage. */
export function studentsAtStage(stage: Stage): string {
  return `${ROUTES.students}?${new URLSearchParams({ stage }).toString()}`;
}

/**
 * Where everyone is now (UI revamp 07): one thread of five beads, Lead to Visa, each with its
 * count and share; how many are in progress beside the heading; the Lost apart, as a quiet line
 * under the thread. With the Reports Module on, "See charts" opens the Reports.
 */
export function PipelineSection() {
  const state = useLoaded(fetchPipeline, 0);
  const { modules } = useCurrentStaff();
  const charts = modules.includes(Module.Reports) ? (
    <Link href={ROUTES.reports} className="min-h-control inline-flex items-center">
      {HOME_TEXT.seeCharts}
    </Link>
  ) : undefined;
  return (
    <Section
      title={HOME_TEXT.pipeline}
      titleAside={state.status === "loaded" && <InProgress counts={state.data} />}
      aside={charts}
    >
      <PipelineBody state={state} />
    </Section>
  );
}

function PipelineBody({ state }: { state: Loaded<Record<Stage, number>> }) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{HOME_TEXT.pipelineFailed}</Banner>;
  return (
    <Panel>
      <PipelineThread counts={state.data} hrefFor={studentsAtStage} />
      <LostLine count={state.data.lost} />
    </Panel>
  );
}

/** How many Students are on the thread, in quiet words beside the heading. */
function InProgress({ counts }: { counts: Record<Stage, number> }) {
  const inProgress = JOURNEY_STAGES.reduce((total, stage) => total + counts[stage], 0);
  return (
    <span className="text-secondary text-ink-3 max-phone:ml-1 ml-1.5">
      {HOME_TEXT.inProgress(inProgress)}
    </span>
  );
}

/** Lost Students are not on the thread: one quiet line opens them. */
function LostLine({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p className="border-rule px-gutter border-t">
      <Link
        href={studentsAtStage(Stage.Lost)}
        className="text-small text-ink-2 hover:text-accent min-h-control inline-flex items-center gap-1 no-underline"
      >
        {HOME_TEXT.lostLine(count)}
        <Icon name="right" size="sm" />
      </Link>
    </p>
  );
}
