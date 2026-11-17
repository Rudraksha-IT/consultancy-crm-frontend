"use client";

import type { ReactNode } from "react";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { SubmitKeysHint, SubmitKeysScope } from "@/components/ui/SubmitKeys";
import type { ButtonVariant } from "@/components/ui/buttonStyles";
import type { IconName } from "@/components/ui/Icon";
import { LABELS } from "@/constants/messages";
import type { SubmitAction } from "@/lib/keyboard/submitKey";

type SaveDialogProps = {
  title: string;
  /** The id of the form inside, which the save button submits. */
  formId: string;
  saveLabel: string;
  /** Danger for a change like marking a Student Lost. */
  saveVariant?: Extract<ButtonVariant, "primary" | "danger">;
  saveIcon?: IconName;
  isSaving: boolean;
  /** The save button can't be used yet, e.g. while a choice the form needs is loading. */
  isSaveDisabled?: boolean;
  failure: string | null;
  onClose: () => void;
  children: ReactNode;
  /** A rarer action shown on the left of the footer, e.g. "Delete payment". */
  sideAction?: ReactNode;
  /** Wider for a long form, such as a Student's two addresses. */
  isWide?: boolean;
  /**
   * The form has a box of several lines: show "Ctrl + Enter to save" (or send) beside the save
   * button, and describe the box by it.
   */
  keysHint?: SubmitAction;
};

/** A dialog holding one Student form, with Cancel and its save button in the footer. */
export function SaveDialog(props: SaveDialogProps) {
  const { title, failure, onClose, children, keysHint } = props;
  const dialog = (
    <Dialog
      isOpen
      title={title}
      onClose={onClose}
      isWide={props.isWide === true}
      footer={<SaveFooter {...props} />}
    >
      {children}
      {failure !== null && <Banner tone="problem">{failure}</Banner>}
    </Dialog>
  );
  return keysHint === undefined ? dialog : <SubmitKeysScope>{dialog}</SubmitKeysScope>;
}

/** The rarer side action, the keyboard hint, Cancel and the save button. */
function SaveFooter(props: SaveDialogProps) {
  const { formId, saveLabel, isSaving, onClose } = props;
  const { saveVariant = "primary", saveIcon = "check", isSaveDisabled = false } = props;
  return (
    <>
      <FooterExtras sideAction={props.sideAction} keysHint={props.keysHint} />
      <Button onClick={onClose}>{LABELS.cancel}</Button>
      <Button
        type="submit"
        form={formId}
        variant={saveVariant}
        icon={saveIcon}
        isLoading={isSaving}
        isDisabled={isSaveDisabled}
        loadingLabel={LABELS.saving}
      >
        {saveLabel}
      </Button>
    </>
  );
}

type FooterExtrasProps = {
  sideAction: ReactNode | undefined;
  keysHint: SubmitAction | undefined;
};

/** The side action on the left, then the keyboard hint beside the buttons, when there are any. */
function FooterExtras({ sideAction, keysHint }: FooterExtrasProps) {
  return (
    <>
      {sideAction !== undefined && <div className="mr-auto">{sideAction}</div>}
      {keysHint !== undefined && <SubmitKeysHint action={keysHint} />}
    </>
  );
}
