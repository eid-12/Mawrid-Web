# API reference

Base URL:

- Production (same origin): `/api`
- Local backend: `http://localhost:8080/api`

Unless noted, endpoints require `Authorization: Bearer <accessToken>`.  
Refresh uses the HttpOnly cookie `refresh_token` (`credentials: include`).

## Public (no JWT)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/register` | Create USER and send OTP |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | New access token |
| POST | `/api/auth/logout` | Revoke refresh + clear cookie |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/resend-verification` | Resend signup OTP |
| POST | `/api/auth/verify-registration` | Confirm signup OTP |
| POST | `/api/auth/verify-reset-otp` | Confirm reset OTP |
| POST | `/api/auth/reset-password` | Reset via link token |
| GET | `/api/auth/verify-email` | Legacy verify-by-link |
| GET | `/api/tenants/public/active` | Colleges for signup dropdown |
| GET | `/actuator/health` | Health check |
| OPTIONS | `/**` | CORS preflight |

All other `/api/**` routes require authentication.

Auth email endpoints (`register`, `resend-verification`, `forgot-password`) enforce a **60 second cooldown** per user. Excess calls return **HTTP 429** with `{ "error": "Please wait 60 seconds before requesting another email." }`. See [security.md](security.md).

## Auth (authenticated)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/auth/me` | Current profile |
| PUT | `/api/auth/me` | Update name / phone / college |
| GET | `/api/auth/tenant-status` | College id + status |
| POST | `/api/auth/change-password` | Change password |

## Super admin — colleges

Prefix: `/api/tenants`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/` | Create college |
| GET | `/` | Paginated list |
| GET | `/list-all` | Full list |
| GET | `/active` | Active colleges |
| GET | `/stats` | College stats |
| GET | `/{id}` | One college |
| PUT | `/{id}` | Update (including status) |
| DELETE | `/{id}` | Delete + cascade |
| GET | `/{tenantId}/settings` | Settings |
| PUT | `/{tenantId}/settings` | Update settings (ADMIN of that college) |

## Super admin — users

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users` | Paginated users |
| GET | `/api/users/stats` | Counts by role |
| POST | `/api/users` | Create user |
| PUT | `/api/users/{id}` | Update user |
| DELETE | `/api/users/{id}` | Delete user |
| GET | `/api/users/{id}` | Summary |
| GET | `/api/tenants/{tenantId}/users` | Users in a college (ADMIN) |

## Super admin — global dashboard

Prefix: `/api/dashboard`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stats` | Global KPIs |
| GET | `/college-stats` | Per-college stats |
| GET | `/recent-activity` | Activity feed (`limit`) |
| GET | `/system-health` | Health snapshot |

## Equipment and catalog

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/catalog/equipment` | User catalog (ranked; includes `relevanceScore` and `recommended`) |
| GET | `/api/catalog/equipment/{id}` | Catalog detail |
| POST | `/api/tenants/{tenantId}/equipment` | Create equipment |
| GET | `/api/tenants/{tenantId}/equipment` | College inventory |
| GET | `/api/equipment/{id}` | Equipment by id |
| PUT | `/api/equipment/{id}` | Update |
| DELETE | `/api/equipment/{id}` | Delete |
| POST | `/api/equipment-units` | Create unit |
| GET | `/api/tenants/{tenantId}/equipment-units` | Units in college |
| GET | `/api/equipment/{equipmentId}/units` | Units for an item |
| GET | `/api/equipment-units/{id}` | Unit by id |
| PUT | `/api/equipment-units/{id}` | Update unit |
| DELETE | `/api/equipment-units/{id}` | Delete unit |

## Borrow requests

College-scoped (admin): `/api/tenants/{tenantId}/borrow-requests`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/` | Create (admin/context) |
| GET | `/` | List |
| GET | `/search` | Search (`q`, `statuses`, `page`, `size`) |
| GET | `/{id}` | One request |
| POST | `/{requestId}/approve` | Approve |
| POST | `/{requestId}/reject` | Reject |

User-scoped: `/api/users/{userId}/borrow-requests`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/` | Create own request |
| GET | `/` | List own (or admin/super-admin) |
| POST | `/{requestId}/cancel` | Cancel pending |

## Check-in / check-out

Prefix: `/api/tenants/{tenantId}/check-transactions`

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/` | Create CHECK_OUT or CHECK_IN |
| GET | `/` | All transactions |
| GET | `/pending-checkouts` | Approved, not yet handed over |
| GET | `/pending-returns` | On loan |
| GET | `/requests/{requestId}/available-units` | Units for handover |
| POST | `/scan` | Body `{ "serialNo": "..." }` |
| GET | `/by-request/{requestId}` | History for a request |

## Admin dashboard

Prefix: `/api/tenants/{tenantId}/dashboard`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stats` | KPIs |
| GET | `/recent-activity` | Feed (`limit`) |
| GET | `/alerts` | Alerts |
| POST | `/alerts/dismiss` | Body `{ "alertKey": "..." }` |

## Error shape

Failed requests typically return JSON with `error` and sometimes `code` (for example `COLLEGE_INACTIVE`, `COLLEGE_REMOVED`). The frontend maps these on login and in layouts.
