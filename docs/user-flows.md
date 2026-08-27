# User flows

## Signup and verification

```mermaid
flowchart TD
  A[Signup form] --> B[POST /api/auth/register]
  B --> C[USER created, email unverified]
  C --> D[Email 6-digit OTP]
  D --> E[Verification page]
  E --> F[POST /api/auth/verify-registration]
  F --> G[Email marked verified]
  G --> H[Login]
```

- OTP type: `REGISTRATION_OTP` (about 10 minutes).
- Resend: `POST /api/auth/resend-verification`.
- **Email cooldown:** 60 seconds between auth emails (signup, resend, forgot password). The API returns **429** if the user requests another message too soon. The verification page also disables Resend for 60 seconds.
- A legacy link flow still exists: `GET /api/auth/verify-email?token=`.

## Login and session

1. `POST /api/auth/login` with email, password, and optional `rememberMe`.
2. Backend checks password, email verified, college not removed, and (for ADMIN) college `ACTIVE`.
3. Response body includes `accessToken` and user fields. Refresh token is set as cookie `refresh_token` (30 days if Remember me, otherwise a session cookie).
4. Frontend stores the access token and user snapshot in `localStorage` (Remember me) or `sessionStorage` (session only), then **replaces** history with the role dashboard.
5. Authenticated visitors who open `/login` or `/` are sent back to that dashboard (`GuestOnly`).

## Password reset

1. `POST /api/auth/forgot-password` → OTP email (`PASSWORD_RESET_OTP`, about 5 minutes).
2. `POST /api/auth/verify-reset-otp` → temporary password emailed.
3. Alternate: `POST /api/auth/reset-password` with a link token (`PASSWORD_RESET`).

Forgot-password does not reactivate a locked account or skip email verification. The same **60 second email cooldown** applies as on signup/resend.

## Catalog recommendation

Path: `/user/catalog` → `GET /api/catalog/equipment`

The list is ordered by AI relevance score (personal category, college demand in 30 days, university check-outs). The top three items are flagged `recommended` and shown with a **Recommended** badge. Details: [ai-recommendation.md](ai-recommendation.md).

## Borrow lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING: User submits request\n(if approval required)
  [*] --> APPROVED: Auto-approve\n(if college setting off)
  PENDING --> APPROVED: Admin approve
  PENDING --> REJECTED: Admin reject
  PENDING --> CANCELLED: User cancel\nor college deactivated
  APPROVED --> ON_LOAN: Admin CHECK_OUT
  ON_LOAN --> RETURNED: Admin CHECK_IN
```

Unit statuses move with check-out / check-in:

- Check-out: unit `AVAILABLE` → `BORROWED`, request → `ON_LOAN`
- Check-in: unit → `AVAILABLE` or `MAINTENANCE`, request → `RETURNED`

`BORROWED` on a **request** is treated as an on-loan alias in some check-in paths (legacy/seed data).

## Checking (admin)

Path: `/admin/checking`

- Pending handovers: approved requests not yet checked out
- Pending returns: items on loan
- Scan: `POST /api/tenants/{tenantId}/check-transactions/scan` with `{ serialNo }`

Check-in is only allowed from `ON_LOAN` / `BORROWED`. Scan must match the correct student when several approved requests exist.

## Super admin college lifecycle

| Action | Effect |
|--------|--------|
| Create college | Status `ACTIVE`, optional settings (`maxBorrowDays`, `approvalRequired`, `cutoffTime`) |
| Set `INACTIVE` | Admin login blocked; pending requests cancelled |
| Delete college | Cascade inventory and requests; users detached and deactivated |

USER layout and ADMIN layout poll tenant status and force logout with an error query on the login page when the college is gone.
