// The commit check (asked 2026-11-17): Conventional Commits, and no AI credited as co-author.
// It runs as the commit-msg hook (husky) and in CI over every pushed commit.
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { main, problems } from "../../scripts/check-commit-message.mjs";

const GOOD_HEADERS = [
  "feat: add weekly days off",
  "feat(clock): add weekly days off",
  "fix(holidays)!: drop the date dropdowns",
  "chore(deps): bump next to 16.4.3",
  "revert: feat(clock): add weekly days off",
  "Merge pull request #12 from Rudraksha-IT/feature",
  "Merge branch 'main' into feature",
];

const BAD_MESSAGES: [string, string][] = [
  ["Add weekly days off\n", "type(scope): summary"],
  ["feature: add weekly days off\n", "type(scope): summary"],
  ["feat:add weekly days off\n", "type(scope): summary"],
  ["feat(Clock): add weekly days off\n", "type(scope): summary"],
  ["feat: Add weekly days off\n", "start with a small letter"],
  ["feat: add weekly days off.\n", "full stop"],
  [`feat: ${"a".repeat(70)}\n`, "72 characters"],
  ["feat: add it\nsecond line straight away\n", "blank line"],
  ["\n", "empty"],
  ["# only a comment\n", "empty"],
];

const AI_LINES = [
  "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
  "co-authored-by: Claude <claude@example.com>",
  "Co-authored-by: GitHub Copilot <copilot@github.com>",
  "Co-authored-by: ChatGPT <bot@openai.com>",
  "Co-authored-by: Gemini <gemini@google.com>",
  "Co-authored-by: Cursor Agent <cursoragent@cursor.com>",
  "Co-authored-by: Someone <noreply@anthropic.com>",
  "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
  "Generated with ChatGPT",
  "  Co-Authored-By:   Codeium <x@codeium.com>",
];

const FINE_MESSAGES = [
  "fix: tidy the holiday calendar\n\nCo-authored-by: Sita Karki <sita@example.com>\n",
  "docs: explain how claude-style prompts were removed\n",
  "docs: update the ai section of the readme\n",
  "fix: tidy\n\n# Co-Authored-By: Claude <noreply@anthropic.com>\n",
  "feat: add it\n# ------------------------ >8 ------------------------\nCo-Authored-By: Claude <x@anthropic.com>\n",
];

function messageFile(text: string): string {
  const file = join(mkdtempSync(join(tmpdir(), "commit-")), "COMMIT_EDITMSG");
  writeFileSync(file, text);
  return file;
}

describe("problems", () => {
  it.each(GOOD_HEADERS)("accepts %s", (header) => {
    expect(problems(`${header}\n`)).toEqual([]);
  });

  it.each(BAD_MESSAGES)("refuses %j, saying %s", (message, why) => {
    expect(problems(message).join(" ")).toContain(why);
  });

  it.each(AI_LINES)("refuses the AI credit %s", (line) => {
    expect(problems(`feat: add weekly days off\n\nBody text.\n\n${line}\n`)).toEqual([
      `Remove the AI credit: ${line.trim()}`,
    ]);
  });

  it.each(FINE_MESSAGES)("accepts %j", (message) => {
    expect(problems(message)).toEqual([]);
  });
});

describe("main", () => {
  it("exits 1 and prints every problem", () => {
    const printed: string[] = [];
    const file = messageFile("Add it\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n");

    expect(main([file], (line) => printed.push(line))).toBe(1);
    expect(printed.join("\n")).toContain("type(scope): summary");
    expect(printed.join("\n")).toContain("Co-Authored-By: Claude <noreply@anthropic.com>");
  });

  it("exits 0 for a good message", () => {
    const file = messageFile("feat(clock): add weekly days off\n\nSaturday stays the default.\n");

    expect(main([file], () => undefined)).toBe(0);
  });

  it("exits 2 with usage when not given one file", () => {
    const printed: string[] = [];

    expect(main([], (line) => printed.push(line))).toBe(2);
    expect(printed.join("\n")).toContain("Usage");
  });
});
