"use client";

import type { RecordId } from "@/lib/recordId";
import { useEffect, useId, useState, type SubmitEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SelectField, type SelectOption } from "@/components/ui/SelectField";
import { Loading } from "@/components/ui/Loading";
import { INBOX_TEXT } from "@/constants/inbox";
import { LABELS } from "@/constants/messages";
import { fetchInboxPeople, type InboxContact } from "@/lib/api";

type NewMessageDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the person picked, to open the conversation with them. */
  onChosen: (personId: RecordId) => void;
};

type PeopleState =
  { status: "loading" } | { status: "loaded"; people: InboxContact[] } | { status: "failed" };

/** Start a conversation with anyone active in the office, whatever their Role (spec 128). */
export function NewMessageDialog({ isOpen, onClose, onChosen }: NewMessageDialogProps) {
  const formId = useId();
  const people = usePeople(isOpen);
  const options = optionsOf(people);
  const [chosen, setChosen] = useState<string | null>(null);
  const picked = chosen ?? options[0]?.value ?? null;

  function close(): void {
    setChosen(null);
    onClose();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (picked === null) return;
    setChosen(null);
    onChosen(picked);
  }

  return (
    <Dialog
      isOpen={isOpen}
      title={INBOX_TEXT.newMessageTitle}
      onClose={close}
      footer={
        <>
          <Button onClick={close}>{LABELS.cancel}</Button>
          <Button type="submit" form={formId} variant="primary" isDisabled={picked === null}>
            {INBOX_TEXT.openConversation}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-4">
        <PeoplePicker state={people} options={options} picked={picked} onPick={setChosen} />
      </form>
    </Dialog>
  );
}

type PeoplePickerProps = {
  state: PeopleState;
  options: SelectOption[];
  picked: string | null;
  onPick: (value: string) => void;
};

function PeoplePicker({ state, options, picked, onPick }: PeoplePickerProps) {
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <p className="text-bad">{INBOX_TEXT.loadFailed}</p>;
  if (picked === null) return <p className="text-ink-2">{INBOX_TEXT.nobodyToWrite}</p>;
  return (
    <SelectField
      label={INBOX_TEXT.to}
      name="to"
      options={options}
      value={picked}
      onChange={onPick}
      hint={INBOX_TEXT.toHint}
    />
  );
}

/** Each person as "Name, job title", or just the name. */
function optionsOf(state: PeopleState): SelectOption[] {
  if (state.status !== "loaded") return [];
  return state.people.map((person) => ({
    value: person.id,
    label: person.jobTitle === "" ? person.name : `${person.name}, ${person.jobTitle}`,
  }));
}

/** Who can be written to, asked for each time the dialog opens. */
function usePeople(isOpen: boolean): PeopleState {
  const [state, setState] = useState<PeopleState>({ status: "loading" });

  useEffect(() => {
    if (!isOpen) return undefined;
    let isCancelled = false;
    fetchInboxPeople().then(
      (people) => {
        if (!isCancelled) setState({ status: "loaded", people });
      },
      () => {
        if (!isCancelled) setState({ status: "failed" });
      },
    );
    return () => {
      isCancelled = true;
    };
  }, [isOpen]);

  return state;
}
