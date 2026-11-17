---
status: accepted
date: 2026-11-17
---

# Central login emails a person their offices; it never shows them

Recorded 2026-11-17 for the decision made in issue 44.

## Context

- Staff should not have to remember their office's address.
- Showing the list on screen would let anyone discover who works at which office. Sending it by email only tells the owner of the mailbox.
- Keeping each office's Staff in its own schema (ADR 0001) means a lookup across offices needs its own small, privacy-safe index.

## Decision

- A shared address, `login.<product-domain>`, asks only for an email.
- It **always answers the same way**, then emails the person a list of the offices they belong to, each link opening that office's login with the email filled in. The list is never shown on screen.
- A public-schema **Staff directory** maps an **HMAC of each Staff email** (keyed with `STAFF_DIRECTORY_KEY`) to its Consultancies. No raw email is stored in the public schema. The directory is kept in step when Staff are added, change email or are deactivated, and rebuilt on deploy.
- The lookup is **rate-limited** (per email hash, over a one-hour window) and never lists Terminated offices or offices still being set up.

## Consequences

- Logging in still happens on the office's own address, so ADR 0003's per-office tokens are unchanged.
- If the directory key is changed, the directory must be rebuilt (the deploy does this).
