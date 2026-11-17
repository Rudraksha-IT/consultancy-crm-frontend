---
status: accepted
date: 2026-11-17
---

# Support Access: a Platform Admin enters an office as themselves, never as Staff

Recorded 2026-11-17 for decisions made in issue 27.

## Context

- Support work must never be mistaken for the office's own Staff's work.
- A recorded reason and time window for every visit keeps us accountable to the client.

## Decision

- A Platform Admin opens a Consultancy with **"Open as Platform Admin"**, never by logging in to one of its Staff accounts.
- They must give a **reason** first. Each visit is a **Support Visit** on the Platform side: who, which Consultancy, why, when it started and when it ended (with an end-by time).
- Inside the office they get a **Support Access token** (ADR 0003, `kind = support_access`) that works only on that office and only during the visit, and a banner with "Leave this office".
- They can do everything an Admin can, plus: switch Modules, send a password reset Code to or sign out any Staff member (including Admins), and download all of the office's data.
- Every change they make appears in History **under their own name, marked "Platform Admin"**. They never appear in the Staff list, never count in Staff Progress, can never clock in, and can never read Inbox conversations or "Only me" Tasks on screen.

## Consequences

- Support Access must be disclosed in the client contract or terms.
- Visits are recorded on the Platform; edits are visible to the office in History.
