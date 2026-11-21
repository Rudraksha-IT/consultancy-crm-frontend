---
status: accepted
date: 2026-11-21
---

# One VPS in Nepal behind Cloudflare Tunnel

Recorded 2026-11-21 for decisions made in ticket 15 (2026-11-19 to 2026-11-21). Supersedes ADR 0006. Builds on ADR 0002 (Django internal only), 0015 (private documents), 0023 (one SMTP account) and 0024 (safe deploys from GitHub).

## Context

- The product owner decided "right now, no AWS" (2026-11-19): pay in rupees, keep the cost to one small server, and stay fast for staff and Students in Nepal.
- The server is shared with our own IELTS platform. Memory is the tight resource; everything that can live outside the server should, as long as it stays cheap.
- Document files grow (about 30 to 55 GB in year one); the database stays small (tens of MB). Losing either is the worst thing that can happen to an office.
- The code already speaks S3 for files and plain PostgreSQL for data, so the hosting can change without changing the app.

## Decision

- **One VPS in Nepal** (VPS-02: 2 vCPU, 4 GB RAM, one 50 GB NVMe disk, Ubuntu 24.04, KVM). Hardened once: automatic security updates, a firewall that lets nothing in, key-only SSH with no root login, fail2ban, the Nepal time zone with NTP, and a 2 GB swap file.
- **Cloudflare stays in front:** proxied wildcard DNS and HTTPS for every office's address, and a **Cloudflare Tunnel** (`cloudflared` in a container) that carries requests to Next.js and GitHub's deploys to the server's sshd (Cloudflare Access). The server opens **no inbound port**.
- **PostgreSQL 17 in a container** on the server (pinned image, named volume, private network only, its own password, memory limit 512 MB, settings sized for the server). Backend, worker and backups are the only things that reach it.
- **Files in Cloudflare R2**, not on the server: one private bucket, `crm-documents` (Asia-Pacific, public access off, no CORS), one prefix per office as the code does today, reached through the same S3 code with an R2 token that may only read and write that bucket. Short signed links as in ADR 0015. No file storage runs on the server (MinIO is unmaintained; Garage was considered and is not needed). One bucket per office (ticket 16) is put off.
- **Our own backups, none from the hosting provider:** the database every 6 hours (`pg_dump` custom format, encrypted with `age` to a public key whose private key is kept offline by the product owner), copied to a second R2 bucket, `crm-backups`, with a 14-day bucket lock and its own token; kept 14 days, then weekly for 8 weeks; a nightly run from GitHub also checks the newest backup is recent and keeps one more copy as a 7-day artifact. Restores go into a new database, never over the live one, and are tested monthly. Files are already off the server in R2; a second copy elsewhere can come later.
- **Images from GitHub's registry (GHCR)**, built by CI and only pulled on the server (ADR 0024). The code repositories are public on GitHub's free plan, so Actions and image storage cost nothing.
- **Secrets** only in the env files on the server (mode 600, owned by the `deploy` user) and in the password manager. No cloud secret service.
- **Email** through Brevo's SMTP (ADR 0023 needs only SMTP values).

## Considered options

- **AWS (EC2, RDS, S3; ADR 0006):** managed database and backups, but billed in dollars and slower from Nepal. Rejected for now.
- **Files on the server (MinIO or Garage on a data disk):** no per-GB fee, but needs a bigger disk, memory for the store and its own off-site backup. R2 has no download fees and keeps files off the server. Rejected.
- **The provider's snapshots as the backup:** they sit in the same building as the server. Not relied on.
- **Backblaze B2 for backups:** cheaper per GB, but R2 is already in use and has no download fees. Not chosen.

## Consequences

- One server is a single point of failure: when it is down, the app is down. Data is safe: files in R2, the database at most 6 hours behind in `crm-backups`.
- Restoring the database means a new server or database, a backup fetched and decrypted with the private key, `restore.sh`, and a deploy. Losing the private key means no backup can be opened; it is kept in two places.
- A database major-version upgrade needs a dump and restore, planned like a migration.
- Everything on the server must fit the memory budget (docs/deployment.md, Budget), shared with the IELTS platform. The first step when it no longer fits: the IELTS platform gets its own server.
- AWS wording in older ADRs (0002, 0003, 0007, 0009, 0013 to 0016, 0018, 0023) is corrected where it is now wrong; ADR 0006 is kept, marked superseded.
