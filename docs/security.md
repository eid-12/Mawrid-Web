# Security

## Backend filter chain

`SecurityConfig`:

- CSRF disabled (stateless JWT API)
- CORS: `allowCredentials=true`, origin = `app.frontend.url`
- Session policy: STATELESS
- `JwtAuthenticationFilter` reads `Authorization: Bearer`
- Invalid/expired JWT is ignored (request stays anonymous → 401/403)

Public matchers are listed in [api-reference.md](api-reference.md). Everything else requires authentication. Role and tenant rules are enforced in controllers via `TenantAccess`.

## Tokens

| Token | Storage | Lifetime (defaults) |
|-------|---------|---------------------|
| Access JWT | Frontend `localStorage` (`mawrid_access_token`) | 2 hours |
| Refresh | HttpOnly cookie `refresh_token` (SameSite=Lax) + hash in `refresh_tokens` | 30 days |

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

Planting a fake token in `localStorage` is not enough: `GET /api/auth/me` fails and the client clears the session.

## Data isolation

- ADMIN APIs are under `/api/tenants/{tenantId}/...` and must match the JWT tenant.
- SUPER_ADMIN has `tid` null and may pass any tenant id.
- Public register cannot choose `ADMIN` / `SUPER_ADMIN`.

## Email and OTP

- **Email cooldown:** 60 seconds between outbound auth emails per user (`users.last_sent_at`). Repeated signup / resend / forgot-password calls return **HTTP 429**.
- The verification page also shows a 60s resend timer in the browser; the API cooldown is authoritative.
- OTP and reset tokens stored as hashes in `user_tokens`.
- If `MAIL_PASSWORD` is empty, the API still starts; sending is skipped (`EmailService`).

## Known deployment notes

- Refresh cookie uses `secure=false` in code so local HTTP works. Production should be HTTPS; consider enabling `secure` when serving only TLS.
- XSS on the SPA could steal the access token from `localStorage`. Keep dependencies updated and avoid `dangerouslySetInnerHTML` with user HTML.
