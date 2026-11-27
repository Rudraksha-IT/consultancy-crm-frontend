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
import { CLOCK_TAB_PARAM, CLOCK_TEXT as TEXT, ClockTab, HOLIDAY_TEXT } from "@/constants/clock";
import { LABELS, MESSAGES } from "@/constants/messages";
import { Module } from "@/constants/modules";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { WORK_FROM_HOME_TEXT } from "@/constants/workFromHome";
import { clockTabFrom } from "@/lib/clock";
import { formatMonth, todayIso } from "@/lib/dates";

import { MonthView } from "./MonthView";
import { MyHolidays } from "./MyHolidays";
import { MyWorkFromHome } from "./MyWorkFromHome";
import { useClockMonth } from "./useClockMonth";

const MONTH_LENGTH = 7;

const TAB_LABELS: Record<ClockTab, string> = {
  [ClockTab.Hours]: TEXT.hoursTab,
  [ClockTab.WorkFromHome]: WORK_FROM_HOME_TEXT.tab,
  [ClockTab.Holidays]: HOLIDAY_TEXT.tab,
};

type MyWorkingHoursPageProps = {
  /** The tab the address asks for (`/clock?tab=wfh`), checked before use; none is my hours. */
  askedTab?: string | null;
};

/**
 * Working hours (spec 106, 132; UI revamp 16), opened from My working hours in your menu, for
 * every Role while Clock-in is on: my own month as a calendar or a list, and (everyone but
 * Admins, who clock in from any network and never ask) my Work From Home dates on a tab of their
 * own, and the office's holidays for everyone (UI revamp 17). A Platform Admin is not Staff, so has no month of their own: they see everyone's in
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

const STAFF_TABS = [ClockTab.Hours, ClockTab.WorkFromHome, ClockTab.Holidays] as const;
const ADMIN_TABS = [ClockTab.Hours, ClockTab.Holidays] as const;

function MyPage({ askedTab }: { askedTab: string | null }) {
  const { staff } = useCurrentStaff();
  const isAdmin = staff.role === Role.Admin;
  const tabs = isAdmin ? ADMIN_TABS : STAFF_TABS;
  const [tab, setTab] = useClockTab(askedTab, tabs);
  const [month, setMonth] = useState(() => todayIso().slice(0, MONTH_LENGTH));
  const [isAsking, setIsAsking] = useState(false);
  const onAskingDone = (): void => {
    setIsAsking(false);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title={TEXT.pageTitle}
        subtitle={subtitleOf(tab, month)}
        crumbs={<CrumbHome />}
        actions={
          <TabActions
            tab={tab}
            isAdmin={isAdmin}
            onAsk={() => {
              setIsAsking(true);
            }}
          />
        }
      />
      <TabStrip tabs={tabs} tab={tab} onSelect={setTab}>
        {tab === ClockTab.Hours && <MyMonth month={month} onMonth={setMonth} />}
        {tab === ClockTab.WorkFromHome && (
          <MyWorkFromHome isAsking={isAsking} onAskingDone={onAskingDone} />
        )}
        {tab === ClockTab.Holidays && <MyHolidays />}
      </TabStrip>
    </div>
  );
}

/** The small line under the title says what the open tab shows. */
function subtitleOf(tab: ClockTab, month: string): string {
  if (tab === ClockTab.Hours) return TEXT.myHoursIntro(formatMonth(month));
  return tab === ClockTab.WorkFromHome ? TEXT.workFromHomeIntro : HOLIDAY_TEXT.intro;
}

type TabActionsProps = { tab: ClockTab; isAdmin: boolean; onAsk: () => void };

/**
 * Beside the title: for an Admin the way to everyone's hours on my hours, "Ask for dates" on Work
 * from home, and on Holidays the Admin's way to change them (Configuration → Working hours);
 * other Roles only read them. The month is chosen above the month itself (`MonthView`).
 */
function TabActions({ tab, isAdmin, onAsk }: TabActionsProps) {
  if (tab === ClockTab.Hours) return <HoursActions isAdmin={isAdmin} />;
  if (tab === ClockTab.WorkFromHome) {
    return (
      <Button variant="primary" icon="plus" onClick={onAsk}>
        {WORK_FROM_HOME_TEXT.askForDates}
      </Button>
    );
  }
  if (!isAdmin) return null;
  return (
    <ButtonLink href={ROUTES.configurationWorkingHours} icon="edit">
      {HOLIDAY_TEXT.change}
    </ButtonLink>
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

/** Beside the title on my hours: for an Admin, the way to everyone's hours. */
function HoursActions({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) return null;
  return (
    <ButtonLink href={ROUTES.workingHours} icon="badge">
      {TEXT.everyonesHours}
    </ButtonLink>
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

type MyMonthProps = { month: string; onMonth: (month: string) => void };

/** My month, with the month's name between two arrows above it. */
function MyMonth({ month, onMonth }: MyMonthProps) {
  const { state } = useClockMonth(month, null);
  if (state.status === "loading") return <p className="text-ink-2">{TEXT.monthLoading}</p>;
  if (state.status === "failed") return <Banner tone="problem">{TEXT.monthFailed}</Banner>;
  return <MonthView month={state.month} stepper={{ chosen: month, onMonth }} />;
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
