"use client";

import clsx from "clsx";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";

import { EmailComposer } from "@/components/features/communication/EmailComposer";
import { TakePaymentDialog } from "@/components/features/payments/TakePaymentDialog";
import { canMessageStudents } from "@/components/features/communication/canMessage";
import { useCurrentStaff } from "@/components/features/shell/useCurrentStaff";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { PHONE_LINE_BREAK, PHONE_MAIN_ACTION } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/useToast";
import { COMMUNICATION_TEXT } from "@/constants/communication";
import { LABELS } from "@/constants/messages";
import { PAYMENT_TEXT } from "@/constants/payments";
import { Role } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import { Stage } from "@/constants/stages";
import { COUNTRY_LABELS } from "@/constants/students";
import type { StudentProfile } from "@/lib/api";

import { AssignCounsellorDialog, TransferDialog } from "./CounsellorDialog";
import { MarkLostDialog } from "./MarkLostDialog";
import { PassportWarningChip } from "./PassportWarning";
import { PriorityPicker } from "./PriorityPicker";

type ProfileHeaderProps = {
  profile: StudentProfile;
  /** A change was saved; History may have a new entry. */
  onSaved: (profile: StudentProfile) => void;
  /** The Stage steps, on the same sheet under the name and the actions (UI revamp 11). */
  children: ReactNode;
};

type OpenDialog = "assign" | "transfer" | "lost" | "payment" | "message" | null;

/**
 * The way back to the list, then who and where as one sheet (UI revamp 11): the Student's name
 * and contact line, the actions on them, and under a thin line the Stage steps.
 */
export function ProfileHeader({ profile, onSaved, children }: ProfileHeaderProps) {
  const [open, setOpen] = useState<OpenDialog>(null);
  const nameId = useId();

  return (
    <div className="grid gap-4">
      <Link
        href={ROUTES.students}
        className="text-secondary text-ink-2 hover:text-ink min-h-control inline-flex items-center gap-1.5 justify-self-start"
      >
        <Icon name="left" size="sm" />
        {LABELS.allStudents}
      </Link>
      <section
        aria-labelledby={nameId}
        className="rounded-panel border-sheet-rule bg-paper shadow-raise min-w-0 border"
      >
        {/* Phones (UI revamp 06): the main action is a compact rounded button on the name's line;
            Priority and the other actions follow on the next line. */}
        <div className="max-phone:px-gutter max-phone:py-4 max-phone:items-start max-phone:justify-start max-phone:gap-x-2 max-phone:gap-y-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-5 p-5">
          <div className="max-phone:order-1 max-phone:flex-1 max-phone:gap-3 flex min-w-0 items-center gap-5">
            <Avatar name={profile.name} size="lg" />
            <div className="grid min-w-0 gap-1">
              <h1 id={nameId} className="text-page-title-sm wide:text-page-title wrap-anywhere">
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
          <div
            className={clsx(
              "max-phone:contents max-phone:*:order-5 flex flex-wrap items-start gap-3",
              PHONE_LINE_BREAK,
            )}
          >
            <PriorityPicker profile={profile} onSaved={onSaved} />
            <HeaderActions profile={profile} onOpen={setOpen} />
          </div>
        </div>
        {children}
      </section>
      {open === "message" && (
        <EmailComposer
          recipients={[profile]}
          isBulk={false}
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

/**
 * Take a payment (spec 71); saving says so and closes. No receipt is shown or printed for now
 * (asked 2026-11-20); the Payment received email stays under Send email.
 */
export function PaymentFlow({ profile, onClose, onRecorded }: PaymentFlowProps) {
  const { staff } = useCurrentStaff();
  const { showToast } = useToast();
  return (
    <TakePaymentDialog
      studentId={profile.id}
      studentName={profile.name}
      isAdmin={staff.role === Role.Admin}
      onClose={onClose}
      onRecorded={() => {
        showToast(PAYMENT_TEXT.recorded);
        onRecorded();
        onClose();
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
 * "Send email" (primary when it is the only one) and the More menu of rarer actions.
 */
function HeaderActions({ profile, onOpen }: HeaderActionsProps) {
  const canMessage = useCanMessage();
  const items = studentItems(profile, (dialog) => () => {
    onOpen(dialog);
  });
  const opens = (dialog: OpenDialog) => () => {
    onOpen(dialog);
  };
  return (
    <div
      className={clsx(
        "flex flex-wrap items-center gap-3 empty:hidden",
        "max-phone:contents max-phone:*:order-5 max-phone:*:text-button-sm",
        PHONE_MAIN_ACTION,
      )}
    >
      {profile.canAssign && (
        <Button variant="primary" icon="userplus" onClick={opens("assign")}>
          {LABELS.assignACounsellor}
        </Button>
      )}
      {profile.canRecordPayment && (
        <MainOrSecond isMain={!profile.canAssign} icon="receipt" onClick={opens("payment")}>
          {PAYMENT_TEXT.takeAPayment}
        </MainOrSecond>
      )}
      {canMessage && (
        <MainOrSecond isMain={isOnlyAction(profile)} icon="message" onClick={opens("message")}>
          {COMMUNICATION_TEXT.sendEmail}
        </MainOrSecond>
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

type MainOrSecondProps = {
  isMain: boolean;
  icon: IconName;
  onClick: () => void;
  children: ReactNode;
};

/** A header action: primary when it is the main one, else secondary. */
function MainOrSecond({ isMain, icon, onClick, children }: MainOrSecondProps) {
  return (
    <Button variant={isMain ? "primary" : "secondary"} icon={icon} onClick={onClick}>
      {children}
    </Button>
  );
}

/** Send email is the main action only when there is no counsellor to assign or payment to take. */
function isOnlyAction(profile: StudentProfile): boolean {
  return !profile.canAssign && !profile.canRecordPayment;
}

/** Whether this person can email Students: the Module is on and they aren't a Teacher. */
function useCanMessage(): boolean {
  return canMessageStudents(useCurrentStaff());
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
