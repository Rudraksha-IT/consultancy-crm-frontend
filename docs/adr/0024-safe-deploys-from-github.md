---
status: accepted
date: 2026-11-20
---

# Deploys keep everyone logged in, switch only to a healthy version, roll back by themselves, and run from GitHub with a single-purpose SSH deploy key (no AWS)

Decided 2026-11-20 in ticket 14 of `work/2026-11-18-emails-files-and-fee-types`. Changes ADR 0006: images are kept in GitHub's registry, not ECR, and deploys are started by GitHub, not by hand. The rest of ADR 0006 (one server, Cloudflare Tunnel, memory limits) stands. Builds on ADRs 0002 and 0003.

## Context

- Each deploy used to be a person on the server running `deploy.sh`. A broken image stayed live until someone noticed, and nobody could tell afterwards what had been deployed, when or why.
- Staff were sent to the login page, without a word, whenever Django restarted or a login ended, and lost the page they were on.
- The server is a small VPS in Nepal, not AWS (ticket 15), so ECR and IAM roles are gone. GitHub already holds the code and runs every check.
- GitHub must be able to start a deploy, but a key that opens a shell on the server would give anyone who steals it the whole server and every office's data.

## Decision

- **No one is logged out by a deploy.** Logins are JWTs in the Next.js server's sealed cookie (ADR 0003); a deploy changes neither `JWT_SIGNING_KEY` nor `AUTH_COOKIE_KEY`. While Django restarts, the Next.js server waits and tries a read again for up to 20 seconds; a change (POST, PUT, PATCH, DELETE) is never tried twice. If Django is still away, the screen says "The app is being updated. Please try again in a moment." A login that really ended says "You've been logged out" and returns the person to the page they were on after they log in again.
- **Health checks.** Django answers `/api/health/` (only with the internal token; the Next.js proxy never forwards it) and Next.js answers `/healthz`. Docker Compose checks both, and starts the frontend only once the backend is healthy.
- **`deploy.sh` switches only to a healthy version and goes back by itself.** One deploy at a time (a lock). Before a backend deploy it keeps a copy of the database (the last 5). Migrations wait at most 5 seconds for a lock, then fail instead of stopping the app. It starts the new container and waits for it to be healthy; if it isn't, it starts the last good version again and the deploy fails. It records each deploy (who, why, which commits, how long the app was interrupted) and keeps `current` and `last-good`. `rollback` goes back to the last good version by hand.
- **Images live in GitHub's registry** (`ghcr.io/<owner>/consultancy-crm-<app>:<commit>`), private, pushed with each run's own token, and the server pulls them with a read-only token. A weekly job keeps the newest 20 of each.
- **GitHub deploys.** A merge into `main` runs every check, builds the image and deploys it (the `deploy` job in `ci.yml`). `deploy.yml` deploys any commit, branch or tag by hand (its image is built and checked first if missing), rolls back, or shows what is live, and asks for a reason. A commit that isn't on `main` waits for a second person's approval in the `production-approval` environment. Deploys never run at the same time and are never cancelled halfway.
- **A single-purpose SSH deploy key.** The server's `deploy` user has one key, held only by GitHub's `production` environment, locked in `authorized_keys` with `command="/opt/crm/deploy/ci-entry.sh",no-pty,no-port-forwarding,no-agent-forwarding,no-X11-forwarding`. Whatever is asked, sshd runs `ci-entry.sh`, which accepts exactly `deploy <app> <commit> <who> [reason]`, `deploy both ...`, `rollback <who> [reason]` and `status`, checked word by word, and passes the values to `deploy.sh` as separate arguments, never through a shell. Anything else is refused and logged without its text. GitHub pins the server's host key. SSH reaches the server through the Cloudflare Tunnel with a Cloudflare Access service token, so no port is opened.

## Considered options

- **The server pulls on a timer (Watchtower or a cron job):** no key in GitHub, but no checks before a deploy, no approval, no result in GitHub, and a deploy at any moment. Rejected.
- **A GitHub self-hosted runner on the server:** runs any workflow's code on the server, and needs memory the server doesn't have. Rejected.
- **A normal SSH key with sudo:** whoever steals it owns the server. Rejected for the locked key.
- **Blue-green (two copies running):** no interruption at all, but twice the memory. The 2 to 12 seconds of waiting while a container restarts are covered by the Next.js server's retry. Rejected for now.
- **Keeping ECR:** needs AWS only for images. Rejected with the move off AWS.

## Consequences

- A broken version is never left live: the deploy fails in GitHub and the last good version runs.
- Changing `JWT_SIGNING_KEY` or `AUTH_COOKIE_KEY` logs everyone out; `DJANGO_SECRET_KEY` does not. Change them only when needed, outside office hours.
- The database is never rolled back by a deploy. Migrations must work with the previous code (add first, remove in a later deploy); a bad migration is fixed with a new migration or by restoring the copy taken before the deploy.
- When both apps change together, the backend is merged and deployed first (the pull request template asks).
- The deploy key, the host key, the Cloudflare Access token and the approval reviewers must be set up once and kept (`docs/deployment.md` in the workspace).
