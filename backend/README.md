# Mawrid Backend (Spring Boot)

REST API and business logic for the Mawrid equipment platform.

## Stack

- Java 17
- Spring Boot 3
- Spring Security + JWT
- Spring Data JPA (Hibernate)
- MySQL
- Spring Mail (SMTP)

## Prerequisites

- JDK 17+
- Maven 3.8+
- MySQL server (local or container)

## Configuration

Main configuration file:

- `src/main/resources/application.properties`

Common environment overrides supported by the backend:

- `FRONTEND_URL`
- `APP_JWT_SECRET`
- `APP_JWT_ACCESS_TTL_SECONDS`
- `APP_REFRESH_TTL_SECONDS`
- `APP_VERIFICATION_TTL_SECONDS`
- `APP_RESET_TTL_SECONDS`
- `APP_RESET_OTP_TTL_SECONDS`
- `APP_VERIFICATION_OTP_TTL_SECONDS`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_FROM`

## Run Locally

From `backend`:

```bash
mvn spring-boot:run
```

Or run `EquipmentRentalApplication` directly from your IDE.

Default API port:

- `8080`

## Build

```bash
mvn clean package -DskipTests
```

Generated artifact:

- `target/*.jar`

## Docker

`backend/Dockerfile` is multi-stage:

1. Build with Maven + OpenJDK 17
2. Run with Eclipse Temurin JRE 17

## Core Auth Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account and send verification OTP |
| POST | `/api/auth/verify-registration` | Verify signup OTP |
| POST | `/api/auth/login` | Login and issue access token |
| POST | `/api/auth/refresh` | Rotate refresh token and issue new access token |
| POST | `/api/auth/logout` | Revoke refresh session |
| GET | `/api/auth/me` | Get authenticated user profile |
| POST | `/api/auth/resend-verification` | Resend registration OTP |
| POST | `/api/auth/forgot-password` | Send reset OTP |
| POST | `/api/auth/verify-reset-otp` | Verify reset OTP and reset flow |

## Notes

- CORS is controlled by `app.frontend.url`.
- The app includes compatibility patches for older legacy `users` table columns (such as `password`/`username`) during startup.
- Keep secrets out of source control and inject them via environment variables in production.

## Related Docs

- Project root: [`../README.md`](../README.md)
- Frontend guide: [`../frontend/README.md`](../frontend/README.md)
