---
status: accepted
date: 2026-11-20
---

# Records are known outside the server only by a UUID

Decided 2026-11-20 by the product owner, built in tickets 17 to 19 of `work/2026-11-18-emails-files-and-fee-types`, before the first office starts. Amends ADR 0015: new files are stored under the owning record's UUID.

## Context

- Every record was named by its database number: `/students/16`, `"id": 16` in API answers, `<office>/documents/16/…` in file paths. Numbers count up, so they show how many Students, Payments or employees an office has, and the next one is easy to guess.
- Guessing opens nothing: every request is checked for its login, its office and the Role (ADRs 0003 and 0005), and the isolation suite proves it. But the product owner wants no record number visible anywhere ("proper uuid all where").
- Changing the ids after offices start would break every saved and shared link, so it is done before.

## Decision

- **Every record has a `public_id`**, a UUID (version 4) made when the record is made, unique and never changed. **The database number stays the primary key** and every foreign key stays a number, so joins and indexes stay small and nothing else is rebuilt.
- **Only `public_id` leaves the server:** page addresses (`/students/<uuid>`), API answers (`"id"` and every `…_id` is the UUID as text), request bodies and query strings, file paths, CSV exports and links in emails. The number never does.
- **Looking a record up** by its UUID happens only inside the current office's schema, as before. A number, a malformed UUID, another office's or another Student's UUID is refused like an unknown record (404, or 400 in a body), never a server error. Django's `<uuid:…>` path converter refuses anything else before any lookup.
- **Existing rows** get their own UUID in a migration: the column is added empty, each row is filled with `gen_random_uuid()`, then it is made unique and required (`config.public_ids.add_public_id`). Adding it with a default would give every existing row the same value.
- **Files:** new files go under the owning record's UUID (`<office>/documents/<student uuid>/<random>.<ext>`). Files stored before keep their saved path; nothing is moved.
- **A guard** (ticket 19): a test over every API answer in the suite fails if a record is named by a number, so no new endpoint brings numbers back.
- **Frontend:** one `RecordId` schema (`z.uuid()`) for every id; page addresses check the parameter with it and show "not found" for anything else without calling the API.

## Considered options

- **UUIDs as the primary key:** no second column, but every foreign key and index becomes 16 bytes instead of 8, every table and foreign key is rebuilt, and the migration of existing rows is much riskier. Rejected.
- **Encoded numbers (hashids, sqids):** short, but reversible by anyone who learns the alphabet and the salt, so the count still leaks. Rejected.
- **UUID version 7 (time-ordered):** better index locality, but needs a library or PostgreSQL 18 now; at our size version 4 is enough. Can be revisited.
- **Keep numbers:** access checks already make guessing useless, but the count shows and the product owner decided against it.

## Consequences

- Every record kind gains one indexed column (16 bytes per row).
- Log lines keep naming records by database number (`student_id=16`): logs stay on our side and never reach the browser, and the number is one lookup away from the UUID (`public_id`). Changing every log line would add nothing a reader of the address can use.
- The frontend's ids are strings; types change from `number` to `RecordId`.
- The token claims change to UUIDs in ticket 19, which logs everyone out once at that deploy.
