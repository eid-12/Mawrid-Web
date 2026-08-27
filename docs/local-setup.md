# Local setup

## Prerequisites

- JDK 17+
- Maven 3.8+ (or the Maven wrapper under `backend/`)
- Node.js 20+ and npm
- MySQL 8 (or Docker Compose, which includes MySQL)

## 1. Database

Create a schema (default name in `application.properties`):

```sql
CREATE DATABASE Mawrid_db;
```

Set `SPRING_DATASOURCE_USERNAME` / `SPRING_DATASOURCE_PASSWORD` if not using empty password root.

On first boot with an empty `tenants` table, the app seeds colleges and demo users.

## 2. Backend

```bash
cd backend
mvn spring-boot:run
```

API: `http://localhost:8080`

Optional env:

```text
FRONTEND_URL=http://localhost:5173
APP_JWT_SECRET=dev-only-change-me
MAIL_PASSWORD=   # leave empty to skip real email
```

## 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

UI: `http://localhost:5173`  
Vite proxies `/api` to `http://localhost:8080`.

`.env`:

```env
VITE_API_BASE_URL=/api
```

## 4. All-in-one Docker

From the repository root (needs Docker):

```bash
docker compose up --build
```

Then open `http://localhost:3000` (not the Vite port).

## Typical local URLs

| What | URL |
|------|-----|
| Vite UI | http://localhost:5173 |
| Compose UI | http://localhost:3000 |
| API | http://localhost:8080 |
| Health | http://localhost:8080/actuator/health |

## After pull / merge

```bash
cd frontend && npm install
cd ../backend && mvn -q -DskipTests package
```
