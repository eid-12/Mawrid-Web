# Security

## Backend filter chain

`SecurityConfig`:

- CSRF disabled (stateless JWT API)
- CORS: `allowCredentials=true`, origin = `app.frontend.url`, `Retry-After` exposed
- Session policy: STATELESS
- `AuthEmailRateLimitFilter` then `JwtAuthenticationFilter` (`Authorization: Bearer`)
- Invalid/expired JWT is ignored (request stays anonymous → 401/403)

Public matchers are listed in [api-reference.md](api-reference.md). Everything else requires authentication. Role and tenant rules are enforced in controllers via `TenantAccess`.

## Tokens

| Token | Storage | Lifetime (defaults) |
|-------|---------|---------------------|
| Access JWT | `localStorage` if Remember me is checked; otherwise `sessionStorage` (`mawrid_access_token`) | 2 hours |
| Refresh | HttpOnly cookie `refresh_token` (SameSite=Lax) + hash in `refresh_tokens` | 30 days if Remember me; session cookie (cleared when the browser closes) if not |

Login body includes optional `rememberMe` (boolean). Omitted or `false` is a session-only login. Refresh rotation copies the original Remember-me flag onto the new cookie.

The last Remember-me choice is stored in `localStorage` as `mawrid_remember_me` (`1` / `0`) so the checkbox can restore itself. Logout clears tokens, not that preference.

Access JWT claims include email (`sub`), user id (`uid`), tenant id (`tid`), and role.

Refresh tokens are rotated on each `/api/auth/refresh`. Logout revokes the hash and clears the cookie.

Set `APP_JWT_SECRET` in production. Do not rely on the development default in `application.properties`.

## Frontend session rules

- `RequireAuth` waits for hydrate, then requires both user state and an access token.
- `GuestOnly` sends an existing session away from login/signup/landing.
- Successful login navigates with `{ replace: true }` so Back does not keep a fake “logged out” login page while the token is still valid.
- Logout navigates to `/login` with `{ replace: true }`.
- `pageshow` / `popstate` / `storage` / `visibilitychange` re-read the token so Back/Forward and other tabs cannot keep a dead session on screen.
- HTML `Cache-Control: no-store` on `index.html` (meta + Nginx) reduces bfcache of a logged-in shell.

Planting a fake token in storage is not enough: `GET /api/auth/me` fails and the client clears the session.

## Data isolation

- ADMIN APIs are under `/api/tenants/{tenantId}/...` and must match the JWT tenant.
- SUPER_ADMIN has `tid` null and may pass any tenant id.
- Public register cannot choose `ADMIN` / `SUPER_ADMIN`.

## Email and OTP

- **OTP lifetime:** registration codes expire after **10 minutes**; password-reset codes expire after **5 minutes**.
- **Per-user cooldown:** 60 seconds between outbound auth emails (`users.last_sent_at`). The send slot is claimed and committed **before** SMTP. Repeated signup / resend / forgot-password calls return **HTTP 429** with `Retry-After: 60`.
- **Concurrent sends:** `SELECT … FOR UPDATE` on the user row so two in-flight requests cannot both send mail. The second call waits, then receives 429.
- **IP burst cap:** `AuthEmailRateLimitFilter` allows 20 POSTs per minute per client IP on `/api/auth/register`, `/forgot-password`, and `/resend-verification`.
- The verification and forgot-password pages also show a 60s resend timer in the browser; the API cooldown is authoritative.
- OTP and reset tokens stored as hashes in `user_tokens`.
- If `MAIL_PASSWORD` is empty, the API still starts; sending is skipped (`EmailService`).

## Known deployment notes

- Refresh cookie uses `secure=false` in code so local HTTP works. Production should be HTTPS; consider enabling `secure` when serving only TLS.
- XSS on the SPA could steal the access token from `localStorage` or `sessionStorage`. Keep dependencies updated and avoid `dangerouslySetInnerHTML` with user HTML.
