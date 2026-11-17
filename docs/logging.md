# Logging

Status: rules for the frontend (issue 58); the backend's copy of this file has the Django rules. The format comes from issue 43 and
matches our other product.

When anything goes wrong, one search by correlation ID shows the whole story: which Consultancy,
which request, what the code was doing, and the full traceback with file, function and line.

## The format

One JSON object per line, on stdout. A log viewer added later (CloudWatch Logs, Grafana Loki,
Better Stack or similar) reads these lines unchanged.

**Django** (`consultancy-crm-backend/config/logging.py`, `logging_utils.py`):

```json
{
  "level": "ERROR",
  "timestamp": "2026-11-05 14:02:11 +0545",
  "source": "config/exceptions.py: handle_exception, line 41",
  "tenant": "acme.crm.com",
  "thread": "MainThread",
  "thread_id": 1407,
  "correlation_id": "3f1c…",
  "message": "unexpected error: method=PUT path=/api/configuration/dates/",
  "exception": "Traceback (most recent call last): …"
}
```

`tenant` is the Consultancy's host (`N/A` on the Platform, the Central login, or outside a
request). `exception` is there only when a traceback was logged.

**Next.js server** (`consultancy-crm-frontend/src/lib/logger/server.ts`, pino): `level` (30 info, 40 warn,
50 error), `time`, `msg`, `type` (`api`, `warn` or `error`) and the entry's fields, always with
`correlationId` when there is one.

The Next.js server creates the correlation ID for each API call and sends it to Django as
`X-Correlation-ID`; Django uses it on every line of that request and returns it. A management
command gets a fresh one per run.

## Levels

`LOG_LEVEL` picks the level, in any case. Anything else stops the server at start-up.

| Level          | What you see                               | Backend   | Frontend |
| -------------- | ------------------------------------------ | --------- | -------- |
| DEBUG          | Everything, for local troubleshooting only | `DEBUG`   | `debug`  |
| INFO (default) | Normal operation                           | `INFO`    | `info`   |
| WARNING        | Only problems, plus security refusals      | `WARNING` | `warn`   |
| ERROR          | Only failures                              | `ERROR`   | `error`  |

- **DEBUG:** detail useful only while debugging, such as which branch was taken or counts. Never
  on by default.
  `logger.debug("validation failed: fields=%s", "email,phone")`
- **INFO:** the one request line, plus business events with ids only: Student created, Stage
  changed, Payment recorded, Document uploaded, message sent or failed, login and logout, and
  every call to an outside service.
  `logger.info("outside call done: provider=%s operation=%s duration_ms=%s", "s3", "put_object", 84)`
- **WARNING:** something went wrong but we recovered, or a security refusal:
  - a token for another Consultancy, a missing `tenant_schema`, a bad internal token, a refused
    origin (Next.js)
  - too many Codes sent, or a Code out of tries
  - a clock-in from outside an Office Network
  - a file not removed
  - a request slower than `LOG_SLOW_REQUEST_MS` (default 1000)
  - a failure we recover from, with its traceback: `logger.warning("central login email not sent", exc_info=True)`
    `logger.warning("token refused: reason=%s", "wrong_consultancy")`
- **ERROR:** an unexpected failure. It always carries the traceback (`logger.exception` inside
  `except`, or `exc_info=`).
  `logger.exception("outside call failed: provider=%s operation=%s duration_ms=%s", "sparrow", "send_sms", 10012)`

## Message style

- Lower case, saying what happened, then the ids, with %-style arguments (never f-strings in a
  log call; ruff's `G` rules refuse them):
  `logger.exception("could not send SMS: provider=%s message_id=%s", provider, message.pk)`.
- Older business-event messages written before this ticket start with a capital (e.g.
  "Payment recorded: …"); tests and searches rely on them, so they stay until they are next
  changed.

## Never logged

- passwords, Codes, tokens, cookies, keys
- authenticator secrets, setup URIs, numbers, recovery codes and two-step challenges (issue 61)
- request or response bodies, document contents, message text
- full emails or phone numbers
- the client's IP address (ADR 0004)

The redaction filter (`RedactionFilter`) is the safety net, not the plan: it blanks
secret-looking `key=value` pairs, email addresses and Nepali mobile numbers in every message and
traceback. Next.js logs only an error's name and stack frames, never its message, which can name
Django's internal address.

## Where each part logs

**Frontend (Next.js server)**

- `forwardToBackend`: one `api` entry per call; a `warn` entry for a change refused by the
  origin check (`reason: "origin"`); an `error` entry with the stack frames when Django can't be
  reached or times out, and with the status when Django answers 5xx. A 4xx stays at `info`.
- `instrumentation.ts` `onRequestError`: a failed server render, route or action is one `error`
  entry with the path (no query), the route, the method, Next.js's `digest` and the stack frames.
- `error.tsx` and `global-error.tsx` show the unexpected-error banner with "Reference: <digest>";
  an API call answered 5xx with a `reference` shows the same banner in the app shell with that
  reference. Staff quote it to us, and it finds the matching lines.
- No `console.*` anywhere (eslint `no-console`).

## Reading the logs today

Every line of one request, from both servers:

```sh
docker compose logs backend frontend --no-log-prefix \
  | jq -c 'select(.correlation_id == "3f1c…" or .correlationId == "3f1c…")'
```

Only the backend's errors with their tracebacks:

```sh
docker compose logs backend --no-log-prefix | jq -r 'select(.level == "ERROR") | .message, .exception'
```

A reference a member of staff quoted is a correlation ID (from an API error) or a Next.js digest
(from the error page): search for it as `correlation_id`/`correlationId` or as `digest`.
