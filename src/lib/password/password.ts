/** The password rules every Staff password must meet (spec 18c), checked as the person types. */

/** Each rule's name, the same as the API's `unmet_rules`. */
export const PASSWORD_RULE_IDS = ["min_length", "capital", "small", "number", "symbol"] as const;
export type PasswordRuleId = (typeof PASSWORD_RULE_IDS)[number];

export type PasswordRuleCheck = { id: PasswordRuleId; label: string; isMet: boolean };

const MIN_LENGTH = 8;

type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  /** How the rule reads in "The password still needs …". */
  need: string;
  test: (password: string) => boolean;
};

const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "min_length",
    label: `At least ${String(MIN_LENGTH)} characters`,
    need: `${String(MIN_LENGTH)} characters`,
    test: (pw) => pw.length >= MIN_LENGTH,
  },
  {
    id: "capital",
    label: "A capital letter (A–Z)",
    need: "a capital letter",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    id: "small",
    label: "A small letter (a–z)",
    need: "a small letter",
    test: (pw) => /[a-z]/.test(pw),
  },
  { id: "number", label: "A number (0–9)", need: "a number", test: (pw) => /[0-9]/.test(pw) },
  {
    id: "symbol",
    label: "A symbol, such as ! @ # $",
    need: "a symbol",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

/** The rules as one line, shown before the person starts typing. */
export const PASSWORD_RULES_HINT = `At least ${String(MIN_LENGTH)} characters, with a capital letter, a small letter, a number and a symbol.`;

/** Every rule, and whether `password` meets it. */
export function checkPassword(password: string): PasswordRuleCheck[] {
  return PASSWORD_RULES.map(({ id, label, test }) => ({ id, label, isMet: test(password) }));
}

export function isPasswordAcceptable(password: string): boolean {
  return unmetRules(password).length === 0;
}

/** The rules `password` doesn't meet yet, in the order they are shown. */
export function unmetRules(password: string): PasswordRuleId[] {
  return checkPassword(password)
    .filter((rule) => !rule.isMet)
    .map((rule) => rule.id);
}

/** "a capital letter, a number and a symbol": what a password still needs. */
export function describeMissingRules(ids: readonly PasswordRuleId[]): string {
  const needs = PASSWORD_RULES.filter((rule) => ids.includes(rule.id)).map((rule) => rule.need);
  const last = needs.pop();
  if (last === undefined) return "";
  return needs.length === 0 ? last : `${needs.join(", ")} and ${last}`;
}
