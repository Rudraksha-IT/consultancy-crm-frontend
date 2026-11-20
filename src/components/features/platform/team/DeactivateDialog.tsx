"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PLATFORM_TEAM_TEXT as TEXT } from "@/constants/platformTeam";
import {
  deactivatePlatformAdmin,
  InvalidFieldsError,
  type PlatformAdminRow,
  updatingOr,
} from "@/lib/api";

type DeactivateDialogProps = {
  admin: PlatformAdminRow;
  onDone: (admin: PlatformAdminRow) => void;
  onClose: () => void;
};

/** The warning before deactivating a Platform Admin, or cancelling an invite (issue 65). */
export function DeactivateDialog({ admin, onDone, onClose }: DeactivateDialogProps) {
  const isInvite = admin.status === "invited";
  return (
    <ConfirmDialog
      title={isInvite ? TEXT.cancelTitle(admin.name) : TEXT.deactivateTitle(admin.name)}
      actionLabel={isInvite ? TEXT.cancelInvite : TEXT.deactivate}
      onClose={onClose}
      onConfirm={async () => {
        onDone(await deactivatePlatformAdmin(admin.id));
      }}
      failureOf={refusalOf}
    >
      {isInvite ? TEXT.cancelWarning : TEXT.deactivateWarning}
    </ConfirmDialog>
  );
}

/** The server's own reason, e.g. "At least one active Platform Admin must stay." */
function refusalOf(error: unknown): string {
  const [reason] = error instanceof InvalidFieldsError ? (error.fieldErrors.detail ?? []) : [];
  return reason ?? updatingOr(error, TEXT.changeFailed);
}
