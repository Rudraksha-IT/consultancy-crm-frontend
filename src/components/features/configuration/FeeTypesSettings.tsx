"use client";

import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { Panel } from "@/components/ui/Panel";
import { RowItem } from "@/components/ui/RowItem";
import { RowList } from "@/components/ui/RowList";
import { Section } from "@/components/ui/Section";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/useToast";
import { FEE_TYPE_TEXT as TEXT } from "@/constants/feeTypes";
import { LABELS } from "@/constants/messages";
import { useFocusAfterChange } from "@/hooks/useFocusAfterChange";
import { feeTypeRefusal, InvalidFieldsError, type FeeType } from "@/lib/api";

import { useFeeTypes, type FeeTypes } from "./useFeeTypes";

/**
 * Configuration → Fee Types (issue 06): the office's list in order, moving one up or down,
 * renaming, hiding or showing, deleting one nobody uses, and adding one. Other is always there
 * and can only be moved.
 */
export function FeeTypesSettings() {
  const feeTypes = useFeeTypes();
  const { state } = feeTypes;

  return (
    <Section title={TEXT.title}>
      <div className="grid gap-4">
        <p className="text-small text-ink-2">{TEXT.help}</p>
        {state.status === "loading" && <p className="text-ink-2">{TEXT.loading}</p>}
        {state.status === "failed" && <Banner tone="problem">{TEXT.loadFailed}</Banner>}
        {state.status === "loaded" && <Loaded types={state.types} feeTypes={feeTypes} />}
      </div>
    </Section>
  );
}

function Loaded({ types, feeTypes }: { types: readonly FeeType[]; feeTypes: FeeTypes }) {
  const { showToast } = useToast();
  const [renaming, setRenaming] = useState<FeeType | null>(null);
  const [deleting, setDeleting] = useState<FeeType | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const focusAfterChange = useFocusAfterChange();

  async function run(action: () => Promise<string>): Promise<void> {
    setFailure(null);
    try {
      showToast(await action());
    } catch (error: unknown) {
      setFailure(feeTypeRefusal(error) ?? TEXT.saveFailed);
    }
  }

  function toggle(feeType: FeeType): void {
    void run(async () => {
      const changed = await feeTypes.change(feeType, { hidden: !feeType.hidden });
      return changed.hidden ? TEXT.hiddenToast(changed.name) : TEXT.shownToast(changed.name);
    });
  }

  function move(feeType: FeeType, by: -1 | 1): void {
    setFailure(null);
    feeTypes.move(feeType, by).then(
      () => {
        focusAfterChange(() => movedArrow(feeType.name, by));
      },
      (error: unknown) => {
        setFailure(feeTypeRefusal(error) ?? TEXT.saveFailed);
      },
    );
  }

  async function remove(feeType: FeeType): Promise<void> {
    await feeTypes.remove(feeType);
    setDeleting(null);
    showToast(TEXT.deleted(feeType.name));
  }

  return (
    <>
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
      <Panel>
        <RowList label={TEXT.listLabel}>
          {types.map((feeType, index) => (
            <FeeTypeRow
              key={feeType.id}
              feeType={feeType}
              isFirst={index === 0}
              isLast={index === types.length - 1}
              onMove={(by) => {
                move(feeType, by);
              }}
              onRename={() => {
                setRenaming(feeType);
              }}
              onToggle={() => {
                toggle(feeType);
              }}
              onDelete={() => {
                setDeleting(feeType);
              }}
            />
          ))}
        </RowList>
      </Panel>
      <AddFeeTypeForm onAdd={feeTypes.add} />
      <p className="text-small text-ink-2">{TEXT.footnote}</p>
      {renaming !== null && (
        <RenameDialog
          feeType={renaming}
          onRename={async (name) => {
            const changed = await feeTypes.change(renaming, { name });
            setRenaming(null);
            showToast(TEXT.renamed(changed.name));
          }}
          onClose={() => {
            setRenaming(null);
          }}
        />
      )}
      {deleting !== null && (
        <ConfirmDialog
          title={TEXT.deleteTitle(deleting.name)}
          actionLabel={TEXT.delete}
          onClose={() => {
            setDeleting(null);
          }}
          onConfirm={() => remove(deleting)}
          failureOf={(error) => feeTypeRefusal(error) ?? TEXT.saveFailed}
        >
          {TEXT.deleteBody}
        </ConfirmDialog>
      )}
    </>
  );
}

type FeeTypeRowProps = {
  feeType: FeeType;
  isFirst: boolean;
  isLast: boolean;
  onMove: (by: -1 | 1) => void;
  onRename: () => void;
  onToggle: () => void;
  onDelete: () => void;
};

const NOT_USED = { fees: 0, payments: 0 };

function FeeTypeRow({ feeType, ...rest }: FeeTypeRowProps) {
  return (
    <RowItem
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span className={clsx("break-words", feeType.hidden && "text-ink-3")}>
            {feeType.name}
          </span>
          {feeType.hidden && <Chip>{TEXT.hidden}</Chip>}
        </span>
      }
      meta={usesText(feeType)}
      right={<RowActions feeType={feeType} {...rest} />}
    />
  );
}

/** "Used by 2 Fees and 1 Payment", and for Other that it is always there. */
function usesText(feeType: FeeType): string {
  const uses = feeType.uses ?? NOT_USED;
  const text = TEXT.usedBy(uses.fees, uses.payments);
  return feeType.isOther ? `${text}. ${TEXT.otherExplained}` : text;
}

/** Up and down for every Fee Type; Rename, Hide or Show, and Delete (when unused) but for Other. */
function RowActions({ feeType, isFirst, isLast, ...on }: FeeTypeRowProps) {
  const { name } = feeType;
  return (
    <span className="flex flex-wrap items-center gap-1">
      <IconButton
        icon="arrowUp"
        label={TEXT.moveUp(name)}
        isDisabled={isFirst}
        onClick={() => {
          on.onMove(-1);
        }}
      />
      <IconButton
        icon="arrowDown"
        label={TEXT.moveDown(name)}
        isDisabled={isLast}
        onClick={() => {
          on.onMove(1);
        }}
      />
      {!feeType.isOther && <ChangeButtons feeType={feeType} {...on} />}
    </span>
  );
}

type ChangeButtonsProps = Pick<FeeTypeRowProps, "feeType" | "onRename" | "onToggle" | "onDelete">;

function ChangeButtons({ feeType, onRename, onToggle, onDelete }: ChangeButtonsProps) {
  const { name, hidden } = feeType;
  const uses = feeType.uses ?? NOT_USED;
  return (
    <>
      <RowButton label={TEXT.rename} named={TEXT.renameFor(name)} onClick={onRename} />
      <RowButton
        label={hidden ? TEXT.show : TEXT.hide}
        named={hidden ? TEXT.showFor(name) : TEXT.hideFor(name)}
        onClick={onToggle}
      />
      {uses.fees + uses.payments === 0 && (
        <RowButton label={TEXT.delete} named={TEXT.deleteFor(name)} onClick={onDelete} isDanger />
      )}
    </>
  );
}

type RowButtonProps = { label: string; named: string; onClick: () => void; isDanger?: boolean };

/** A small row action: shows the short word, reads out the full name. */
function RowButton({ label, named, onClick, isDanger = false }: RowButtonProps) {
  return (
    <Button variant={isDanger ? "danger" : "secondary"} size="sm" onClick={onClick}>
      <span aria-hidden="true">{label}</span>
      <span className="sr-only">{named}</span>
    </Button>
  );
}

/** The form under the list: one name, added before Other. */
function AddFeeTypeForm({ onAdd }: { onAdd: (name: string) => Promise<FeeType> }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  async function add(trimmed: string): Promise<void> {
    setIsSaving(true);
    try {
      const added = await onAdd(trimmed);
      setName("");
      showToast(TEXT.added(added.name));
    } catch (error: unknown) {
      setErrors([nameRefusal(error)]);
    }
    setIsSaving(false);
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    setErrors(trimmed === "" ? [TEXT.enterName] : undefined);
    if (trimmed !== "") void add(trimmed);
  }

  return (
    <Panel isPadded>
      <form
        noValidate
        onSubmit={submit}
        className="wide:flex-row wide:items-end flex flex-col gap-4"
      >
        <div className="min-w-0 flex-1">
          <TextField
            label={TEXT.addLabel}
            name="fee_type_name"
            autoComplete="off"
            placeholder={TEXT.addPlaceholder}
            value={name}
            onChange={setName}
            errors={errors}
          />
        </div>
        <div>
          <Button type="submit" icon="plus" isLoading={isSaving}>
            {TEXT.add}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

type RenameDialogProps = {
  feeType: FeeType;
  onRename: (name: string) => Promise<void>;
  onClose: () => void;
};

const RENAME_FORM = "rename-fee-type";

function RenameDialog({ feeType, onRename, onClose }: RenameDialogProps) {
  const [name, setName] = useState(feeType.name);
  const [errors, setErrors] = useState<string[] | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  async function save(trimmed: string): Promise<void> {
    setIsSaving(true);
    try {
      await onRename(trimmed);
    } catch (error: unknown) {
      setErrors([nameRefusal(error)]);
      setIsSaving(false);
    }
  }

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = name.trim();
    setErrors(trimmed === "" ? [TEXT.enterName] : undefined);
    if (trimmed !== "") void save(trimmed);
  }

  return (
    <Dialog
      isOpen
      title={TEXT.renameTitle(feeType.name)}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{LABELS.cancel}</Button>
          <Button type="submit" form={RENAME_FORM} variant="primary" isLoading={isSaving}>
            {TEXT.save}
          </Button>
        </>
      }
    >
      <form id={RENAME_FORM} noValidate onSubmit={submit} className="grid gap-4">
        <TextField
          label={TEXT.nameLabel}
          name="fee_type_rename"
          autoComplete="off"
          hint={TEXT.renameHint}
          value={name}
          onChange={setName}
          errors={errors}
        />
      </form>
    </Dialog>
  );
}

/**
 * After a move the cursor stays on the row's arrow; at the top or bottom of the list, where that
 * arrow is turned off, it goes to the other one (design system rule 8: no jumping).
 */
function movedArrow(name: string, by: -1 | 1): HTMLElement | null {
  const labels =
    by === -1 ? [TEXT.moveUp(name), TEXT.moveDown(name)] : [TEXT.moveDown(name), TEXT.moveUp(name)];
  for (const label of labels) {
    const button = document.querySelector<HTMLButtonElement>(
      `button[aria-label="${CSS.escape(label)}"]:not(:disabled)`,
    );
    if (button !== null) return button;
  }
  return null;
}

/** The server's words for a refused name, or a general failure. */
function nameRefusal(error: unknown): string {
  if (error instanceof InvalidFieldsError) {
    const refused: Partial<Record<string, string[]>> = error.fieldErrors;
    const first = refused.name?.[0];
    if (first !== undefined) return first;
  }
  return feeTypeRefusal(error) ?? TEXT.saveFailed;
}
