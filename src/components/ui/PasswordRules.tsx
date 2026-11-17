import clsx from "clsx";

import { LABELS } from "@/constants/messages";
import { checkPassword } from "@/lib/password";

import { Icon } from "./Icon";

type PasswordRulesProps = {
  password: string;
};

/** Each password rule with a tick once the typed password meets it. */
export function PasswordRules({ password }: PasswordRulesProps) {
  return (
    <ul aria-label={LABELS.passwordRules} className="text-small text-ink-3 grid gap-1.5">
      {checkPassword(password).map((rule) => (
        <li
          key={rule.label}
          data-met={String(rule.isMet)}
          className={clsx("flex items-center gap-2", rule.isMet && "text-good")}
        >
          {rule.isMet ? (
            <Icon name="check" size="sm" />
          ) : (
            <span className="size-icon-sm rounded-pill border-rule-2 border-2" />
          )}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
