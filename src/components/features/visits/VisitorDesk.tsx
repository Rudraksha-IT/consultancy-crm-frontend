"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { DeskMode, VISIT_TEXT } from "@/constants/visits";

import { NewVisitorPanel } from "./NewVisitorPanel";
import { ReturningVisitorPanel } from "./ReturningVisitorPanel";
import { TodaysVisitors } from "./TodaysVisitors";

const MODE_OPTIONS = [
  { value: DeskMode.New, label: VISIT_TEXT.newVisitor },
  { value: DeskMode.Returning, label: VISIT_TEXT.returningVisitor },
] as const;

/**
 * Front Desk's Home (spec 22a, 23-23b): a New visitor / Returning visitor switch over the matching
 * form, then today's Visits as a timeline, which reloads after each save.
 */
export function VisitorDesk() {
  const [mode, setMode] = useState<DeskMode>(DeskMode.New);
  const [version, setVersion] = useState(0);
  const reload = () => {
    setVersion((current) => current + 1);
  };

  return (
    <>
      <div className="grid gap-5">
        <SegmentedControl
          label={VISIT_TEXT.typeOfVisit}
          options={MODE_OPTIONS}
          value={mode}
          onChange={setMode}
          size="lg"
        />
        {mode === DeskMode.New ? (
          <NewVisitorPanel onSaved={reload} />
        ) : (
          <ReturningVisitorPanel onLogged={reload} />
        )}
      </div>
      <TodaysVisitors version={version} />
    </>
  );
}
