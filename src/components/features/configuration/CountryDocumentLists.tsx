"use client";

import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SelectField } from "@/components/ui/SelectField";
import { useToast } from "@/components/ui/useToast";
import { Loading } from "@/components/ui/Loading";
import {
  COUNTRY_LIST_TEXT,
  DOCUMENT_GROUP_HELP,
  DOCUMENT_GROUP_LABELS,
  DOCUMENT_GROUPS,
  DOCUMENT_TEXT,
  DocumentGroup,
} from "@/constants/documents";
import { COUNTRIES, COUNTRY_LABELS, Country } from "@/constants/students";
import {
  requirementRefusal,
  setCountryList,
  type CountryList,
  type CountryListRow,
  type DocumentType,
  type NewCountryDocument,
} from "@/lib/api";

import { NewCountryDocumentDialog } from "./NewCountryDocumentDialog";
import { useCountryLists } from "./useCountryLists";

/** Every Country but Other has a list, in the order Countries are offered. */
const LISTED = COUNTRIES.filter((country) => country !== Country.Other);
const GROUP_OPTIONS = DOCUMENT_GROUPS.map((group) => ({
  value: group,
  label: DOCUMENT_GROUP_LABELS[group],
}));

type Row = CountryList["documents"][number];

/**
 * Configuration → Documents → By country (spec 121, 121a; issues 80, 97): pick a Country, then
 * Applying, Visa or Statements, and only that list shows. Move a type to another group or take
 * it off; under the list, add an existing document to it, or make a new one. Each change but a
 * new document saves the Country's whole list.
 */
export function CountryDocumentLists() {
  const { state, keep, keepType } = useCountryLists();
  if (state.status === "loading") return <Loading />;
  if (state.status === "failed") return <Banner tone="problem">{COUNTRY_LIST_TEXT.failed}</Banner>;
  return <LoadedLists lists={state.lists} types={state.types} keep={keep} keepType={keepType} />;
}

type LoadedListsProps = {
  lists: readonly CountryList[];
  types: readonly DocumentType[];
  keep: (saved: CountryList) => void;
  keepType: (made: DocumentType) => void;
};

function LoadedLists({ lists, types, keep, keepType }: LoadedListsProps) {
  const { showToast } = useToast();
  const [country, setCountry] = useState<Country>(Country.Australia);
  const [group, setGroup] = useState<DocumentGroup>(DocumentGroup.Applying);
  const [failure, setFailure] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Row | null>(null);

  const label = COUNTRY_LABELS[country];
  const groupLabel = DOCUMENT_GROUP_LABELS[group];
  const rows = lists.find((one) => one.country === country)?.documents ?? [];
  const everyone = new Set(types.filter((t) => t.neededByEveryone).map((t) => t.id));
  const current = rows.map((one) => ({ typeId: one.documentType.id, group: one.group }));

  /** Save the Country's list as `next`; the words to show once saved. Rejects when refused. */
  async function save(next: readonly CountryListRow[], done: string): Promise<void> {
    setFailure(null);
    const sent = next.filter((one) => !everyone.has(one.typeId));
    keep(await setCountryList(country, sent));
    showToast(done);
  }

  async function saveOrSay(next: readonly CountryListRow[], done: string): Promise<void> {
    try {
      await save(next, done);
    } catch (error: unknown) {
      setFailure(requirementRefusal(error) ?? DOCUMENT_TEXT.saveFailed);
    }
  }

  return (
    <div className="grid min-w-0 gap-4">
      <CountryPicker
        lists={lists}
        country={country}
        onPick={(picked) => {
          setFailure(null);
          setCountry(picked);
        }}
      />
      <SegmentedControl
        label={COUNTRY_LIST_TEXT.groups}
        value={group}
        onChange={(picked) => {
          setFailure(null);
          setGroup(picked);
        }}
        options={DOCUMENT_GROUPS.map((one) => ({
          value: one,
          label: DOCUMENT_GROUP_LABELS[one],
          count: rows.filter((row) => row.group === one).length,
        }))}
      />
      <p className="text-small text-ink-2">{DOCUMENT_GROUP_HELP[group]}</p>
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
      <GroupList
        group={group}
        country={label}
        rows={rows.filter((one) => one.group === group)}
        onMove={(row, to) => {
          const next = current.map((one) =>
            one.typeId === row.documentType.id ? { ...one, group: to } : one,
          );
          void saveOrSay(next, COUNTRY_LIST_TEXT.moved(DOCUMENT_GROUP_LABELS[to]));
        }}
        onRemove={setRemoving}
      />
      <Panel isPadded>
        <div className="grid gap-4">
          <AddExisting
            country={label}
            group={groupLabel}
            addable={types.filter(
              (type) => !type.neededByEveryone && !current.some((one) => one.typeId === type.id),
            )}
            onAdd={(type) => {
              const done = COUNTRY_LIST_TEXT.added(type.name, label, groupLabel);
              void saveOrSay([...current, { typeId: type.id, group }], done);
            }}
          />
          <NewDocumentAction
            country={country}
            group={group}
            onMade={(made) => {
              keepType(made.documentType);
              keep(made.list);
              showToast(COUNTRY_LIST_TEXT.created(made.documentType.name, label, groupLabel));
            }}
          />
        </div>
      </Panel>
      {removing !== null && (
        <ConfirmDialog
          title={COUNTRY_LIST_TEXT.removeTitle(removing.documentType.name, label)}
          actionLabel={COUNTRY_LIST_TEXT.removeAction}
          onClose={() => {
            setRemoving(null);
          }}
          onConfirm={async () => {
            const next = current.filter((one) => one.typeId !== removing.documentType.id);
            await save(next, COUNTRY_LIST_TEXT.removed(label));
            setRemoving(null);
          }}
          failureOf={(error) => requirementRefusal(error) ?? DOCUMENT_TEXT.saveFailed}
        >
          {COUNTRY_LIST_TEXT.removeBody(label)}
        </ConfirmDialog>
      )}
    </div>
  );
}

type CountryPickerProps = {
  lists: readonly CountryList[];
  country: Country;
  onPick: (country: Country) => void;
};

/** The Country dropdown, each with its document count, e.g. "UK (5 documents)". */
function CountryPicker({ lists, country, onPick }: CountryPickerProps) {
  return (
    <div className="phone:max-w-md">
      <SelectField
        label={COUNTRY_LIST_TEXT.country}
        name="document_country"
        value={country}
        onChange={(picked) => {
          const found = LISTED.find((one) => one === picked);
          if (found !== undefined) onPick(found);
        }}
        options={LISTED.map((one) => ({
          value: one,
          label: COUNTRY_LIST_TEXT.countryOption(
            COUNTRY_LABELS[one],
            lists.find((list) => list.country === one)?.documents.length ?? 0,
          ),
        }))}
      />
    </div>
  );
}

type NewDocumentActionProps = {
  country: Country;
  group: DocumentGroup;
  onMade: (made: NewCountryDocument) => void;
};

/** "Not on the list? ＋ New document", and its dialog (issue 97). */
function NewDocumentAction({ country, group, onMade }: NewDocumentActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-ink-2">{COUNTRY_LIST_TEXT.notOnList}</span>
      <Button
        icon="plus"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {COUNTRY_LIST_TEXT.newDocument}
      </Button>
      {isOpen && (
        <NewCountryDocumentDialog
          country={country}
          group={group}
          onMade={(made) => {
            setIsOpen(false);
            onMade(made);
          }}
          onClose={() => {
            setIsOpen(false);
          }}
        />
      )}
    </div>
  );
}

type GroupListProps = {
  group: DocumentGroup;
  country: string;
  rows: readonly Row[];
  onMove: (row: Row, to: DocumentGroup) => void;
  onRemove: (row: Row) => void;
};

function GroupList({ group, country, rows, onMove, onRemove }: GroupListProps) {
  return (
    <Panel>
      {rows.length === 0 ? (
        <EmptyState>{COUNTRY_LIST_TEXT.nothingFor(country)}</EmptyState>
      ) : (
        <ul aria-label={DOCUMENT_GROUP_LABELS[group]} className="divide-rule divide-y">
          {rows.map((row) => (
            <li
              key={row.documentType.id}
              // On a phone the group's menu opens from this row (`FilterPillMenu`).
              className="px-gutter max-phone:relative flex min-h-15 flex-wrap items-center justify-between gap-3 py-3"
            >
              <span className="min-w-0 break-words">{row.documentType.name}</span>
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect
                  label={COUNTRY_LIST_TEXT.groupFor(row.documentType.name)}
                  value={row.group}
                  options={GROUP_OPTIONS}
                  onChange={(to) => {
                    const picked = DOCUMENT_GROUPS.find((one) => one === to);
                    if (picked !== undefined && picked !== row.group) onMove(row, picked);
                  }}
                />
                <Button
                  variant="ghost"
                  onClick={() => {
                    onRemove(row);
                  }}
                >
                  <span aria-hidden="true">{COUNTRY_LIST_TEXT.remove}</span>
                  <span className="sr-only">
                    {COUNTRY_LIST_TEXT.removeFor(row.documentType.name, country)}
                  </span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

type AddExistingProps = {
  country: string;
  group: string;
  addable: readonly DocumentType[];
  onAdd: (type: DocumentType) => void;
};

/** A dropdown of the extra documents not yet on the Country's list, and Add (issue 97). */
function AddExisting({ country, group, addable, onAdd }: AddExistingProps) {
  const [picked, setPicked] = useState("");
  if (addable.length === 0) {
    return <p className="text-small text-ink-2">{COUNTRY_LIST_TEXT.noneLeft(country)}</p>;
  }
  const chosen = addable.find((type) => type.id === picked) ?? addable[0];

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (chosen !== undefined) onAdd(chosen);
    setPicked("");
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="phone:flex-row phone:items-end flex flex-col gap-4"
    >
      <div className="min-w-0 flex-1">
        <SelectField
          label={COUNTRY_LIST_TEXT.addExisting(country, group)}
          name="country_document"
          value={chosen === undefined ? "" : chosen.id}
          onChange={setPicked}
          options={addable.map((type) => ({ value: type.id, label: type.name }))}
        />
      </div>
      <div>
        <Button type="submit" icon="plus">
          {COUNTRY_LIST_TEXT.add}
        </Button>
      </div>
    </form>
  );
}
