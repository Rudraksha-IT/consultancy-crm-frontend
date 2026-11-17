---
status: accepted
date: 2026-11-17
---

# Modules are switched per Consultancy; switching off hides, never deletes

Recorded 2026-11-17 for decisions made in issue 06.

## Context

- The old CRM failed by showing every feature to everyone. Each office should see only what it uses.
- 404 rather than 403 means a switched-off Module looks like it does not exist, so nothing leaks about it.
- Keeping the data makes switching safe to try and easy to undo, for example when a client pauses a plan.

## Decision

- The product is split into **always-on** parts (Students, Staff, Visits, Tasks, History, Catalogue, Applications with Offer Letters, Visas, Documents with the Bin, Payments, Inbox, Configuration) and **switchable Modules**: Test-prep classes (Batches), Email & SMS (Communication), Accounts, Reports and Clock-in.
- Which Modules are on is stored per Consultancy in the public schema and changed only by a Platform Admin, from a Features dialog.
- **One interface answers "is Module X on for this Consultancy?"** It is used by the permission policy, by API routing and, through the context endpoint, by the frontend's navigation.
- A switched-off Module's endpoints answer **404**, its screens and menu items are not shown, and **its data is kept**. Switching it back on restores everything.
- Always-on parts cannot be switched off.

## Consequences

- Every switchable endpoint has a test proving it answers 404 when off and works again when switched back on.
- Pricing per Module is possible later without code changes.
