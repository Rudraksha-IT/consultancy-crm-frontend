# Consultancy CRM — frontend

Next.js (App Router) + TypeScript (strict). The browser calls the API on the **same origin**
(`/api/...`); this app's server forwards those calls to Django, which is never reachable from the
browser (ADR 0002; see "Run the whole app" below for how a request flows).

## Layout

```
frontend
├─ src
│  ├─ app                         ► layout.tsx · error.tsx · globals.css · login/ · (app)/ (Staff shell)
│  │  └─ platform                 ► login/page.tsx · (console)/layout.tsx · (console)/page.tsx · (console)/consultancies/new/page.tsx
│  ├─ components
│  │  ├─ ui                       ► TextField.tsx · FieldNote.tsx
│  │  └─ features                 ► auth/ · consultancy/ · home/ · shell/ · platform/ (component + hook + test leaves each)
│  ├─ hooks                       ► useFullPageNavigation.ts · useSession.ts
│  ├─ app/api/[...path]/route.ts  ► forwards every browser `/api/...` call to Django (server only)
│  ├─ instrumentation.ts          ► stops the server at startup without valid server settings (lib/config/startupCheck)
│  ├─ lib                         ► api/ (browser client, one folder per area: core (client, errors, types), auth, platform, students, applications, documents, catalogue, money, staff, classes, office, workspace; index.ts exports all) · auth-cookie/ (server: sealed login cookie) · backend/ (server: forwardToBackend, session, refresh, backendCall, requestHeaders, requestBody, responses, tokenCookie) · config/ (server settings) · navigation/
│  └─ constants                   ► api.ts · messages.ts · modules.ts · navigation.ts · roles.ts · routes.ts
├─ .github/workflows              ► ci.yml
├─ .husky                         ► pre-commit
└─ (root)                         ► package.json · tsconfig.json · eslint.config.mjs · .prettierrc.json · vitest.config.mts · vitest.setup.ts · next.config.ts · Dockerfile
```

- `lib/api` is the only place the browser calls `fetch`; import from `@/lib/api`. Every response is validated with `zod`
  and failures surface as `ApiRequestError`.
- `lib/backend` and `lib/config` are server only (`import "server-only"`): they hold the internal
  token and Django's address, which must never reach the browser bundle.
- Feature components read data through their own hooks, never `fetch` directly.
- The Platform screens live under `/platform` (login, Consultancy list, new Consultancy) and only
  work on the Platform subdomain; elsewhere their API calls answer 404.

## Development

Requires Node 20.19+ (CI and Docker use Node 22) and pnpm (`corepack enable`).

```bash
pnpm install                 # also installs the husky pre-commit hook inside a git checkout
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

- `pnpm test` runs Vitest + React Testing Library once with coverage (fails under 90%);
  `pnpm test:watch` watches.
- The pre-commit hook runs prettier and eslint on staged files (lint-staged), then `tsc`.
- CI (`.github/workflows/ci.yml`) runs format check, lint, type check, tests and build; any
  failure blocks the merge.

### Server settings

The server needs these (validated with zod at startup, `src/lib/config`; never `NEXT_PUBLIC_*`):

| Variable             | Example                                      | What                                                         |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `BACKEND_BASE_URL`   | `http://backend:8000`                        | Django's internal address (no path)                          |
| `INTERNAL_API_TOKEN` | 32+ random characters                        | Sent to Django as `X-Internal-Token`; same value as Django's |
| `AUTH_COOKIE_KEY`    | 32 bytes, base64 (`openssl rand -base64 32`) | Seals the login cookie (AES-256-GCM)                         |
| `AUTH_COOKIE_SECURE` | `true` (default) or `false`                  | `false` only for local plain HTTP                            |
| `PRODUCT_DOMAIN`     | `localhost`                                  | Only `<subdomain>.<PRODUCT_DOMAIN>` hosts are forwarded      |

`pnpm dev` needs them in `.env.local` (see `sample.env.frontend`) and a Django it can reach. The easy way
is the whole stack from the parent directory (`docker compose up`).

## Commits

Every commit message follows [Conventional Commits](https://www.conventionalcommits.org):

```
type(scope): summary in small letters, no full stop, first line at most 72 characters

Optional body after a blank line: what changed and why.
```

`type` is one of `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`,
`chore` or `revert`; add `!` after it for a breaking change (`feat(clock)!: ...`). Examples:
`feat(clock): add weekly days off`, `fix(holidays): keep a range inside one year`.

No commit may credit an AI tool as co-author (`Co-authored-by: Claude ...`, `... Copilot ...`,
`Generated with ...`). A human co-author is fine.

`scripts/check-commit-message.mjs` enforces both rules as the `commit-msg` hook, which
`pnpm install` sets up (husky). The `commit-messages` job in
`.github/workflows/ci.yml` checks every pushed commit again, so skipping the hook doesn't help;
make it a required check on `main` (Settings → Branches) so nothing merges without it.

## Run the whole app

The app is two repositories: **consultancy-crm-backend** (Django) and **consultancy-crm-frontend**
(Next.js). Clone both side by side in one folder. Each has the same `compose.yaml`, which builds
its own code and the other repository from the sibling folder, so either can start everything:
Next.js, Django, PostgreSQL, MinIO and MailHog. There is no reverse proxy (ADR 0002).

```bash
mkdir consultancy-crm && cd consultancy-crm
git clone <org>/consultancy-crm-backend.git
git clone <org>/consultancy-crm-frontend.git
cd consultancy-crm-backend   # or consultancy-crm-frontend
docker compose up -d --build
```

Then open <http://acme.localhost:8080> (the demo office, ready after about a minute; see
"Demo office" below) or the Platform at <http://admin.localhost:8080/platform>.

### How a request flows

```
browser ── acme.localhost:8080 ──► Next.js (frontend, the only published port)
                                        │ pages: rendered here
                                        │ /api/...: src/app/api/[...path]/route.ts
                                        ▼
                          http://backend:8000/api/... (private Compose network only)
                          X-Forwarded-Host: acme.localhost:8080  ◄ set by Next.js, never by the browser
                          X-Internal-Token: $INTERNAL_API_TOKEN      ◄ Django refuses any call without it
                          X-Correlation-ID: <new UUID per call>
                                        ▼
                          Django resolves the Consultancy (schema) from the forwarded host
```

- The browser only ever talks to Next.js. Django publishes no port, so `curl localhost:8000`
  from this machine fails; inside the network it still answers 403 without the internal token.
- Next.js drops any `X-Forwarded-*`, `X-Internal-Token`, `Host`, `Authorization`, cookie or
  hop-by-hop header the browser sends, refuses bodies over 1 MiB (413) and calls Django takes
  over 15 s to answer (504).
- Login (ADR 0003): Django answers a login with JWTs; Next.js keeps them in one sealed (AES-GCM),
  HTTP-only, `SameSite=Lax`, host-only cookie for `/api`, sends `Authorization: Bearer <access>`
  to Django, refreshes an expired access token once and retries, and refuses any POST, PUT, PATCH
  or DELETE whose `Origin` isn't the page's own host. Browser JavaScript never sees a token.
- The services refuse to start without `INTERNAL_API_TOKEN` (both, 32+ characters),
  `JWT_SIGNING_KEY` (Django, 32+ bytes) and `AUTH_COOKIE_KEY` (Next.js, 32 bytes base64).
  No env file needs to be shared or copied: compose reads the safe local defaults in
  `sample.env.backend` and `sample.env.frontend`, then an optional `.env.backend` or
  `.env.frontend` beside `compose.yaml` (never committed) for any value you want to change. The
  examples hold placeholders only, never a real secret; production sets its own values.

A one-off `migrate` container runs the migrations (and creates the local MinIO bucket), then
exits; the backend starts only after it succeeds. The app is served on port 8080.

### Subdomains

Consultancies live at `<subdomain>.localhost`. Browsers (Chrome, Firefox) and
systemd-resolved send every `*.localhost` name to `127.0.0.1`, so no `/etc/hosts` edits are
needed. With other resolvers (e.g. macOS + `curl`), add a line per subdomain to `/etc/hosts`:
`127.0.0.1 acme.localhost`.

### Demo office (ready on the first start)

Nothing to create by hand: on a fresh stack the one-off `seed` service runs
`python manage.py seed_demo`, which creates the **Acme Education Consultancy** office through the
Platform's own setup (the worker builds its schema), then fills it with Staff, Students,
Applications, Visas, Documents, payments, tasks and two weeks of Clock-in, dated relative to today.
It takes about a minute after the app is up; `docker compose logs -f seed` shows it working. Once
the office is there the service exits at once, so later starts keep your changes. For a fresh
demo again: `docker compose down -v && docker compose up -d`.

Log in at <http://acme.localhost:8080> with password `Demo-Acme-2026!` as any of:

| Email                  | Role                       |
| ---------------------- | -------------------------- |
| `admin@acme.com`       | Admin (Ramesh Bhandari)    |
| `counsellor@acme.com`  | Counsellor (Sita Karki)    |
| `counsellor2@acme.com` | Counsellor (Bikash Thapa)  |
| `frontdesk@acme.com`   | Front Desk (Anita Gurung)  |
| `teacher@acme.com`     | Teacher (Prakash Shrestha) |

It only runs when `SEED_DEMO_DATA=true` (set in `sample.env.backend`; put
`SEED_DEMO_DATA=false` in `.env.backend` to start empty). Production never sets it and has no
`seed` service. Clock-in works in the demo because `DEMO_OFFICE_NETWORK` (backend) and
`DEV_CLIENT_IP` (frontend) hold the same public address. The demo itself is `demo/acme_seed.py`
in the backend repo: a plain script kept outside ruff and mypy; the command around it is tested.

### Platform and dev Consultancies

Platform Admins work on `admin.localhost` (override the subdomain with
`PLATFORM_SUBDOMAIN`). There is no sign-up and no command to type: the `migrate` step runs
`ensure_platform_admin`, which creates the Platform Admin from `PLATFORM_ADMIN_NAME`,
`PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD` in `.env.backend` if no Platform Admin has
that email yet (issue 59). With the sample values, log in as `admin@platform.com` /
`Local-Platform-2026!`, then change your name, email or password on the Platform's **Account**
page.

Then open <http://admin.localhost:8080/platform>, log in, and use **New Consultancy** to
create a Consultancy (name, the front part of its address, and its starting Status: Evaluation
for 14 days, or Active with a paid-until date). The rest of the address is `PRODUCT_DOMAIN` from
the backend's environment. Once it is set up, use **Add admin** on its row to invite its Admins by
Code; they log in at `http://<subdomain>.localhost:8080/`. **Change status** moves it between Evaluation, Active,
Past due, Suspended and Terminated (issue 42). Past due and Suspended are read-only for its Staff;
Terminated is final and switches off its addresses (they answer 404). No data is ever deleted.

### Central login (issue 44)

Staff who don't remember their office's address open <http://login.localhost:8080/> (override
the subdomain with `CENTRAL_LOGIN_SUBDOMAIN` in both env files), type their email, and get an email
(MailHog locally) with a link to each office they belong to; the link fills in their email. The
page answers the same for every email. Django keeps an index of keyed hashes of Staff emails
(`STAFF_DIRECTORY_KEY`, 32+ characters, never `DJANGO_SECRET_KEY`); the `migrate` container
rebuilds it with `python manage.py rebuild_staff_directory`.

A subdomain with no Consultancy, or a Terminated one, shows a "couldn't find this Consultancy" message.

### Other services

- MinIO (S3 stand-in for Documents): API on `:9000`, console on <http://localhost:9001>
  (`crm-minio` / `crm-minio-secret` by default). MinIO stopped publishing images to Docker Hub,
  so the stack uses Chainguard's `chainguard/minio` build.
- MailHog catches every email Django sends (Codes for password resets and invites): open
  <http://localhost:8025>. Nothing leaves this machine.
- Stop with `docker compose down`; add `-v` to also delete the database and MinIO volumes.
