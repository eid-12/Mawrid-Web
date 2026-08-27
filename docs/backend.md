# Backend

Spring Boot 3 application, Java package `com.equipment`, entry class `EquipmentRentalApplication`.

Default port: **8080**.

## Packages

| Package | Role |
|---------|------|
| `controller` | REST endpoints |
| `service` | Business rules and transactions |
| `repository` | Spring Data JPA |
| `entity` | Tables |
| `dto` / `dto.auth` | JSON shapes |
| `security` | JWT filter, `JwtService`, `AppUserPrincipal`, `TenantAccess` |
| `config` | `SecurityConfig`, CORS |
| `exception` | `GlobalExceptionHandler` and domain errors |
| `util` | Hashing, OTP, random tokens |

## Services (what they own)

| Service | Responsibility |
|---------|----------------|
| `AuthService` | Login, JWT, refresh rotation, OTP, profile, password |
| `UserRegistrationTransactionService` | Signup transaction; forces public role `USER` |
| `UserService` | Super-admin user CRUD |
| `TenantService` | Colleges, settings, deactivate, delete cascade |
| `EquipmentService` | Equipment and units, quantity sync |
| `BorrowRequestService` | Create, approve, reject, cancel, search, capacity rules |
| `CheckTransactionService` | Check-out / in, scan, pending queues |
| `RecommendationService` | Catalog ranking from recent borrow history |
| `AdminDashboardService` | College KPIs, alerts, activity |
| `DashboardService` | Global super-admin stats |
| `ActivityLogService` | Audit rows |
| `EmailService` | HTML mail; skips send if `MAIL_PASSWORD` is blank |
| `LegacyUserColumnSyncService` | Optional legacy `users.password` / `username` columns |

## Configuration

File: `backend/src/main/resources/application.properties`

Important environment variables:

| Variable | Purpose |
|----------|---------|
| `FRONTEND_URL` | CORS origin |
| `SPRING_DATASOURCE_URL` / `USERNAME` / `PASSWORD` | MySQL |
| `APP_JWT_SECRET` | HMAC signing key |
| `APP_JWT_ACCESS_TTL_SECONDS` | Access token lifetime (default 1800) |
| `APP_REFRESH_TTL_SECONDS` | Refresh lifetime (default 30 days) |
| `MAIL_PASSWORD` or `SPRING_MAIL_PASSWORD` | SMTP password (Resend API key in production) |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_FROM` | Mail |

Do not commit mail passwords or production JWT secrets.

## Seed data

On **empty** `tenants` table, `EquipmentRentalApplication` seeds:

- Super admin `super@uoh.edu.sa`
- Ten colleges (codes such as CS, ENG, MED, …)
- One admin and several students per college
- Sample equipment, units, and borrow requests

All seeded accounts share one bcrypt hash (plaintext password is not stored in the repo).

## Method security

`@EnableMethodSecurity` is on. Controllers still check roles via `TenantAccess.requireRole` / `requireTenant` in addition to the HTTP security filter chain.
