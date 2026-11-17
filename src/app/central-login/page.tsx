import { CentralLogin } from "@/components/features/auth/CentralLogin";

/** Shown at every path of `login.<product-domain>` (src/proxy.ts, issue 44). */
export default function CentralLoginPage() {
  return <CentralLogin />;
}
