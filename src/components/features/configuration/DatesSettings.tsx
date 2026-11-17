"use client";

import { useState } from "react";

import { useDates, useSetDateDisplay } from "@/components/features/shell/dateDisplay";
import { Banner } from "@/components/ui/Banner";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Section } from "@/components/ui/Section";
import { useToast } from "@/components/ui/useToast";
import { DATE_DISPLAY_LABELS, DATE_DISPLAYS, DATE_TEXT, type DateDisplay } from "@/constants/dates";
import { updateDateDisplay } from "@/lib/api";
import { todayIso } from "@/lib/dates";

const OPTIONS = DATE_DISPLAYS.map((value) => ({ value, label: DATE_DISPLAY_LABELS[value] }));

/** Configuration → Dates: AD or BS across the app, saved as soon as it is chosen (spec 100). */
export function DatesSettings() {
  const dates = useDates();
  const setDateDisplay = useSetDateDisplay();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  async function choose(display: DateDisplay): Promise<void> {
    if (display === dates.display) return;
    setError(null);
    try {
      const saved = await updateDateDisplay(display);
      setDateDisplay(saved);
      showToast(DATE_TEXT.saved(saved));
    } catch {
      setError(DATE_TEXT.saveFailed);
    }
  }

  return (
    <Section title={DATE_TEXT.dates}>
      <div className="grid gap-4">
        <p className="text-ink-2">{DATE_TEXT.datesHelp}</p>
        <Panel isPadded>
          <div className="grid gap-4">
            <SegmentedControl
              label={DATE_TEXT.dateDisplay}
              options={OPTIONS}
              value={dates.display}
              onChange={(display) => {
                void choose(display);
              }}
            />
            <p className="text-ink-2">
              {`${DATE_TEXT.todayShowsAs} `}
              <b className="text-ink">{dates.date(todayIso())}</b>.
            </p>
            {error !== null && <Banner tone="problem">{error}</Banner>}
          </div>
        </Panel>
      </div>
    </Section>
  );
}
