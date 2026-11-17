"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { SendMessageDialog } from "@/components/features/communication/SendMessageDialog";
import { ReceiptDialog } from "@/components/features/payments/ReceiptDialog";
import { TakePaymentDialog } from "@/components/features/payments/TakePaymentDialog";
import { canMessageStudents } from "@/components/features/communication/canMessage";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { useToast } from "@/components/ui/useToast";
import { COMMUNICATION_TEXT } from "@/constants/communication";
import { LABELS } from "@/constants/messages";
import { PAYMENT_TEXT } from "@/constants/payments";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { Stage } from "@/constants/stages";
import { COUNTRY_LABELS } from "@/constants/students";
import type { Receipt, StudentProfile } from "@/lib/api";

import { AssignCounsellorDialog, TransferDialog } from "./CounsellorDialog";
import { MarkLostDialog } from "./MarkLostDialog";
import { PassportWarningChip } from "./PassportWarning";

type ProfileHeaderProps = {
  profile: StudentProfile;
  /** A change was saved; History may have a new entry. */
  onSaved: (profile: StudentProfile) => void;
  /** "Edit details" opens the Profile tab, where each section is edited on its own. */
};

type OpenDialog = "assign" | "transfer" | "lost" | "payment" | "message" | null;

/** The way back to the list, the Student's name and contact line, and the actions on them. */
export function ProfileHeader({ profile, onSaved }: ProfileHeaderProps) {
  const [open, setOpen] = useState<OpenDialog>(null);

  return (
    <div className="grid gap-4">
      <Link
        href={ROUTES.students}
        className="text-secondary text-ink-2 hover:text-ink min-h-control inline-flex items-center gap-1.5 justify-self-start"
      >
        <Icon name="left" size="sm" />
        {LABELS.allStudents}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-5">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar name={profile.name} size="lg" />
          <div className="grid min-w-0 gap-1">
            <h1 className="text-page-title-sm wide:text-page-title wrap-anywhere">
              {profile.name}
            </h1>
            <div className="text-secondary text-ink-2 flex flex-wrap gap-x-5 gap-y-1">
              <MetaItem icon="phone">
                <span className="tabular-nums">{profile.phone}</span>
              </MetaItem>
              <MetaItem icon="plane">{COUNTRY_LABELS[profile.country]}</MetaItem>
              <MetaItem icon="users">
                {profile.assignedCounsellor?.name ?? LABELS.noCounsellorYet}
              </MetaItem>
              <PassportWarningChip profile={profile} />
            </div>
          </div>
        </div>
        <HeaderActions profile={profile} onOpen={setOpen} />
      </div>
      {open === "message" && (
        <SendMessageDialog
          student={profile}
          onClose={() => {
            setOpen(null);
          }}
          onSent={() => {
            setOpen(null);
            onSaved(profile);
          }}
        />
      )}
      {open === "payment" ? (
        <PaymentFlow
          profile={profile}
          onClose={() => {
            setOpen(null);
          }}
          onRecorded={() => {
            onSaved(profile);
          }}
        />
      ) : (
        <HeaderDialog
          open={open}
          profile={profile}
          onClose={() => {
            setOpen(null);
          }}
          onSaved={(changed) => {
            setOpen(null);
            onSaved(changed);
          }}
        />
      )}
    </div>
  );
}

type PaymentFlowProps = {
  profile: Pick<StudentProfile, "id" | "name">;
  onClose: () => void;
  /** The Payment was saved; History has a new entry. */
  onRecorded: () => void;
};

/** Take a payment, then show its receipt (spec 71-72). Closing the receipt ends it. */
export function PaymentFlow({ profile, onClose, onRecorded }: PaymentFlowProps) {
  const { staff, consultancy } = useCurrentStaff();
  const { showToast } = useToast();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  if (receipt !== null) {
    return (
      <ReceiptDialog
        receipt={receipt}
        officeName={consultancy.name}
        officeLogo={consultancy.logo}
        onClose={onClose}
      />
    );
  }
  return (
    <TakePaymentDialog
      studentId={profile.id}
      studentName={profile.name}
      isAdmin={staff.role === Role.Admin}
      onClose={onClose}
      onRecorded={(recorded) => {
        showToast(PAYMENT_TEXT.recorded);
        setReceipt(recorded);
        onRecorded();
      }}
    />
  );
}

type HeaderActionsProps = {
  profile: StudentProfile;
  onOpen: (dialog: OpenDialog) => void;
};

/**
 * "Assign a counsellor" when the Student has none, "Take a payment" (primary unless assigning is),
 * and the More menu of rarer actions.
 */
function HeaderActions({ profile, onOpen }: HeaderActionsProps) {
  const items = menuItems(profile, useCanMessage(), onOpen);
  const opens = (dialog: OpenDialog) => () => {
    onOpen(dialog);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 empty:hidden">
      {profile.canAssign && (
        <Button variant="primary" icon="userplus" onClick={opens("assign")}>
          {LABELS.assignACounsellor}
        </Button>
      )}
      {profile.canRecordPayment && (
        <Button
          variant={profile.canAssign ? "secondary" : "primary"}
          icon="receipt"
          onClick={opens("payment")}
        >
          {PAYMENT_TEXT.takeAPayment}
        </Button>
      )}
      {items.length > 0 && <Menu label={LABELS.more} items={items} />}
    </div>
  );
}

type HeaderDialogProps = {
  open: OpenDialog;
  profile: StudentProfile;
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
};

function HeaderDialog({ open, profile, onClose, onSaved }: HeaderDialogProps) {
  if (open === null || open === "payment" || open === "message") return null;
  const Chosen = DIALOGS[open];
  return <Chosen profile={profile} onClose={onClose} onSaved={onSaved} />;
}

type DialogProps = Omit<HeaderDialogProps, "open">;

const DIALOGS: Record<
  Exclude<OpenDialog, "payment" | "message" | null>,
  (props: DialogProps) => ReactNode
> = {
  assign: AssignCounsellorDialog,
  transfer: TransferDialog,
  lost: ({ profile, ...rest }) => <MarkLostDialog studentId={profile.id} {...rest} />,
};

/** Whether this person can send email or SMS: the Module is on and they aren't a Teacher. */
function useCanMessage(): boolean {
  return canMessageStudents(useCurrentStaff());
}

const MESSAGE_ITEM = { label: COMMUNICATION_TEXT.sendEmailOrSms, icon: "send" } as const;

function menuItems(
  profile: StudentProfile,
  canMessage: boolean,
  open: (dialog: OpenDialog) => void,
): MenuItem[] {
  const opens = (dialog: OpenDialog) => () => {
    open(dialog);
  };
  const message: MenuItem[] = canMessage ? [{ ...MESSAGE_ITEM, onSelect: opens("message") }] : [];
  return [...message, ...studentItems(profile, opens)];
}

/** The actions on the Student's record this person may take. */
function studentItems(
  profile: StudentProfile,
  opens: (dialog: OpenDialog) => () => void,
): MenuItem[] {
  const items: (MenuItem | false)[] = [
    profile.canEditDetails && {
      label: LABELS.editDetails,
      icon: "edit",
      href: ROUTES.studentEdit(profile.id),
    },
    profile.canTransfer && {
      label: LABELS.transferToAnother,
      icon: "transfer",
      onSelect: opens("transfer"),
    },
    profile.canSetStage &&
      profile.stage !== Stage.Lost && {
        label: LABELS.markAsLost,
        icon: "x",
        isDestructive: true,
        onSelect: opens("lost"),
      },
  ];
  return items.filter((item) => item !== false);
}

type MetaItemProps = { icon: "phone" | "plane" | "users"; children: ReactNode };

function MetaItem({ icon, children }: MetaItemProps) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon name={icon} size="sm" className="text-ink-3 shrink-0" />
      <span className="min-w-0 wrap-anywhere">{children}</span>
    </span>
  );
}
