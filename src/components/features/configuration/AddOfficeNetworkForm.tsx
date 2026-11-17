"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { OFFICE_NETWORK_TEXT as TEXT } from "@/constants/officeNetworks";
import { InvalidFieldsError, OfficeNetworkRefusedError, type OfficeNetwork } from "@/lib/api";

type FieldErrors = { label?: string[] | undefined; network?: string[] | undefined };

type AddOfficeNetworkFormProps = {
  /** The widest IPv4 range the server takes, for the hint (e.g. 24). */
  ipv4WidestPrefix: number;
  onAdd: (label: string, network: string) => Promise<OfficeNetwork>;
};

/** Add an Office Network by hand: its name and its address or small range (spec 105). */
export function AddOfficeNetworkForm({ ipv4WidestPrefix, onAdd }: AddOfficeNetworkFormProps) {
  const { showToast } = useToast();
  const [label, setLabel] = useState("");
  const [network, setNetwork] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function add(name: string, address: string): Promise<void> {
    setIsSaving(true);
    try {
      const added = await onAdd(name, address);
      setLabel("");
      setNetwork("");
      showToast(TEXT.added(added.label));
    } catch (error: unknown) {
      if (error instanceof InvalidFieldsError) {
        const refused: FieldErrors = error.fieldErrors;
        setErrors({ label: refused.label, network: refused.network });
      } else {
        setFailure(error instanceof OfficeNetworkRefusedError ? error.message : TEXT.saveFailed);
      }
    }
    setIsSaving(false);
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const name = label.trim();
    const address = network.trim();
    setFailure(null);
    setErrors({
      label: name === "" ? [TEXT.enterName] : undefined,
      network: address === "" ? [TEXT.enterAddress] : undefined,
    });
    if (name !== "" && address !== "") void add(name, address);
  }

  return (
    <Panel isPadded>
      <form noValidate onSubmit={submit} className="grid gap-4">
        <div className="wide:grid-cols-2 grid gap-4">
          <TextField
            label={TEXT.nameLabel}
            name="office_network_label"
            placeholder={TEXT.namePlaceholder}
            value={label}
            onChange={setLabel}
            errors={errors.label}
          />
          <TextField
            label={TEXT.addressLabel}
            name="office_network_address"
            placeholder={TEXT.addressPlaceholder}
            autoComplete="off"
            hint={TEXT.addressHint(ipv4WidestPrefix)}
            value={network}
            onChange={setNetwork}
            errors={errors.network}
          />
        </div>
        {failure !== null && <Banner tone="problem">{failure}</Banner>}
        <div>
          <Button type="submit" icon="plus" isLoading={isSaving}>
            {TEXT.add}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
