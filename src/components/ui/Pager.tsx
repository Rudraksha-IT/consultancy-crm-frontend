import { Button } from "@/components/ui/Button";
import { LABELS } from "@/constants/messages";

type PagerProps = {
  /** How many match, e.g. "30 Students". */
  summary: string;
  /** An optional line explaining the list, beside the summary. */
  note?: string;
  count: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
};

/** The foot of a paginated panel: how many match, and Previous / Next when they don't fit. */
export function Pager({ summary, note, count, page, pageSize, onPage }: PagerProps) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="border-rule bg-fill text-secondary text-ink-2 flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3">
      <span>{summary}</span>
      {note !== undefined && <span>{note}</span>}
      {pages > 1 && (
        <nav aria-label={LABELS.pages} className="flex flex-wrap items-center gap-3">
          <span>{LABELS.pageOf(page, pages)}</span>
          <Button
            icon="left"
            isDisabled={page <= 1}
            onClick={() => {
              onPage(page - 1);
            }}
          >
            {LABELS.previousPage}
          </Button>
          <Button
            icon="right"
            isDisabled={page >= pages}
            onClick={() => {
              onPage(page + 1);
            }}
          >
            {LABELS.nextPage}
          </Button>
        </nav>
      )}
    </div>
  );
}
