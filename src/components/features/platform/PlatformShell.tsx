"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { LogoutButton } from "@/components/features/shell/LogoutButton";
import { ThemeToggle } from "@/components/features/theme/ThemeToggle";
import { useAppliedTheme } from "@/components/features/theme/useAppliedTheme";
import { useColourMode } from "@/components/features/theme/useColourMode";
import { Avatar } from "@/components/ui/Avatar";
import { BrandMark } from "@/components/ui/BrandMark";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { Loading } from "@/components/ui/Loading";
import { LABELS, MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { logOutOfPlatform, type PlatformAdmin } from "@/lib/api";
import { DEFAULT_THEME } from "@/lib/theme";

import { PlatformTabs } from "./PlatformTabs";
import { usePlatformTabTitle } from "@/hooks/usePlatformTabTitle";
import { useProductName } from "@/components/features/brand/ProductName";
import { useProductMark } from "./productLogo";
import { PlatformAdminContext } from "./platformAdminContext";
import { usePlatformSession } from "./usePlatformSession";

type PlatformShellProps = {
  children: ReactNode;
};

/** The logged-in Platform frame: a header bar with the product's name and who is logged in. */
export function PlatformShell({ children }: PlatformShellProps) {
  const session = usePlatformSession();

  if (session.status === "loading") {
    return <Loading size="page" />;
  }
  if (session.status === "failed") {
    return (
      <p role="alert" className="text-bad p-6 font-semibold">
        {MESSAGES.sessionFailed}
      </p>
    );
  }
  return (
    <ToastProvider>
      <PlatformFrame admin={session.value}>{children}</PlatformFrame>
    </ToastProvider>
  );
}

type PlatformFrameProps = {
  admin: PlatformAdmin;
  children: ReactNode;
};

function PlatformFrame({ admin: loaded, children }: PlatformFrameProps) {
  const [admin, setAdmin] = useState(loaded);
  const current = useMemo(() => ({ admin, setAdmin }), [admin]);
  const colourMode = useColourMode(`platform-${admin.id}`);
  const productLogo = useProductMark();
  useAppliedTheme(DEFAULT_THEME, colourMode.mode);
  const productName = useProductName();
  usePlatformTabTitle();

  return (
    <PlatformAdminContext value={current}>
      <div className="flex min-h-full flex-col">
        <header className="min-h-topbar bg-side-bg text-side-ink wide:px-10 flex items-center justify-between gap-3 px-4">
          <Link
            href={ROUTES.platformHome}
            className="min-h-control flex min-w-0 items-center gap-3"
          >
            <BrandMark name={productName} logo={productLogo} />
            <b className="text-body font-bold">{productName}</b>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle mode={colourMode.mode} onToggle={colourMode.toggleMode} tone="sidebar" />
            <span className="border-side-rule phone:pl-4 flex items-center gap-3 border-l pl-2">
              <Avatar name={admin.name} />
              <span className="phone:grid hidden leading-5">
                <b className="text-secondary font-semibold">{admin.name}</b>
                <span className="text-small text-side-muted">{LABELS.platformAdmin}</span>
              </span>
              <LogoutButton endSession={logOutOfPlatform} loginPath={ROUTES.platformLogin} />
            </span>
          </div>
        </header>
        <main className="px-page wide:pt-10 min-w-0 pt-7 pb-30">
          <div className="max-w-content mx-auto grid grid-cols-1 gap-8">
            {/* In the page, above its content, like every other page's tabs (ticket 16). */}
            <PlatformTabs />
            {children}
          </div>
        </main>
      </div>
    </PlatformAdminContext>
  );
}
