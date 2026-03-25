# Mawrid Web Application

Mawrid is a full-stack equipment borrowing and management platform for university colleges.
This repository contains:

- `frontend`: React + Vite web client
- `backend`: Spring Boot REST API
- `.github/workflows`: CI/CD pipeline for Docker Hub

## Project Structure

```text
Web App/
├─ frontend/                  # React app (user/admin/super admin portals)
├─ backend/                   # Spring Boot API + business logic + DB access
└─ .github/workflows/main.yml # Build and push Docker images on main branch
```

## Main Features

- Multi-role authentication (`USER`, `ADMIN`, `SUPER_ADMIN`)
- College-aware access control and status checks
- Equipment catalog, units, inventory, requests, and check-in/out flow
- Email verification and password reset with OTP and cooldown protection
- Dark mode support and responsive UI
- Dockerized frontend/backend deployment flow

## Quick Start

### 1) Local Development

Run backend:

```bash
cd backend
mvn spring-boot:run
```

Run frontend:

```bash
cd frontend
npm install
npm run dev
```

### 2) Production-Style (Docker Images)

- Frontend image is built from `frontend/Dockerfile` (served by Nginx on port `3000`)
- Backend image is built from `backend/Dockerfile` (Spring Boot on port `8080`)
- CI workflow: `.github/workflows/main.yml`

## Configuration

- Frontend env example: `frontend/.env.example`
- Backend configuration: `backend/src/main/resources/application.properties`

Important:

- Keep secrets in environment variables, not hardcoded values.
- If you deploy with same-domain strategy, keep frontend API base URL as `/api` and use Nginx reverse proxy.

## Documentation by Section

- Frontend guide: [`frontend/README.md`](frontend/README.md)
- Backend guide: [`backend/README.md`](backend/README.md)

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Lucide, Radix UI
- Backend: Spring Boot 3, Spring Security, Spring Data JPA, MySQL, JWT, Java Mail
- DevOps: Docker, GitHub Actions

## Maintainers

- Graduation Project Team - Mawrid
