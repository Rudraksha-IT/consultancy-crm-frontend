---
status: accepted
date: 2026-11-17
---

# Every colour comes from tokens built by one theme function

Recorded 2026-11-17 for decisions made in issue 32. Details are in `docs/design-system.md`.

## Context

- Offices want their own look, and the product must still be readable for everyone.
- One function and one set of components keep hundreds of screens consistent and make a rebrand a data change.

## Decision

- Each Consultancy has a **theme** (page background from a fixed list, sidebar and accent colours, and separate dark-mode choices) stored in the public schema and set **only by a Platform Admin**. The default is "Stone and emerald".
- **One pure function, `buildThemeTokens(config)`,** turns the theme into light and dark token maps. It adjusts colours until text meets contrast targets (4.5:1 or more), so any colour a Platform Admin picks stays readable.
- Components use **tokens and the shared `src/components/ui` parts only**: no raw colours, pixel sizes or shadows. A lint check rejects colour literals outside the theme code.
- Each person chooses light or dark for themselves; the colours belong to the office.

## Consequences

- Every `ui` component is tested in light and dark with two contrasting themes.
- A new screen that needs a new look adds a token or component, never a one-off colour.
