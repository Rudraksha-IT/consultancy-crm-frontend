import type { ReactNode } from "react";

import { CopyrightLine } from "@/components/ui/CopyrightLine";

import { AuthThemeToggle } from "./AuthThemeToggle";

type AuthLayoutProps = {
  brand: ReactNode;
  title: string;
  intro: ReactNode;
  /** The numbered steps of a screen done in steps, shown between the brand and the panel. */
  steps?: ReactNode;
  children: ReactNode;
};

/**
 * Login and password screens: the brand large and centred, then one panel. No menus; only the
 * light/dark button at the top right. The copyright line under the panel.
 */
export function AuthLayout({ brand, title, intro, steps, children }: AuthLayoutProps) {
  return (
    <main className="bg-canvas relative grid min-h-full place-items-center px-4 py-16">
      <div className="absolute top-3 right-3">
        <AuthThemeToggle />
      </div>
      <div className="max-w-login grid w-full gap-7">
        {brand}
        {steps}
        <div className="rounded-panel border-rule bg-paper shadow-raise phone:p-9 grid gap-5.5 border p-6">
          <div className="grid gap-1.5">
            <h1 className="text-page-title-sm wide:text-page-title">{title}</h1>
            <p className="text-ink-2">{intro}</p>
          </div>
          {children}
        </div>
        <footer>
          <CopyrightLine />
        </footer>
      </div>
    </main>
  );
}
