# Equipment Rental - Backend (Spring Boot)

Backend API for the equipment rental system. `application.properties` is the single source of configuration logic, and all sensitive values are read from OS/IDE environment variables.

## Requirements

- Java 17+
- Maven 3.6+
- MySQL

## Environment Variables

Set these in your OS environment or IDE Run Configuration before starting the backend.

### Required

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET` (must be random and at least 32 chars)
- `RESEND_API_KEY`

### Optional (defaults exist in `application.properties`)

- `FRONTEND_URL` (default: `http://localhost:5174`)
- `APP_JWT_ACCESS_TTL_SECONDS` (default: `900`)
- `APP_REFRESH_TTL_SECONDS` (default: `2592000`)
- `APP_VERIFICATION_TTL_SECONDS` (default: `86400`)
- `APP_RESET_TTL_SECONDS` (default: `3600`)
- `MAIL_HOST` (default: `smtp.resend.com`)
- `MAIL_PORT` (default: `587`)
- `MAIL_USERNAME` (default: `resend`)
- `MAIL_FROM` (default: `onboarding@resend.dev`)

## Run

- IDE: Run `EquipmentRentalApplication`.
- Terminal (from `backend`):

```bash
mvn spring-boot:run
```

Spring Boot will read configuration placeholders from system environment variables.

## Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user and send verification email |
| GET | `/api/auth/verify-email?token=...` | Verify email |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/login` | Login (returns access token and sets refresh cookie) |
| POST | `/api/auth/refresh` | Rotate refresh token and issue new access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current authenticated user |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password |

## Notes

- CORS is centralized and uses `app.frontend.url` (`FRONTEND_URL`).
- Email delivery is configured through Resend SMTP.
