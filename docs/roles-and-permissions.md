# Roles and permissions

Roles are the enum `UserRole` in `backend/src/main/java/com/equipment/entity/UserRole.java`:

- `USER`
- `ADMIN`
- `SUPER_ADMIN`

Spring authorities are `ROLE_USER`, `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`.

## USER (student / faculty)

Typical portal prefix: `/user/...`

Can:

- Register (public form always creates `USER`)
- Verify email, log in, reset password
- Browse the **AI-ranked** catalog and item details (Recommended badge on top matches)
- Create a borrow request for their college
- View and cancel **pending** requests
- Update name/phone and change password (email is not editable in the settings UI)

Cannot:

- Approve requests, edit inventory, or run check-in/out
- Open `/admin` or `/superadmin` (frontend guard + backend role checks)

## ADMIN (college admin)

Typical portal prefix: `/admin/...`  
Must belong to an **ACTIVE** college.

Can:

- See college dashboard, inventory, requests, checking, college settings
- CRUD equipment and units for **their** `tenantId`
- Approve or reject pending requests
- Check items out and in (including scan by serial)
- List users in their college (`GET /api/tenants/{tenantId}/users`)

Cannot:

- Log in while the college is `INACTIVE` (backend returns a college-inactive error)
- Manage other colleges or create `SUPER_ADMIN` accounts
- Open the super-admin portal

Frontend extra guard: `RequireActiveAdminCollege` calls `GET /api/auth/tenant-status`.

## SUPER_ADMIN

Typical portal prefixes: `/superadmin/...` and alias `/super-admin/...`  
`tenant_id` is `null`.

Can:

- Global dashboard and system health
- Create / update / deactivate / delete colleges
- Create and manage users of any role
- Bypass tenant matching in `TenantAccess`

Cannot (by product design):

- Act as a college inventory clerk; day-to-day lending is an ADMIN job

## Frontend route gates

| Guard | Behavior |
|-------|----------|
| `GuestOnly` | If a valid session exists, send the user to their dashboard. Used on landing, login, signup, forgot-password, verification. |
| `RequireAuth allowedRoles` | No token/user → `/login`. Wrong role → `/`. |
| `RequireActiveAdminCollege` | Admin pages only if the college still exists. |

Login uses `replace: true` so the login page is not kept behind the dashboard in browser history. Logout also navigates with `replace: true`. See [security.md](security.md).
