/** Where a login belongs: a Consultancy's Staff, or the Platform's admins. */
export const AUTH_SCOPES = ["staff", "platform"] as const;
export type AuthScope = (typeof AUTH_SCOPES)[number];

/** A person's login tokens as kept in the sealed cookie. */
export type AuthTokens = { access: string; refresh: string; scope: AuthScope };

/** What sealing and opening need: the server's key and the host the cookie belongs to. */
export type SealOptions = { key: Uint8Array; host: string };

/** A two-step challenge kept between the password and the number (issue 61). */
export type PendingChallenge = { challenge: string; scope: AuthScope };
