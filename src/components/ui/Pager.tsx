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

/**
 * The foot of a paginated panel: how many match, and Previous / Next when they don't fit. On
 * phones how many match takes its own line, and "Page 1 of 3", Previous page and Next page stay
 * together on the next one, in a sheet or a popup (ticket 06).
 */
export function Pager({ summary, note, count, page, pageSize, onPage }: PagerProps) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="border-rule text-secondary text-ink-2 px-gutter flex flex-wrap items-center justify-between gap-3 border-t py-3">
      <span className="max-phone:basis-full">{summary}</span>
      {note !== undefined && <span>{note}</span>}
      {pages > 1 && (
        <nav
          aria-label={LABELS.pages}
          className="max-phone:w-full max-phone:flex-nowrap max-phone:gap-0.5 max-phone:[&>button]:gap-1 max-phone:[&>button]:px-1.5 max-phone:[&>button]:text-button-sm flex flex-wrap items-center gap-3"
        >
          <span className="max-phone:mr-auto whitespace-nowrap">{LABELS.pageOf(page, pages)}</span>
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
