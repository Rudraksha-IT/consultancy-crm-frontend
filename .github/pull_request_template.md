<!--
Write for a reviewer reading this BEFORE the diff. Delete any heading that doesn't apply; keep it
proportional to the change.
Title: type(scope): summary, e.g. feat(clock): add weekly days off (checked by pr-title).
Branch from dev, merge into dev with "Squash and merge". Release dev -> main with a merge commit.
-->

#### What task is this?

<!-- The ticket or request, and the problem it solves for the office. -->

#### What changed?

<!-- The changes, as a short list: pages, components, API calls, wording. -->

-

#### How to verify it?

<!-- What you ran, and which pages the reviewer should open. -->

#### Screenshots

<!-- For any screen change: phone (390), tablet (768) and desktop (1280), light and dark. -->

| Phone | Desktop |
| ----- | ------- |
|       |         |

#### Reviewer notes

<!-- Where to look first, key decisions, anything you're unsure about. -->

#### Checklist

**Tests**

- [ ] Tests written first, then the code (red, then green)
- [ ] New or changed test files listed here:
  -
- [ ] Bad input and refused answers (400/403/409) are shown to the user, with tests
- [ ] Ran the affected test files: `pnpm exec vitest run <files>`

**Standards**

- [ ] `pnpm format:check`, `pnpm lint` and `pnpm typecheck` pass
- [ ] Colours, sizes and shadows use design tokens only; components stay small (complexity ≤ 5)
- [ ] Every API answer is checked with zod in `lib/api`; tokens never reach browser code
- [ ] Words on screen follow the glossary (Consultancy, Staff, Student, ...)

**Look and access**

- [ ] Checked at phone, tablet and desktop widths, in light and dark
- [ ] Works with the keyboard; labels and names make sense to a screen reader

**Safety**

- [ ] No secrets or real `.env` values committed (`sample.env.*` holds placeholders only)
- [ ] No real client name (use ACME) and no real people's names or emails
- [ ] Fits the shared server's budget (bundle size, no heavy new dependency)
- [ ] Backend first: when this needs a change in the other app, the backend change is merged and
      deployed before the frontend one (ADR 0024)
- [ ] README or settings samples updated if behaviour or a setting changed

#### Related to / Depends on

<!-- Optional. The backend PR that goes with this one, out-of-diff steps (new env value,
     ruleset change). -->

#### How does this PR make you feel? [:link:](https://giphy.com/)

<!-- Optional, just for fun. -->
