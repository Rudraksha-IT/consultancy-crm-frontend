"use client";

import { useEffect, useRef, type RefObject } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { DetailList } from "@/components/ui/DetailList";
import type { IconName } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { DateDisplay } from "@/constants/dates";
import { PLATFORM_EMAIL_TEXT as TEXT } from "@/constants/platformTeam";
import type { EmailState, PlatformEmail } from "@/lib/api";
import { formatDateTime } from "@/lib/dates/display";

import { usePlatformEmail } from "./usePlatformEmail";

/** Each state as a word with an icon or dot, so the colour never stands alone. */
const CHIPS: Record<EmailState, { tone: ChipTone; icon?: IconName }> = {
  working: { tone: "good", icon: "check" },
  failed: { tone: "bad", icon: "alert" },
  untested: { tone: "muted" },
};

/**
 * Platform → Settings: whether the product's email works, and "Send a test email" to oneself
 * (spec 2026-11-18 stories 3-4). The SMTP details are never shown.
 */
export function PlatformEmailSettings() {
  const { email, isLoadFailed, isSending, problem, sendTest } = usePlatformEmail();
  const actions = useRef<HTMLDivElement>(null);
  useFocusBackAfter(isSending, actions);

  return (
    <Section title={TEXT.title}>
      <div className="wide:grid-cols-[minmax(0,var(--spacing-settings-label))_minmax(0,1fr)] grid gap-x-12 gap-y-6">
        <p className="text-ink-2">{TEXT.help}</p>
        <Panel isPadded>
          <div className="grid min-w-0 gap-5">
            {email === null ? (
              isLoadFailed && <Banner tone="warning">{TEXT.loadFailed}</Banner>
            ) : (
              <EmailDetails email={email} />
            )}
            <div ref={actions} className="flex min-w-0 flex-wrap items-center gap-3">
              <Button
                variant="primary"
                icon="send"
                isLoading={isSending}
                loadingLabel={TEXT.sending}
                onClick={() => void sendTest()}
              >
                {TEXT.send}
              </Button>
              {email !== null && (
                <span className="text-small text-ink-2 min-w-0 break-words">
                  {TEXT.goesTo(email.sentTo)}
                </span>
              )}
            </div>
            {problem !== null && <Banner tone="problem">{problem}</Banner>}
          </div>
        </Panel>
      </div>
    </Section>
  );
}

/** The button is disabled while busy, which drops focus; put it back after (rule 8). */
function useFocusBackAfter(isBusy: boolean, container: RefObject<HTMLElement | null>): void {
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !isBusy) focusBackOn(container.current);
    wasBusy.current = isBusy;
  }, [isBusy, container]);
}

/** Focus the first button in `container`, unless focus has already moved somewhere. */
function focusBackOn(container: HTMLElement | null): void {
  const active = document.activeElement;
  if (active !== null && active !== document.body) return;
  container?.querySelector("button")?.focus();
}

/** The status, a failure's reference and the addresses emails go out from. */
function EmailDetails({ email }: { email: PlatformEmail }) {
  return (
    <>
      <EmailStatusLine email={email} />
      {email.state === "failed" && (
        <Banner tone="problem">
          {TEXT.failed}
          {email.reference !== null && TEXT.quote(email.reference)}
        </Banner>
      )}
      <DetailList
        isFlush
        items={[
          { label: TEXT.platformEmails, value: TEXT.sender(email.productName, email.fromAddress) },
          { label: TEXT.officeEmails, value: TEXT.officeSender(email.fromAddress) },
        ]}
      />
    </>
  );
}

/** "Email: Working", and when the last test went. */
function EmailStatusLine({ email }: { email: PlatformEmail }) {
  const chip = CHIPS[email.state];
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <span className="flex flex-wrap items-center gap-2">
        {TEXT.statusLabel}
        <Chip tone={chip.tone} {...(chip.icon === undefined ? {} : { icon: chip.icon })}>
          {TEXT.state[email.state]}
        </Chip>
      </span>
      {email.testedAt !== null && <TestedAt state={email.state} at={email.testedAt} />}
    </div>
  );
}

function TestedAt({ state, at }: { state: EmailState; at: string }) {
  const shown = formatDateTime(at, DateDisplay.AD);
  return (
    <span className="text-small text-ink-2">
      {state === "working" ? TEXT.lastSent(shown) : TEXT.tried(shown)}
    </span>
  );
}
