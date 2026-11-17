---
status: accepted
date: 2026-11-17
---

# Two-step login with an authenticator app (TOTP) and recovery codes

Recorded 2026-11-17 for decisions made in issues 61 and 62.

## Context

- The office stores passports, money records and financial documents. A stolen password alone should not open them.
- TOTP works offline, costs nothing per login and needs no SMS provider.

## Decision

- After the password, a person enters the 6-digit number from an authenticator app (**TOTP, RFC 6238**: 30-second steps, one step either side accepted, a number already used refused) or one of **10 single-use recovery codes**.
- Until then Django issues **no login token**, only a two-step **challenge**: signed, naming the person, the host and the schema, valid 5 minutes, single use, at most 5 wrong numbers (and at most 10 per person in 15 minutes across challenges). The Next.js server keeps it in its own encrypted HTTP-only cookie.
- The TOTP secret is **encrypted with `TWO_FACTOR_SECRETS_KEY`** (a Fernet key) and never logged, returned again or put in a URL. Recovery codes are stored as hashes.
- **Platform Admins:** on by default from `PLATFORM_ADMIN_TWO_FACTOR_DEFAULT`, then switched only on the Platform.
- **Staff:** `two_factor_required` per person, starting from `STAFF_TWO_FACTOR_DEFAULT` (off by default). An Admin switches it on or off and resets it for a lost phone. A Staff member can switch their own on, and off only if they are an Admin or switched it on themselves.
- A password reset by Code never skips the second step. A Platform Admin entering an office by Support Access has already passed their own and is not asked again.
- Every switch, setup, reset and recovery-code use is recorded and signs the person out everywhere else.

## Consequences

- The QR code is drawn in the browser from the setup answer, so the secret never goes to a third-party QR service.
- A Platform Admin who loses both phone and recovery codes is recovered by a new Platform Admin from the deploy values (ADR 0018), never by a console command.
