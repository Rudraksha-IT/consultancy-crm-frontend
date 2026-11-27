---
status: accepted
date: 2026-11-17
---

# Every colour comes from tokens built by one theme function

Recorded 2026-11-17 for decisions made in issue 32. Changed 2026-11-26 (UI revamp, tickets 03 and 04): one theme for every office, no office colours. Details are in `docs/design-system.md`.

## Context

- The product must be readable for everyone, and hundreds of screens must look like one product.
- One function and one set of components keep the screens consistent and make a new look a change in one place.
- Offices first had their own colours, chosen by a Platform Admin. The owner removed that on 2026-11-24: the client found the app amateur, every office should show our brand, and there is less to maintain.

## Decision

- **One theme for every office: Porcelain** (Ivory until 2026-11-27, when the owner chose Porcelain), in light and dark. Nothing about the colours is stored per Consultancy or chosen by anyone; the Consultancy has no `theme`, and the API neither sends nor takes one (a request that sends `theme` is refused as an unknown field).
- **One pure function, `buildThemeTokens()`,** returns the light and dark token maps. It takes nothing. Its values are checked by tests: every text token reaches 4.5:1 or more on the panel and on the page.
- Components use **tokens and the shared `src/components/ui` parts only**: no raw colours, pixel sizes or shadows. A lint check rejects colour literals outside the theme code.
- Each person chooses light or dark for themselves; that is the only choice.
- **Emails use the same burgundy** (`#6e1a26`, the backend's `emails/looks.py`), for offices and the Platform alike.

## Consequences

- Every `ui` component is tested in Porcelain light and Porcelain dark.
- A new screen that needs a new look adds a token or component, never a one-off colour.
- The colour editor, its preview, the Platform's Colours part and `PUT consultancies/<id>/theme/` are gone; a migration dropped the stored colours.
- Bringing office colours back would need a new decision, not a setting.
