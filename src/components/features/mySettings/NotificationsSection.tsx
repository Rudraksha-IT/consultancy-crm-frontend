"use client";

import { useState } from "react";

import { Banner } from "@/components/ui/Banner";
import { Panel } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/useToast";
import {
  MY_SETTINGS_TEXT as TEXT,
  NOTIFICATION_CHOICES,
  NOTIFICATION_LABELS,
  type NotificationChoice,
} from "@/constants/mySettings";
import { saveNotificationChoices, type MyDetails } from "@/lib/api";

type NotificationsSectionProps = {
  details: MyDetails;
  onSaved: (details: MyDetails) => void;
};

/** Which emails the app sends me (spec 22f). Each tick is saved as soon as it changes. */
export function NotificationsSection({ details, onSaved }: NotificationsSectionProps) {
  const { showToast } = useToast();
  const [choices, setChoices] = useState(details.notifications);
  const [problem, setProblem] = useState<string | null>(null);

  async function choose(choice: NotificationChoice, isOn: boolean): Promise<void> {
    const before = choices;
    setChoices({ ...choices, [choice]: isOn });
    setProblem(null);
    try {
      const saved = await saveNotificationChoices({ [choice]: isOn });
      setChoices(saved.notifications);
      onSaved(saved);
      showToast(TEXT.saved);
    } catch {
      setChoices(before);
      setProblem(TEXT.saveFailed);
    }
  }

  return (
    <Panel isPadded>
      <div className="grid gap-1">
        {NOTIFICATION_CHOICES.map((choice) => (
          <label
            key={choice}
            className="min-h-control rounded-control hover:bg-fill -mx-2 flex cursor-pointer items-center gap-3 px-2"
          >
            <input
              type="checkbox"
              checked={choices[choice]}
              onChange={(event) => {
                void choose(choice, event.target.checked);
              }}
              className="accent-accent size-5 flex-none"
            />
            {NOTIFICATION_LABELS[choice]}
          </label>
        ))}
      </div>
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
    </Panel>
  );
}
