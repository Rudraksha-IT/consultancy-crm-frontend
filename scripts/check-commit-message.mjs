// Refuse a commit message that breaks the team's rules:
// 1. Conventional Commits: "type(scope)!: summary". The summary starts with a small letter, has
//    no full stop, the header is at most 72 characters, and a blank line comes before any body.
// 2. No line may credit an AI as co-author ("Co-authored-by: Claude ...", "Generated with ...").
//    A human co-author is fine.
// Used as the commit-msg hook (husky) and in CI over every pushed commit:
// node scripts/check-commit-message.mjs <file holding the message>
import { readFileSync } from "node:fs";
import { argv, exit, stderr } from "node:process";
import { fileURLToPath } from "node:url";

const TYPES = "feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert";
const HEADER = new RegExp(`^(?:${TYPES})(?:\\([a-z0-9][a-z0-9._/-]*\\))?!?: (?<summary>\\S.*)$`);
const GIT_MADE = /^(?:Merge |Revert "|fixup! |squash! )/;
const MAX_HEADER = 72;
const SCISSORS = "# ------------------------ >8 ------------------------";

const AI =
  /claude|anthropic|copilot|chatgpt|openai|gpt-?\d|gemini|bard|cursor|codeium|windsurf|tabnine|codex|devin|aider|amazon q|codewhisperer|\bai\b|\bllm\b|\bbot\b/i;
const CO_AUTHOR = /^co-authored-by:/i;
const GENERATED = /generated (?:with|by)\b/i;

const USAGE = "Usage: check-commit-message.mjs <commit message file>";

/** The message as git keeps it: no comment lines, nothing below the scissors, no trailing blanks. */
function linesOf(message) {
  const lines = message
    .split(SCISSORS)[0]
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .map((line) => line.trimEnd());
  while (lines.length > 0 && lines.at(-1) === "") lines.pop();
  return lines;
}

function headerProblems(header) {
  if (GIT_MADE.test(header)) return [];
  const summary = HEADER.exec(header)?.groups?.summary;
  if (summary === undefined) {
    return [`Write the first line as "type(scope): summary" with type one of ${TYPES}.`];
  }
  const rules = [
    [/^[A-Z]/.test(summary), "The summary must start with a small letter."],
    [summary.endsWith("."), "The summary must not end with a full stop."],
    [header.length > MAX_HEADER, `The first line must be at most ${MAX_HEADER} characters.`],
  ];
  return rules.filter(([broken]) => broken).map(([, say]) => say);
}

function aiCredits(lines) {
  return lines
    .map((line) => line.trim())
    .filter((text) => (CO_AUTHOR.test(text) && AI.test(text)) || GENERATED.test(text))
    .map((text) => `Remove the AI credit: ${text}`);
}

/** Every rule the message breaks; empty when it may be committed. */
export function problems(message) {
  const lines = linesOf(message);
  if (lines.length === 0 || lines[0].trim() === "") return ["The commit message is empty."];
  const body =
    lines.length > 1 && lines[1] !== ""
      ? ["Leave a blank line between the first line and the body."]
      : [];
  return [...headerProblems(lines[0]), ...body, ...aiCredits(lines)];
}

/** Print every problem with the message in the file; 1 when there is one, 2 on wrong use. */
export function main(args, print) {
  if (args.length !== 1) {
    print(USAGE);
    return 2;
  }
  const found = problems(readFileSync(args[0], "utf8"));
  found.forEach((problem) => print(`commit message: ${problem}`));
  return found.length > 0 ? 1 : 0;
}

if (argv[1] === fileURLToPath(import.meta.url)) {
  exit(main(argv.slice(2), (line) => stderr.write(`${line}\n`)));
}
