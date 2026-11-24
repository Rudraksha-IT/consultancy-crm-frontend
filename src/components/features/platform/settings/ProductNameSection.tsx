"use client";

import { useState, type SubmitEvent } from "react";

import { useProductName, useSetProductName } from "@/components/features/brand/ProductName";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { PRODUCT_NAME, PRODUCT_NAME_TEXT as TEXT } from "@/constants/productName";
import { InvalidFieldsError, saveProductName } from "@/lib/api";

/**
 * The product's name in Platform → Settings (first live fixes, ticket 15). The server holds the
 * rules; this page shows the saved name everywhere on it at once, and offices within a minute.
 */
export function ProductNameSection() {
  return (
    <Section title={TEXT.title}>
      <p className="text-small text-ink-2">{TEXT.help}</p>
      <Panel isPadded>
        <ProductNameForm />
      </Panel>
    </Section>
  );
}

function ProductNameForm() {
  const saved = useProductName();
  const showSaved = useSetProductName();
  const { showToast } = useToast();
  const [name, setName] = useState(saved);
  const [errors, setErrors] = useState<readonly string[] | undefined>(undefined);
  const [problem, setProblem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function save(event: SubmitEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!isReadyToSend()) return;
    setIsSaving(true);
    try {
      const kept = await saveProductName(name);
      showSaved(kept);
      setName(kept);
      showToast(TEXT.saved);
    } catch (error) {
      if (error instanceof InvalidFieldsError) setErrors(error.fieldErrors.name);
      else setProblem(TEXT.failed);
    }
    setIsSaving(false);
  }

  /** Say what must be fixed before asking the server; true when there is nothing. */
  function isReadyToSend(): boolean {
    const isEmpty = name.trim() === "";
    const isUnchanged = name.trim() === saved;
    setErrors(isEmpty ? [TEXT.enterName] : undefined);
    setProblem(!isEmpty && isUnchanged ? TEXT.nothingChanged : null);
    return !isEmpty && !isUnchanged;
  }

  return (
    <form noValidate onSubmit={(event) => void save(event)} className="grid gap-5">
      <TextField
        label={TEXT.label}
        name="product-name"
        autoComplete="off"
        maxLength={PRODUCT_NAME.maxLength}
        hint={TEXT.hint}
        value={name}
        onChange={setName}
        errors={errors}
      />
      {problem !== null && <Banner tone="problem">{problem}</Banner>}
      <div>
        <Button type="submit" variant="primary" isLoading={isSaving}>
          {TEXT.save}
        </Button>
      </div>
    </form>
  );
}
