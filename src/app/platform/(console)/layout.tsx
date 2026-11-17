import { PlatformShell } from "@/components/features/platform/PlatformShell";

export default function PlatformConsoleLayout({ children }: LayoutProps<"/platform">) {
  return <PlatformShell>{children}</PlatformShell>;
}
