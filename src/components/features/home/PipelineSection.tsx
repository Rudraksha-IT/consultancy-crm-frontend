"use client";

import Link from "next/link";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Section } from "@/components/ui/Section";
import { StageCards } from "@/components/ui/StageCards";
import { HOME_TEXT } from "@/constants/home";
import { MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { ROUTES } from "@/constants/routes";
import type { Stage } from "@/constants/stages";
import { fetchPipeline } from "@/lib/api";

import { useLoaded } from "./useLoaded";

/** The Student list filtered to one Stage. */
export function studentsAtStage(stage: Stage): string {
  return `${ROUTES.students}?${new URLSearchParams({ stage }).toString()}`;
}

/**
 * Where everyone is now: a card per Stage with its count and share, and the Lost apart. With the
 * Reports Module on, "See charts" opens the Reports.
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
    <Section title={HOME_TEXT.pipeline} aside={charts}>
      {state.status === "loading" && <p className="text-ink-2">{MESSAGES.loading}</p>}
      {state.status === "failed" && <Banner tone="problem">{HOME_TEXT.pipelineFailed}</Banner>}
      {state.status === "loaded" && <StageCards counts={state.data} hrefFor={studentsAtStage} />}
    </Section>
  );
}
