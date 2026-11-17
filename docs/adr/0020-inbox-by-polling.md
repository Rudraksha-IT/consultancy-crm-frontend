---
status: accepted
date: 2026-11-17
---

# The Inbox checks for new messages every 30 seconds; nothing is live

Recorded 2026-11-17 for the decision made in issue 86.

## Context

- Live connections need a long-running process, memory per connection and a different proxy setup. That does not fit one micro instance (ADR 0006) and is not needed: staff sit in the same office.
- Keeping the feature small keeps it private and easy to reason about.

## Decision

- The Inbox is one-to-one, plain text (1 to 2,000 characters), with no files, editing, deleting or "seen" ticks.
- New messages are found by **one small polling request about every 30 seconds** while the page is open, paused when the tab is hidden. There are no WebSockets or server-sent events.
- Only the two people in a conversation can read it. No Admin, Platform Admin, report, export view or log ever shows message text.
- The unread count shows on the Inbox menu item, never in the bell.

## Consequences

- A message can take up to about 30 seconds to appear.
- Moving to live delivery later only changes how new messages are fetched, not how they are stored.
