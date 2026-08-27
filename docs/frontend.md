# Frontend

The client is a Vite + React + TypeScript SPA in `frontend/`.

Dev server: `http://localhost:5173` (proxies `/api` → `http://localhost:8080`).  
Production: static files from `dist/` served by Nginx on port **3000**.

## Boot sequence

1. `src/main.tsx` mounts the app.
2. `src/app/App.tsx` wraps the tree in `AuthProvider` and `RouterProvider`.
3. `AuthContext` hydrates from `GET /api/auth/me` when an access token exists.
4. `routes.tsx` chooses public vs protected trees.

## Environment

`VITE_API_BASE_URL` is **required** (`frontend/.env.example` uses `/api`).  
Docker build-arg: `VITE_API_BASE_URL=/api` (same-origin + Nginx proxy).

## Route map

| Path | Guard | Screen |
|------|-------|--------|
| `/` | GuestOnly | Landing |
| `/login` | GuestOnly | Login |
| `/signup` | GuestOnly | Signup |
| `/forgot-password` | GuestOnly | Forgot password |
| `/verification`, `/verify-email` | GuestOnly | OTP / email verification |
| `/reset-password` | Public | Token reset form |
| `/user/dashboard` | USER | Dashboard |
| `/user/catalog` | USER | Catalog ranked by AI recommendation; **Recommended** badge on top matches |
| `/user/catalog/:id` | USER | Item details + request |
| `/user/requests` | USER | My requests |
| `/user/settings` | USER | Profile & password |
| `/admin/dashboard` | ADMIN + active college | College dashboard |
| `/admin/inventory` | ADMIN + active college | Equipment & units |
| `/admin/requests` | ADMIN + active college | Approve / reject |
| `/admin/checking` | ADMIN + active college | Check-in / out |
| `/admin/settings` | ADMIN + active college | College settings |
| `/superadmin/dashboard` | SUPER_ADMIN | Global dashboard |
| `/superadmin/colleges` | SUPER_ADMIN | Colleges |
| `/superadmin/users` | SUPER_ADMIN | User management |
| `/superadmin/settings` | SUPER_ADMIN | Super-admin settings |
| `/super-admin/*` | SUPER_ADMIN | Same as `/superadmin/*` |
| `*` | — | Not found |

## API client (`src/app/api/client.ts`)

- JSON `fetch` with `credentials: "include"` and `cache: "no-store"`
- Attaches `Authorization: Bearer` when a token is in memory / `localStorage` (`mawrid_access_token`)
- User snapshot: `localStorage` key `mawrid_auth_user`
- On **401**, tries `POST /api/auth/refresh` once, then fires `mawrid:auth-expired` and clears storage

## UI conventions

- Brand gradient: `#8CCDE6` → `#87ABE7` → `#8393DE`
- Layout: sidebar + main (role layouts)
- Dark mode: theme toggle in the shell
- Dates for pickers: local calendar helpers in `src/app/lib/dateUtils.ts` (avoid UTC `toISOString()` drift)

## Key source files

| Concern | Path |
|---------|------|
| Routes | `src/app/routes.tsx` |
| Auth state | `src/app/auth/AuthContext.tsx` |
| Login | `src/app/pages/Login.tsx` |
| Catalog UI | `src/app/pages/user/Catalog.tsx` |
| Nginx | `nginx.conf` |

Catalog ranking and the 60s resend timer: [ai-recommendation-and-rate-limiting.md](ai-recommendation-and-rate-limiting.md).
