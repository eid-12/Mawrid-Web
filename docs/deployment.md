# Deployment

## Production URL

- App: [https://mawrid.cloudbase.website](https://mawrid.cloudbase.website)
- API on the same host: `https://mawrid.cloudbase.website/api/...`

## CI/CD

Workflow: `.github/workflows/main.yml`  
Trigger: push to `main`

Steps:

1. Checkout
2. Login to Docker Hub (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`)
3. Build and push `minipcer/mawrid-frontend:latest` with build-arg `VITE_API_BASE_URL=/api`
4. Build and push `minipcer/mawrid-backend:latest`

CloudBase (or the host) pulls those images and runs them with MySQL and env secrets.

## Images

| Image | Dockerfile | Runtime |
|-------|------------|---------|
| Frontend | `frontend/Dockerfile` | nginx:alpine, port 3000 |
| Backend | `backend/Dockerfile` | Temurin JRE 17, `java -jar app.jar`, port 8080 |

Nginx (`frontend/nginx.conf`):

- Serves the SPA (`try_files` → `index.html`)
- Does not cache `index.html`
- Proxies `/api/` to `http://mawrid-backend:8080`

## Required production environment (backend)

At minimum:

- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`
- `FRONTEND_URL=https://mawrid.cloudbase.website`
- `APP_JWT_SECRET` (strong, unique)
- `MAIL_PASSWORD` (or `SPRING_MAIL_PASSWORD`) for OTP mail

Without mail credentials the API process still starts; verification emails will not send.

## Docker Compose (local production-style)

From the repo root:

```bash
docker compose up --build
```

Services:

| Service | Port | Role |
|---------|------|------|
| `mysql-server` | 3306 | MySQL 8, database `mapping_db`, root password `root` |
| `mawrid-backend` | 8080 | API |
| `mawrid-frontend` | 3000 | UI + `/api` proxy |

Compose sets `FRONTEND_URL=http://localhost:3000` so CORS matches the UI origin.

## Same-domain rule

Keep `VITE_API_BASE_URL=/api` for Docker/CloudBase. Pointing the built SPA at a different API host requires CORS and cookie `SameSite` changes.
