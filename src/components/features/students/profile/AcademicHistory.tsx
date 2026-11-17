import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { LABELS, MESSAGES } from "@/constants/messages";
import { QUALIFICATION_LABELS } from "@/constants/students";
import type { AcademicRecord } from "@/lib/api";

/** The Student's qualifications, only shown: they're changed on the Edit details page. */
export function AcademicHistory({ records }: { records: readonly AcademicRecord[] }) {
  return (
    <Section title={LABELS.academicHistory}>
      <Panel>
        {records.length === 0 ? (
          <EmptyState>{MESSAGES.noQualifications}</EmptyState>
        ) : (
          <RowList>
            {records.map((record) => (
              <RowItem
                key={record.id}
                title={record.institution}
                meta={recordMeta(record).map((part) => (
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

function recordMeta(record: AcademicRecord): string[] {
  const year = record.finishedYear === null ? "" : LABELS.finishedIn(record.finishedYear);
  return [QUALIFICATION_LABELS[record.level], year, record.result].filter((part) => part !== "");
}
