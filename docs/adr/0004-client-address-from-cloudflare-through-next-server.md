---
status: accepted
---

# The client's address comes from Cloudflare, through the Next.js server, and is checked only against Office Networks

Clock-in must only work from the office's own internet connection (spec stories 103–105). To check that, Django needs the address the request really came from. Every request goes browser → Cloudflare → tunnel → Next.js → Django (ADR 0002), so Django's own socket only ever sees Next.js.

## Decision

1. **Cloudflare is the source.** Cloudflare sets `CF-Connecting-IP` on every request it proxies and overwrites any value the browser sent. The origin has no open inbound port (only the Cloudflare Tunnel reaches Next.js), so nothing can reach Next.js without passing through Cloudflare.
2. **Next.js passes it on under its own name.** The Next.js server reads `CF-Connecting-IP` and sends it to Django as `X-Client-IP`, next to `X-Internal-Token` and `X-Forwarded-Host`. It drops any `X-Client-IP`, `X-Forwarded-For`, `X-Real-IP` or `Forwarded` the browser sent (it already drops the last three). Locally there is no Cloudflare: when `CLIENT_IP_SOURCE=local` (allowed only when `NODE_ENV` is not `production`), Next.js sends `DEV_CLIENT_IP` (default `127.0.0.1`) so the feature can be tried.
3. **Django trusts it in one place only.** One function, `client_address(request)`, returns the parsed address from `X-Client-IP` only on a request whose internal token checked out; otherwise it returns nothing. Nothing else in Django reads client-address headers. A missing or badly formed value counts as "not on an Office Network", never as an error that reveals detail.
4. **It is only compared, never kept.** The address is matched against the Consultancy's Office Networks and only the yes/no answer is used. It is never stored on a Work Session, written to History or logged (it is personal data; the logging format in issue 43 has no field for it). The one exception is showing an Admin their own current address on the Office Networks screen so they can add it.
5. **Office Networks are narrow.** An Office Network is a single address or a range no wider than IPv4 /24 or IPv6 /48. Private, loopback, link-local and reserved addresses are refused, because Cloudflare never sees them.

## Why

- `CF-Connecting-IP` is the one value in the chain that the browser can't choose, because Cloudflare overwrites it and is the only way in.
- Using our own header name between Next.js and Django keeps the rule simple: Django never has to know which proxy headers are safe.
- Not storing the address keeps Clock-in to what the office asked for (time, and "was at the office") and avoids keeping a record of where Staff were.

## Consequences

- An office with a changing (dynamic) public address must update its Office Network when the address changes. The "Add the network I'm on now" button makes that one click. We tell the Consultancy that a static address from their internet provider avoids it.
- Staff on mobile data, a VPN or a different connection in the office can't clock in. That is intended.
- Anyone on the office connection can clock in, including from a phone. That is also intended: the rule is "at the office", not "on a given computer".
- If Cloudflare is ever removed, or Next.js ever becomes reachable another way, rule 1 stops holding and this ADR must be revisited before deploying.

## Note, 2026-11-14: Admins and Work From Home dates skip the check

Decided with the product owner on 2026-11-13 (spec stories 131 to 133, issue 87). Two people no longer need an Office Network to clock in:

- **Admins** can clock in from any network.
- **Other Staff on their Work From Home dates** (asked for by them and approved by an Admin, or set directly by an Admin) can clock in from any network on those dates. Declined, cancelled or ended dates give no permission.

Everyone else still needs an Office Network, and the rest of this decision is unchanged. The check is skipped by looking at the person's Role and their approved dates, never at the address: the address is still read only through `client_address(request)`, only compared, and never stored, written to History or logged. The "Home" label on a day in Working hours comes from the approved dates, not from the address.
