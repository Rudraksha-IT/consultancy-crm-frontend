---
status: accepted
date: 2026-11-17
---

# Dates are stored in AD; BS is only for display and input

Recorded 2026-11-17 for decisions made in issue 20 and kept by later tickets.

## Context

- Sorting, ranges and reports need one calendar. AD is what the database, libraries and universities use.
- Nepali offices write receipts and many dates in BS, so the screen must speak it.

## Decision

- Every date is **stored in AD** (Gregorian).
- Each office chooses whether dates are **shown in AD (default) or BS** (Bikram Sambat). An office using AD still sees BS beside AD on Payments and receipts.
- **Conversion is one tested function**, used for display and input only.
- **Intakes are always shown in AD**, because universities publish them that way.
- Days and totals (for example Clock-in) use the office's time zone, **Asia/Kathmandu**. Times come from the server clock, never the browser.

## Consequences

- Any new date field needs only the shared function to appear in BS.
- The Holiday calendar is shown in the office's chosen calendar, but saves AD dates.
