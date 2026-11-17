import { Pager } from "@/components/ui/Pager";
import { LABELS } from "@/constants/messages";

type StudentPagerProps = {
  count: number;
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
};

/** How many Students match, and Previous / Next when they don't fit on one page. */
export function StudentPager(props: StudentPagerProps) {
  return <Pager summary={LABELS.studentCount(props.count)} {...props} />;
}
