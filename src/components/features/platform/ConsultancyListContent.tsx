import { EmptyState } from "@/components/ui/EmptyState";
import { Panel } from "@/components/ui/Panel";
import { RowList } from "@/components/ui/RowList";
import { MESSAGES } from "@/constants/messages";
import type { ConsultancyOverview } from "@/lib/api";

import { ConsultancyRow } from "./ConsultancyRow";
import type { ConsultancyListState } from "./useConsultancies";

type ConsultancyListContentProps = {
  list: ConsultancyListState;
  onChangeStatus: (consultancy: ConsultancyOverview) => void;
  /** Open its Configuration: Features, Colours and Admins (ticket 16). */
  onConfigure: (consultancy: ConsultancyOverview) => void;
  onOpenOffice: (consultancy: ConsultancyOverview) => void;
  onTryAgain: (consultancy: ConsultancyOverview) => Promise<void>;
};

/** The list's body: loading, failure, empty, or a row per Consultancy. */
export function ConsultancyListContent({
  list,
  onChangeStatus,
  onConfigure,
  onOpenOffice,
  onTryAgain,
}: ConsultancyListContentProps) {
  if (list.status === "loading") return <p className="text-ink-2">{MESSAGES.loading}</p>;
  if (list.status === "failed") {
    return (
      <p role="alert" className="text-bad font-semibold">
        {MESSAGES.consultanciesFailed}
      </p>
    );
  }
  return (
    <Panel>
      {list.consultancies.length === 0 ? (
        <EmptyState>{MESSAGES.noConsultancies}</EmptyState>
      ) : (
        <RowList>
          {list.consultancies.map((consultancy) => (
            <ConsultancyRow
              key={consultancy.id}
              consultancy={consultancy}
              onChangeStatus={onChangeStatus}
              onConfigure={onConfigure}
              onOpenOffice={onOpenOffice}
              onTryAgain={onTryAgain}
            />
          ))}
        </RowList>
      )}
    </Panel>
  );
}
