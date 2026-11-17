"use client";

import { useState } from "react";

import { useSetPageSwipe } from "@/components/features/shell/pageSwipe";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Banner } from "@/components/ui/Banner";
import { Panel } from "@/components/ui/Panel";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/useToast";
import { PAGE_SWIPE_TEXT as TEXT } from "@/constants/dates";
import { savePageSwipe } from "@/lib/api";

/**
 * Settings → Preferences (asked 2026-11-17): Swipe between pages, each person's own choice on
 * every device they use. Moved here from Configuration, where it was one switch for the office.
 * Off at first, because ordinary scrolling changed pages by accident; saved as soon as switched.
 */
export function PreferencesSection() {
  const { pageSwipe } = useCurrentStaff();
  const setPageSwipe = useSetPageSwipe();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  async function choose(isOn: boolean): Promise<void> {
    setError(null);
    try {
      const saved = (await savePageSwipe(isOn)).pageSwipe;
      setPageSwipe(saved);
      showToast(TEXT.saved(saved));
    } catch {
      setError(TEXT.saveFailed);
    }
  }

  return (
    <div role="group" aria-label={TEXT.title} className="grid gap-4">
      <Panel isPadded>
        <div className="grid gap-4">
          <Switch
            label={TEXT.switchLabel}
            description={TEXT.switchDescription}
            isOn={pageSwipe === true}
            onChange={(isOn) => {
              void choose(isOn);
            }}
          />
          {/* Inside the box, in small letters (asked 2026-11-17). */}
          <p className="text-small text-ink-2">{TEXT.help}</p>
          {error !== null && <Banner tone="problem">{error}</Banner>}
        </div>
      </Panel>
    </div>
  );
}
