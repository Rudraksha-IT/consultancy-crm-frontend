---
status: accepted
date: 2026-11-17
---

# Production runs on one micro EC2 instance behind a Cloudflare Tunnel

Recorded 2026-11-17 for decisions made in issues 31 and 60. Builds on ADR 0002.

## Context

- We expect a handful of Consultancies at first. One small instance is the cheapest setup that still keeps the database managed and backed up.
- The tunnel removes the whole class of "open port" attacks and makes the client-address rule in ADR 0004 hold: nothing reaches Next.js without passing Cloudflare.
- Prebuilt images keep the micro instance from running out of memory during a build.

## Decision

- **One t3.micro EC2 instance (1 GiB RAM)** runs four containers with Docker Compose: Django (gunicorn), the job worker (ADR 0008), Next.js and `cloudflared`.
- **Cloudflare** holds proxied wildcard DNS (`*.<product-domain>`) and ends HTTPS for every office's address. A **Cloudflare Tunnel** carries requests to Next.js with their original host. The server opens **no inbound port**, needs no certificate and has no load balancer or reverse proxy.
- **RDS PostgreSQL** with automatic backups holds the data. **Private S3** holds Document files, one prefix per Consultancy. The instance reaches S3 and ECR through an IAM role, so no AWS keys are on the server.
- **Images are built by CI** (or a laptop until CI is connected), pushed to ECR and only pulled on the server. `deploy.sh` pulls two tagged images, runs migrations once and only then switches. Rolling back is deploying the previous tags.
- **Memory limits** keep the whole stack inside the instance: backend 288 MB, worker 160 MB, frontend 256 MB, cloudflared 64 MB (768 MB in total), plus a 2 GiB swap file. Containers have read-only filesystems and log rotation.

## Considered options

- **Application Load Balancer + ACM certificate:** about the same price as the instance itself, and needs an open port. Rejected.
- **ECS Fargate or Kubernetes:** more to operate, more cost, no gain at this size. Fargate is the upgrade path when one instance is no longer enough.

## Consequences

- Every change must fit the memory budget. Heavy libraries, Redis and Celery are out (ADR 0008).
- Migrations must work with the previous code version (add first, remove or rename in a later deploy), because the database does not roll back.
- One instance is a single point of failure. Data is safe in RDS and S3; the app is down until the instance comes back.
