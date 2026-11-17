import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { PROFILE_TEXT } from "@/constants/studentProfile";
import type { StudentProfile, WorkExperience } from "@/lib/api";
import { formatIntake } from "@/lib/dates";

/** The Student's jobs, newest first, only shown: they're changed on the Edit details page. */
export function WorkExperienceSection({ profile }: { profile: StudentProfile }) {
  const jobs = profile.workExperience;
  return (
    <Section title={PROFILE_TEXT.workExperience}>
      <Panel>
        {jobs.length === 0 ? (
          <EmptyState>{emptyText(profile.previousJob)}</EmptyState>
        ) : (
          <RowList>
            {jobs.map((job) => (
              <RowItem
                key={job.id}
                title={job.jobTitle}
                meta={[
                  <span key="employer">{job.employer}</span>,
                  <span key="months">{months(job)}</span>,
                ]}
              />
            ))}
          </RowList>
        )}
      </Panel>
    </Section>
  );
}

/** "Apr 2024 to Sep 2025", or "... to now, still working here". */
function months(job: WorkExperience): string {
  const to = job.endedOn === null ? PROFILE_TEXT.stillThere : formatIntake(job.endedOn);
  return PROFILE_TEXT.monthsWorked(formatIntake(job.startedOn), to);
}

/** What Front Desk noted as their previous job, if anything, invites adding it with dates. */
function emptyText(previousJob: string): string {
  return previousJob === ""
    ? PROFILE_TEXT.noWorkExperience
    : PROFILE_TEXT.frontDeskNoted(previousJob);
}
