"use client";

import { useState } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { FigureTile } from "@/components/ui/FigureTile";
import { TileGrid } from "@/components/ui/TileGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { TabsRow } from "@/components/ui/TabsRow";
import { Pager } from "@/components/ui/Pager";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Loading } from "@/components/ui/Loading";
import { BIN_TEXT, DOCUMENT_TEXT, PaperworkScope } from "@/constants/documents";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import type { PaperworkCounts, PaperworkPage, PaperworkRow } from "@/lib/api";

import { BinTab } from "./BinTab";
import { ChecklistDialog } from "./ChecklistDialog";
import { PaperworkList } from "./PaperworkList";
import { useBin } from "./useBin";
import { usePaperwork } from "./usePaperwork";

const SCOPE_OPTIONS = [
  { value: PaperworkScope.Mine, label: DOCUMENT_TEXT.mine },
  { value: PaperworkScope.Everyone, label: DOCUMENT_TEXT.everyone },
] as const;

/** The Documents page's views: Students, or (Admins) the Bin. */
export type DocumentsTab = "students" | "bin";

type DocumentsPageProps = {
  /** Only Students with a document waiting to be checked (the Home's link, issue 52). */
  initialOnlyWaiting?: boolean;
  /** The view to open on; the Bin only for Admins (issue 79). */
  initialTab?: DocumentsTab;
};

/**
 * Every Student's paperwork, those needing most attention first (spec 64a). Counsellors start on
 * their own Students and can switch to everyone; Admins see everyone.
 */
export function DocumentsPage({
  initialOnlyWaiting = false,
  initialTab = "students",
}: DocumentsPageProps) {
  const { staff } = useCurrentStaff();
  if (staff.role === Role.Admin) {
    return <AdminDocuments initialTab={initialTab} onlyWaiting={initialOnlyWaiting} />;
  }
  if (staff.role === Role.Counsellor) {
    return <Paperwork isCounsellor onlyWaiting={initialOnlyWaiting} />;
  }
  return (
    <Panel>
      <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
        {MESSAGES.notAvailable}
      </EmptyState>
    </Panel>
  );
}

type AdminDocumentsProps = { initialTab: DocumentsTab; onlyWaiting: boolean };

/** An Admin switches between every Student's paperwork and the Bin (issue 79). */
function AdminDocuments({ initialTab, onlyWaiting }: AdminDocumentsProps) {
  const [tab, setTab] = useState<DocumentsTab>(initialTab);
  const [binPage, setBinPage] = useState(1);
  const [binVersion, setBinVersion] = useState(0);
  const bin = useBin(binPage, binVersion);
  const binCount = bin.status === "loaded" ? bin.page.count : 0;
  const tabs = (
    <SegmentedControl
      label={BIN_TEXT.tabs}
      size="lg"
      options={[
        { value: "students", label: BIN_TEXT.tabStudents },
        { value: "bin", label: BIN_TEXT.tabBin, count: binCount },
      ]}
      value={tab}
      onChange={setTab}
    />
  );
  if (tab === "students") {
    return <Paperwork isCounsellor={false} onlyWaiting={onlyWaiting} tabs={tabs} />;
  }
  return (
    <div className="grid gap-8">
      <PageHeader title={DOCUMENT_TEXT.pageTitle} subtitle={DOCUMENT_TEXT.pageIntro} />
      <TabsRow tabs={tabs} note={BIN_TEXT.binIntro} />
      <BinTab
        state={bin}
        onPage={setBinPage}
        onChanged={() => {
          setBinVersion((current) => current + 1);
        }}
      />
    </div>
  );
}

type PaperworkProps = {
  isCounsellor: boolean;
  onlyWaiting: boolean;
  /** The Admin's switch to the Bin, under the title. */
  tabs?: React.ReactNode;
};

function Paperwork({ isCounsellor, onlyWaiting, tabs }: PaperworkProps) {
  const [scope, setScope] = useState<PaperworkScope>(
    isCounsellor ? PaperworkScope.Mine : PaperworkScope.Everyone,
  );
  const [page, setPage] = useState(1);
  // Bumped when a checklist dialog closes, so uploads made in it show in the counts.
  const [version, setVersion] = useState(0);
  const [open, setOpen] = useState<PaperworkRow | null>(null);
  const state = usePaperwork({ scope, page, onlyWaiting }, version);

  return (
    <div className="grid gap-8">
      <PageHeader title={DOCUMENT_TEXT.pageTitle} subtitle={DOCUMENT_TEXT.pageIntro} />
      {tabs}
      {onlyWaiting && (
        <Banner
          tone="info"
          icon="file"
          action={
            <ButtonLink href={ROUTES.documents} size="sm">
              {DOCUMENT_TEXT.showEveryone}
            </ButtonLink>
          }
        >
          {DOCUMENT_TEXT.onlyWaiting}
        </Banner>
      )}
      {isCounsellor && (
        <SegmentedControl
          label={DOCUMENT_TEXT.whose}
          size="lg"
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={(chosen) => {
            setScope(chosen);
            setPage(1);
          }}
        />
      )}
      <PaperworkContent
        state={state}
        showsCounsellor={scope === PaperworkScope.Everyone}
        onOpen={setOpen}
        onPage={setPage}
      />
      {open !== null && (
        <ChecklistDialog
          student={open.student}
          onClose={() => {
            setOpen(null);
            setVersion((current) => current + 1);
          }}
        />
      )}
    </div>
  );
}

type PaperworkContentProps = {
  state: ReturnType<typeof usePaperwork>;
  showsCounsellor: boolean;
  onOpen: (row: PaperworkRow) => void;
  onPage: (page: number) => void;
};

function PaperworkContent({ state, showsCounsellor, onOpen, onPage }: PaperworkContentProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{DOCUMENT_TEXT.pageFailed}</Banner>;
  const { page } = state;
  return (
    <>
      <Tiles totals={page.totals} />
      <Panel>
        {page.rows.length === 0 ? (
          <EmptyState>{DOCUMENT_TEXT.noStudents}</EmptyState>
        ) : (
          <PaperworkList rows={page.rows} showsCounsellor={showsCounsellor} onOpen={onOpen} />
        )}
        <PaperworkPager page={page} onPage={onPage} />
      </Panel>
    </>
  );
}

function Tiles({ totals }: { totals: PaperworkCounts }) {
  return (
    <TileGrid columns={4}>
      <FigureTile label={DOCUMENT_TEXT.tileRejected} value={totals.rejected} />
      <FigureTile label={DOCUMENT_TEXT.tileWaiting} value={totals.waiting} />
      <FigureTile label={DOCUMENT_TEXT.tileMissing} value={totals.missing} />
      <FigureTile label={DOCUMENT_TEXT.tileVerified} value={totals.verified} />
    </TileGrid>
  );
}

function PaperworkPager({ page, onPage }: { page: PaperworkPage; onPage: (page: number) => void }) {
  return (
    <Pager
      summary={DOCUMENT_TEXT.studentsCount(page.count)}
      count={page.count}
      page={page.page}
      pageSize={page.pageSize}
      onPage={onPage}
    />
  );
}
