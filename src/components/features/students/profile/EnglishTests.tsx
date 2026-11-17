"use client";

import { useDates, type Dates } from "@/components/features/shell/dateDisplay";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { LABELS, MESSAGES } from "@/constants/messages";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import { ENGLISH_TEST_LABELS } from "@/constants/students";
import type { TestScore } from "@/lib/api";

/** The Student's English test results, only shown: they're changed on the Edit details page. */
export function EnglishTests({ scores }: { scores: readonly TestScore[] }) {
  const dates = useDates();
  return (
    <Section title={PROFILE_TEXT.testScores}>
      <Panel>
        {scores.length === 0 ? (
          <EmptyState>{MESSAGES.noTestScores}</EmptyState>
        ) : (
          <RowList>
            {scores.map((score) => (
              <RowItem
                key={score.id}
                title={<span className="tabular-nums">{scoreName(score)}</span>}
                meta={scoreMeta(score, dates).map((part) => (
                  <span key={part}>{part}</span>
                ))}
              />
            ))}
          </RowList>
        )}
      </Panel>
    </Section>
  );
}

function scoreName(score: TestScore): string {
  return LABELS.testScore(ENGLISH_TEST_LABELS[score.test], score.overall);
}

function scoreMeta(score: TestScore, dates: Dates): string[] {
  const taken = score.takenOn === null ? "" : LABELS.takenOnDate(dates.date(score.takenOn));
  return [taken, score.details].filter((part) => part !== "");
}
