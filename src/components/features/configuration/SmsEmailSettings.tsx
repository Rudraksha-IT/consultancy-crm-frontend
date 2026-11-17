"use client";

import { useEffect, useId, useState, type SubmitEvent } from "react";
import { z } from "zod";

import { readField } from "@/components/features/students/profile/formData";
import { useFormSave } from "@/components/features/students/profile/useFormSave";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { SelectField } from "@/components/ui/SelectField";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { HTTP_STATUS } from "@/constants/api";
import {
  COMMUNICATION_TEXT as TEXT,
  EMAIL_PORTS,
  SMS_PROVIDER_LABELS,
  SMS_PROVIDERS,
  type EmailPort,
  type SmsProvider,
} from "@/constants/communication";
import { LABELS, MESSAGES } from "@/constants/messages";
import {
  ApiRequestError,
  fetchProviderSettings,
  saveProviderSettings,
  sendTestSms,
  type ProviderSettings,
  type ProviderSettingsInput,
} from "@/lib/api";

const PROVIDER_OPTIONS = SMS_PROVIDERS.map((value) => ({
  value,
  label: SMS_PROVIDER_LABELS[value],
}));
const PORT_OPTIONS = EMAIL_PORTS.map((port) => ({ value: String(port), label: String(port) }));
const TWO_COLUMNS = "tablet:grid-cols-2 grid gap-4";

type SettingsState =
  { status: "loading" } | { status: "loaded"; settings: ProviderSettings } | { status: "failed" };

/**
 * Configuration → Email and SMS: the office's own email account, then its SMS company (spec 88,
 * email first, issue 72), with a test SMS to the Admin's own mobile. Secrets are never shown
 * again after saving.
 */
export function SmsEmailSettings() {
  const [state, setState] = useState<SettingsState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    fetchProviderSettings().then(
      (settings) => {
        if (!isCancelled) setState({ status: "loaded", settings });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <Section title={TEXT.emailAndSms}>
      <div className="grid gap-4">
        <p className="text-ink-2">{TEXT.emailAndSmsHelp}</p>
        <div className="grid min-w-0 content-start">
          {state.status === "loading" && <p className="text-ink-2">{MESSAGES.loading}</p>}
          {state.status === "failed" && <Banner tone="problem">{TEXT.loadFailed}</Banner>}
          {state.status === "loaded" && (
            <SettingsForm
              // A new form after each save, so its fields start from what was stored.
              key={JSON.stringify(state.settings)}
              settings={state.settings}
              onSaved={(settings) => {
                setState({ status: "loaded", settings });
              }}
            />
          )}
        </div>
      </div>
    </Section>
  );
}

type SettingsFormProps = {
  settings: ProviderSettings;
  onSaved: (settings: ProviderSettings) => void;
};

function SettingsForm({ settings, onSaved }: SettingsFormProps) {
  const formId = useId();
  const { showToast } = useToast();
  const { isSaving, fieldErrors, failure, save } = useFormSave(() => TEXT.saveFailed);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const input = readInput(new FormData(event.currentTarget));
    void save(async () => {
      const saved = await saveProviderSettings(input);
      showToast(TEXT.saved);
      onSaved(saved);
    });
  }

  return (
    <Panel isPadded>
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-6">
        <div className={TWO_COLUMNS}>
          <TextField
            label={TEXT.emailServer}
            name="emailHost"
            isOptional
            placeholder={TEXT.emailServerPlaceholder}
            defaultValue={settings.emailHost}
            errors={fieldErrors.emailHost}
          />
          <SelectField
            label={TEXT.emailPort}
            name="emailPort"
            options={PORT_OPTIONS}
            defaultValue={String(settings.emailPort)}
            errors={fieldErrors.emailPort}
          />
        </div>
        <div className={TWO_COLUMNS}>
          <TextField
            label={TEXT.emailUsername}
            name="emailUsername"
            isOptional
            autoComplete="off"
            defaultValue={settings.emailUsername}
            errors={fieldErrors.emailUsername}
          />
          <SecretField
            label={TEXT.emailPassword}
            name="emailPassword"
            isSaved={settings.isEmailPasswordSaved}
            errors={fieldErrors.emailPassword}
          />
        </div>
        <TextField
          label={TEXT.sendFrom}
          name="emailFrom"
          type="email"
          isOptional
          placeholder={TEXT.sendFromPlaceholder}
          defaultValue={settings.emailFrom}
          errors={fieldErrors.emailFrom}
        />
        <div className={TWO_COLUMNS}>
          <SelectField
            label={TEXT.smsCompany}
            name="smsProvider"
            options={PROVIDER_OPTIONS}
            defaultValue={settings.smsProvider}
            errors={fieldErrors.smsProvider}
          />
          <TextField
            label={TEXT.senderName}
            name="smsSender"
            isOptional
            hint={TEXT.senderHint}
            defaultValue={settings.smsSender}
            errors={fieldErrors.smsSender}
          />
        </div>
        <SecretField
          label={TEXT.apiToken}
          name="smsToken"
          isSaved={settings.isSmsTokenSaved}
          errors={fieldErrors.smsToken}
        />
        <ReadyChips settings={settings} />
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            variant="primary"
            icon="check"
            isLoading={isSaving}
            loadingLabel={LABELS.saving}
          >
            {TEXT.save}
          </Button>
          {settings.isSmsReady && <TestSmsButton />}
        </div>
      </form>
    </Panel>
  );
}

type SecretFieldProps = {
  label: string;
  name: "smsToken" | "emailPassword";
  isSaved: boolean;
  errors: string[] | undefined;
};

/** A secret is never shown: the box starts empty, and empty keeps the saved one. */
function SecretField({ label, name, isSaved, errors }: SecretFieldProps) {
  return (
    <TextField
      label={label}
      name={name}
      type="password"
      autoComplete="new-password"
      isOptional
      hint={isSaved ? TEXT.savedSecretHint : TEXT.secretHint}
      errors={errors}
    />
  );
}

/** Whether each channel can send now, in words beside the colour. */
function ReadyChips({ settings }: { settings: ProviderSettings }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Chip tone={settings.isEmailReady ? "good" : "muted"}>
        {settings.isEmailReady ? TEXT.emailReady : TEXT.emailNotReady}
      </Chip>
      <Chip tone={settings.isSmsReady ? "good" : "muted"}>
        {settings.isSmsReady ? TEXT.smsReady : TEXT.smsNotReady}
      </Chip>
    </div>
  );
}

const RefusalSchema = z.union([
  z.object({ detail: z.string().min(1) }).transform(({ detail }) => detail),
  z.object({ channel: z.array(z.string()).min(1) }).transform(({ channel }) => channel[0]),
]);

/** The API's own short reason for refusing a test SMS, e.g. no mobile number on file. */
function testSmsRefusal(error: unknown): string {
  if (!(error instanceof ApiRequestError) || error.status !== HTTP_STATUS.badRequest) {
    return TEXT.testSmsCouldnt;
  }
  const parsed = RefusalSchema.safeParse(error.body);
  return parsed.success && parsed.data !== undefined ? parsed.data : TEXT.testSmsCouldnt;
}

/** Send a test SMS to the Admin's own mobile and say how it went. */
function TestSmsButton() {
  const { showToast } = useToast();
  const [isSending, setIsSending] = useState(false);

  async function sendTest(): Promise<void> {
    setIsSending(true);
    try {
      const result = await sendTestSms();
      showToast(
        result.status === "sent"
          ? TEXT.testSmsSent(result.sentTo)
          : TEXT.testSmsFailed(result.error),
      );
    } catch (error) {
      showToast(testSmsRefusal(error));
    }
    setIsSending(false);
  }

  return (
    <Button
      icon="send"
      isLoading={isSending}
      loadingLabel={TEXT.sending}
      onClick={() => {
        void sendTest();
      }}
    >
      {TEXT.sendTestSms}
    </Button>
  );
}

function readInput(form: FormData): ProviderSettingsInput {
  return {
    smsProvider: pickProvider(readField(form, "smsProvider")),
    smsSender: readField(form, "smsSender").trim(),
    smsToken: readField(form, "smsToken").trim(),
    emailHost: readField(form, "emailHost").trim(),
    emailPort: pickPort(readField(form, "emailPort")),
    emailUsername: readField(form, "emailUsername").trim(),
    emailPassword: readField(form, "emailPassword"),
    emailFrom: readField(form, "emailFrom").trim(),
  };
}

function pickProvider(value: string): SmsProvider {
  return SMS_PROVIDERS.find((provider) => provider === value) ?? "";
}

function pickPort(value: string): EmailPort {
  return EMAIL_PORTS.find((port) => String(port) === value) ?? EMAIL_PORTS[0];
}
