---
status: accepted
---

# The Next.js server calls Django and forwards the Consultancy's host; no Caddy

Replaces the routing part of ADR 0001's setup and the spec's earlier "Caddy sends `/api/...` to Django".

The browser only ever talks to the Next.js app, at the Consultancy's subdomain (e.g. `acme.<product-domain>`). Every API call is made by the Next.js **server** (route handlers and server actions), which calls Django on an internal address (`BACKEND_BASE_URL`, e.g. `http://backend:8000/api/`) and sends the browser's host in `X-Forwarded-Host`. Django, with `USE_X_FORWARDED_HOST = True`, resolves the Consultancy (schema) from that host exactly as before. Django is never reachable from the internet. This is the pattern our other product uses and runs in production.

## Why

- One less moving part: no Caddy container and no Caddyfile. Next.js is the only public service.
- Django's address, its errors and its headers stay private. The browser can't call Django directly, so it can't send it a host it chose.
- Server-side calls can add things the browser must not control: the forwarded host, a correlation ID for logs, and a shared internal secret.

## Rules that make it safe

Because Django trusts `X-Forwarded-Host`, anyone who could reach Django directly could pick any Consultancy. So:

1. **Django is internal only.** Locally it publishes no port and sits on the private Compose network. In production (ADR 0025) it is the same: it publishes no port and sits on the private Docker network with Next.js; only `cloudflared` reaches Next.js, and the server opens no inbound port.
2. **A shared internal secret.** Next.js sends `X-Internal-Token: <INTERNAL_API_TOKEN>` on every call. Django refuses any request without the right token (constant-time compare). This holds even if rule 1 is ever broken by mistake.
3. **Next.js sets the forwarded host itself**, from the incoming request's host, and never passes through an `X-Forwarded-Host` the browser sent.
4. **`ALLOWED_HOSTS` stays strict** (`.<product-domain>`), never `*`, in every environment.
5. **A login belongs to one Consultancy.** Every JWT carries `tenant_schema`; Django refuses a token whose schema isn't the request's, or that has none (ADR 0003).

## Authentication

JWTs held by the Next.js server, never by browser JavaScript: see ADR 0003.

## Consequences

- The frontend's API layer moves from browser `fetch("/api/...")` to a server-side client. Client components call Next.js route handlers or server actions, never Django.
- HTTPS ends at Cloudflare. Cloudflare's proxied wildcard DNS (`*.<product-domain>`) sends every Consultancy's address to the same server, keeping the original host, and a Cloudflare Tunnel (`cloudflared` on the Compose network) carries it to Next.js. The server opens no inbound port and needs no certificate or load balancer. Decided with issue 31.
- Every Django log line carries the Consultancy and a correlation ID that Next.js generates per request (issue 43).
- Local development: `http://acme.localhost:3000` (Next.js). Django has no public port.
