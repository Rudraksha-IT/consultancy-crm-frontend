---
status: accepted
date: 2026-11-17
---

# A Student's details are saved all at once, with a version check

Recorded 2026-11-17 for the decision made in issue 81.

## Context

- A long form saved in parts can leave a half-updated record.
- Two people (a Counsellor and an Admin) can open the same Student. Without a version check, the later save would erase the earlier one without anyone noticing.

## Decision

- "Edit details" is a full page with every field of the Student plus their Academic history, English tests and Work experience rows.
- **One endpoint saves all of it in one transaction, or nothing**, and returns errors per field and per row.
- The page sends the **`details_version`** it was opened with. If the Student changed in the meantime, the save is refused with a short message, never silently overwritten.
- History is written exactly as the per-section edits did before.

## Consequences

- The Profile tab is read-only; all editing happens on the page at `/students/<id>/edit`.
- The frontend warns before leaving with unsaved changes and keeps everything typed when switching sections.
