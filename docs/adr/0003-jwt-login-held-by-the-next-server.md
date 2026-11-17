---
status: accepted
---

# Log in with JWTs, held by the Next.js server

Replaces "Django session cookies, no JWTs" in ADR 0001 and the spec, and the "Authentication stays sessions" part of ADR 0002. Chosen to match our other product.

## Decision

- **Django issues JWTs** with `djangorestframework-simplejwt`: a short access token (15 minutes) and a refresh token (7 days), with rotation and a blacklist. The blacklist tables live in each Consultancy's schema (and in the public schema for Platform Admins), so a token can only ever be looked up where it was issued.
- **Every token says where it belongs.** Claims: `tenant_schema` (the Consultancy's schema, or `public` for a Platform Admin), `kind` (`staff`, `platform_admin` or `support_access` with the visit id), `auth_version` and the usual `user_id`, `exp`, `jti`.
- **Django checks the claim on every request.** A middleware after the host middleware refuses a token whose `tenant_schema` isn't the request's schema, and also refuses a token with no `tenant_schema` at all (stricter than our other product, which lets a missing claim through). A Platform Admin token works only on the Platform host; a Support Access token only on its Consultancy, during its visit.
- **The browser never sees a token.** The Next.js server keeps both tokens in one encrypted, HTTP-only, Secure, `SameSite=Lax` cookie scoped to the Consultancy's subdomain (as next-auth does). The `/api` route handler (issue 41) adds `Authorization: Bearer <access>` when it calls Django, and uses the refresh token to get a new access token when it has expired. Tokens never go in `localStorage`, in a URL, or in a log.
- **Signing out works at once.** Logout blacklists the refresh token and clears the cookie. Changing a password, "Sign out of other devices", a reset by Code, deactivation and a Platform Admin's sign-out all raise the person's `auth_version` and blacklist their outstanding refresh tokens; the authentication class refuses any access token whose `auth_version` is old, so even a 15-minute access token stops working immediately.
- **CSRF.** Django needs no CSRF check for Bearer calls. Because the browser's cookie goes to Next.js, the route handler refuses any change (POST, PUT, PATCH, DELETE) whose `Origin` isn't the request's own host, on top of `SameSite=Lax`.
- **Signing key.** `JWT_SIGNING_KEY` from the environment (at least 32 bytes), separate from `DJANGO_SECRET_KEY`.

## Consequences

- Issues 02, 04 and 05 built session login; issue 45 replaces it (backend login/logout/refresh endpoints, the authentication class, the Next.js token cookie) and keeps every existing test passing in the new shape.
- "Signed-in devices" (issue 38) is the person's outstanding refresh tokens.
- Tenant isolation tests gain: a token from Consultancy A is refused on B even when B has a Staff member with the same id; a Platform Admin token is refused on a Consultancy host; a token without `tenant_schema` is refused.
