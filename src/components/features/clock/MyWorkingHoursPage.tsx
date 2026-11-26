"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import { CLOCK_TAB_PARAM, CLOCK_TEXT as TEXT, ClockTab } from "@/constants/clock";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import { clockTabFrom } from "@/lib/clock";
import { formatMonth, todayIso } from "@/lib/dates";

import { MonthPicker } from "./MonthPicker";
import { MonthView } from "./MonthView";
import { MyWorkFromHome } from "./MyWorkFromHome";
import { useClockMonth } from "./useClockMonth";

const MONTH_LENGTH = 7;

const TAB_LABELS: Record<ClockTab, string> = {
  [ClockTab.Hours]: TEXT.hoursTab,
  [ClockTab.WorkFromHome]: WORK_FROM_HOME_TEXT.tab,
};

type MyWorkingHoursPageProps = {
  /** The tab the address asks for (`/clock?tab=wfh`), checked before use; none is my hours. */
  askedTab?: string | null;
};

/**
 * Working hours (spec 106, 132; UI revamp 16), opened from My working hours in your menu, for
 * every Role while Clock-in is on: my own month as a calendar or a list, and (everyone but
 * Admins, who clock in from any network and never ask) my Work From Home dates on a tab of their
 * own. A Platform Admin is not Staff, so has no month of their own: they see everyone's in
 * Employees.
 */
export function MyWorkingHoursPage({ askedTab = null }: MyWorkingHoursPageProps) {
  const { modules, supportAccess } = useCurrentStaff();
  if (!modules.includes(Module.ClockIn)) {
    return (
      <Panel>
        <EmptyState action={<ButtonLink href={ROUTES.home}>{LABELS.goHome}</ButtonLink>}>
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  if (supportAccess !== null) {
    return (
      <Panel>
        <EmptyState
          action={<ButtonLink href={ROUTES.workingHours}>{TEXT.everyonesHours}</ButtonLink>}
        >
          {MESSAGES.notAvailable}
        </EmptyState>
      </Panel>
    );
  }
  return <MyPage askedTab={askedTab} />;
}

const STAFF_TABS = [ClockTab.Hours, ClockTab.WorkFromHome] as const;
const ADMIN_TABS = [ClockTab.Hours] as const;

function MyPage({ askedTab }: { askedTab: string | null }) {
  const { staff } = useCurrentStaff();
  const isAdmin = staff.role === Role.Admin;
  const tabs = isAdmin ? ADMIN_TABS : STAFF_TABS;
  const [tab, setTab] = useClockTab(askedTab, tabs);
  const [month, setMonth] = useState(() => todayIso().slice(0, MONTH_LENGTH));
  const [listPage, setListPage] = useState(1);
  const [isAsking, setIsAsking] = useState(false);
  const isHours = tab === ClockTab.Hours;

  const body = isHours ? (
    <MyMonth month={month} listPage={listPage} onListPage={setListPage} />
  ) : (
    <MyWorkFromHome
      isAsking={isAsking}
      onAskingDone={() => {
        setIsAsking(false);
      }}
    />
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title={TEXT.pageTitle}
        subtitle={isHours ? TEXT.myHoursIntro(formatMonth(month)) : TEXT.workFromHomeIntro}
        crumbs={<CrumbHome />}
        actions={
          isHours ? (
            <HoursActions
              month={month}
              isAdmin={isAdmin}
              onMonth={(next) => {
                setMonth(next);
                setListPage(1);
              }}
            />
          ) : (
            <Button
              variant="primary"
              icon="plus"
              onClick={() => {
                setIsAsking(true);
              }}
            >
              {WORK_FROM_HOME_TEXT.askForDates}
            </Button>
          )
        }
      />
      <TabStrip tabs={tabs} tab={tab} onSelect={setTab}>
        {body}
      </TabStrip>
    </div>
  );
}

type TabStripProps = {
  tabs: readonly ClockTab[];
  tab: ClockTab;
  onSelect: (tab: ClockTab) => void;
  children: ReactNode;
};

/** The page's tabs. One tab is no choice: an Admin sees their hours with no strip above them. */
function TabStrip({ tabs, tab, onSelect, children }: TabStripProps) {
  if (tabs.length === 1) return children;
  return (
    <Tabs
      label={TEXT.tabsLabel}
      tabs={tabs.map((id) => ({ id, label: TAB_LABELS[id] }))}
      selected={tab}
      onSelect={(id) => {
        onSelect(clockTabFrom(id, tabs));
      }}
    >
      {children}
    </Tabs>
  );
}

type HoursActionsProps = { month: string; isAdmin: boolean; onMonth: (month: string) => void };

/** Beside the title on my hours: the month, and for an Admin the way to everyone's hours. */
function HoursActions({ month, isAdmin, onMonth }: HoursActionsProps) {
  return (
    <>
      <MonthPicker value={month} onChange={onMonth} />
      {isAdmin && (
        <ButtonLink href={ROUTES.workingHours} icon="badge">
          {TEXT.everyonesHours}
        </ButtonLink>
      )}
    </>
  );
}

/**
 * The tab shown: the one the address asks for when the page opens, and again whenever the address
 * changes (a work-from-home answer opened from the bell while the page is already up). Choosing a
 * tab switches at once and only notes it in the address, so the page never moves (rule 8).
 */
function useClockTab(
  asked: string | null,
  tabs: readonly ClockTab[],
): [ClockTab, (tab: ClockTab) => void] {
  const [seen, setSeen] = useState(asked);
  const [tab, setTab] = useState(() => clockTabFrom(asked, tabs));
  if (asked !== seen) {
    setSeen(asked);
    setTab(clockTabFrom(asked, tabs));
  }
  return [
    tab,
    (next) => {
      setTab(next);
      keepTabInAddress(next);
    },
  ];
}

/** Keep the tab in the address without navigating, so a reload opens the same tab. */
function keepTabInAddress(tab: ClockTab): void {
  const url = new URL(window.location.href);
  if (tab === ClockTab.Hours) url.searchParams.delete(CLOCK_TAB_PARAM);
  else url.searchParams.set(CLOCK_TAB_PARAM, tab);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

type MyMonthProps = { month: string; listPage: number; onListPage: (page: number) => void };

function MyMonth({ month, listPage, onListPage }: MyMonthProps) {
  const { state } = useClockMonth(month, null);
  if (state.status === "loading") return <p className="text-ink-2">{TEXT.monthLoading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.monthFailed}</Banner>;
  return <MonthView month={state.month} listPage={listPage} onListPage={onListPage} />;
}

function CrumbHome() {
  return (
    <Link
      href={ROUTES.home}
      className="text-secondary text-ink-2 min-h-control inline-flex items-center gap-1.5 self-start"
    >
      <Icon name="left" />
      {TEXT.home}
    </Link>
  );
}
