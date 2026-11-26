---
status: accepted
date: 2026-11-18
---

# All email goes through the product's own SMTP account; no SMS

Decided 2026-11-18, before the first deploy. Changes ADR 0016 (`PROVIDER_SECRETS_KEY` is no longer needed: no office stores an email or SMS password) and ADR 0011 (the Communication Module is shown as "Email", not "Email & SMS"). Replaces the spec's earlier rule that each Consultancy sends from its own email and SMS accounts (issues 25, 26 and 72).

## Context

- Asking each Consultancy to set up an SMTP account and an SMS account is a hurdle before they can use the product, and a broken office password silently stops their emails.
- Codes (Invites, password resets) and the Central login must arrive even when an office has set nothing up.
- SMS costs money for every message (about NPR 1.4 to 1.5 per credit in Nepal in 2026, and a Nepali-script SMS holds only 70 characters per credit). Paying for every office's SMS needs limits and billing we don't want yet.

## Decision

- **Every email** the product sends, to Staff, to Platform Admins and to Students, goes through **one SMTP account**, set only in the backend's environment values (`EMAIL_HOST` and the others, `DEFAULT_FROM_EMAIL`). Nothing about SMTP is typed into or stored by the app. The Platform's Settings tab shows whether email works and can send a test email.
- An office's email is sent **from a no-reply address**, with the office's name as the sender name, and **Reply-To set to the office's contact email**. Its footer also says not to reply and gives that address. Staff cannot email Students until an Admin has set the contact email.
- Every email is **HTML from one set of templates** with a plain-text copy: a fixed frame (office logo, name, contact details) around a subject line and message. Anything Staff type is escaped, never treated as markup. Platform emails use the product's own logo. Every email is in the product's burgundy: office colours were removed on 2026-11-26 (ADR 0022).
- **No SMS.** SMS sending, the SMS provider code and the office email and SMS settings are removed.

## Consequences

- An office can email Students on day one, after setting only its contact email.
- All offices share one sending reputation: one office's misuse can hurt delivery for all, so bulk sends stay limited and failures stay recorded per email.
- Our SMTP provider's sending limit is shared by every office.
- Bringing SMS back later needs its own decision on who pays and on limits per Consultancy.
