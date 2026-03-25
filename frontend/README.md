
# Mawrid Frontend

Frontend client for the Mawrid platform (User, Admin, and Super Admin portals).

## Stack

- React 18
- Vite 6
- TypeScript
- Tailwind CSS
- `react-router`
- Radix UI + Lucide Icons

## Prerequisites

- Node.js 20+ (recommended)
- npm 9+

## Environment Variables

Create `.env` in this folder (or copy from `.env.example`):

```env
VITE_API_BASE_URL=/api
```

Notes:

- For same-domain deployment behind Nginx proxy, use `/api`.
- For direct backend calls in local development, you can use `http://localhost:8080/api`.

## Run Locally

```bash
npm install
npm run dev
```

Default Vite URL is typically:

- `http://localhost:5173` (or next available port)

## Build

```bash
npm run build
```

Build output is generated in:

- `frontend/dist`

## Docker

The frontend Docker image:

- builds with Node 20
- serves static files using Nginx on port `3000`
- proxies `/api` requests using `nginx.conf`

Main files:

- `frontend/Dockerfile`
- `frontend/nginx.conf`

## Folder Highlights

- `src/app/pages`: main pages (auth, user, admin, super admin)
- `src/app/components`: reusable UI components
- `src/app/auth`: auth context and route guards
- `src/app/api/client.ts`: API client, token attach/refresh logic

## Related Docs

- Project root: [`../README.md`](../README.md)
- Backend API: [`../backend/README.md`](../backend/README.md)
  