---
status: accepted
date: 2026-11-17
---

# One JSON log format with a correlation ID on every line

Recorded 2026-11-17 for decisions made in issues 43 and 58. Details are in `docs/logging.md`.

## Context

- One format across our products means one log viewer and one way of searching later.
- The correlation ID lets us follow one click from the browser through Next.js and Django to a job.
- Tests capture log output and check that secrets and personal data never appear.

## Decision

- Both apps write **JSON lines to stdout** in the same format as our other product: `level, timestamp, source, tenant, thread, thread_id, correlation_id, message` (and `exception` when there is one). `tenant` is the Consultancy's host.
- **Next.js creates a correlation ID per request**, sends it to Django as `X-Correlation-ID` and logs one `api` line (pino). Django logs one INFO line per request and returns the ID. Background jobs reuse the ID saved on the job, so a request and its job join up.
- **INFO in every deployed environment.** `LOG_LEVEL` can pick DEBUG, INFO, WARNING or ERROR; DEBUG is for local use only.
- **Every handled error is logged or re-raised.** Unexpected errors are logged at ERROR with the traceback and the correlation ID, which the person sees as a "reference" they can quote. Security refusals are logged at WARNING.
- **Never logged:** passwords, Codes, tokens, cookies, document contents, Inbox text, client IP addresses, and full emails or phone numbers.

## Consequences

- No log line may be written with a plain `print` or a custom format.
- A central log viewer can be added later without changing the apps.
