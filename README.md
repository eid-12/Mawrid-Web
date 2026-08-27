# Mawrid System with AI Recommendation and Rate Limiting

[![CI/CD to Docker Hub](https://github.com/eid-12/Mawrid-Web/actions/workflows/main.yml/badge.svg)](https://github.com/eid-12/Mawrid-Web/actions/workflows/main.yml)

A centralized resource and equipment rental platform for the University of Hail (UOH), with **AI catalog recommendation** and **auth email rate limiting**.

This repository contains:

- `frontend`: React + Vite web client
- `backend`: Spring Boot REST API
- `docs`: system documentation (including the recommendation and rate-limiting design)
- `.github/workflows`: CI/CD pipeline for Docker Hub

## Project Structure

```text
Web App/
├─ frontend/                  # React app (user/admin/super admin portals)
├─ backend/                   # Spring Boot API + business logic + DB access
└─ .github/workflows/main.yml # Build and push Docker images on main branch
```

## Main Features

- **AI recommendation** on the student catalog: relevance scores from recent borrow history, college demand, and university check-outs; top matches show a Recommended badge
- **Rate limiting** on signup / resend / forgot-password email (60 second cooldown, HTTP 429)
- Multi-role authentication (`USER`, `ADMIN`, `SUPER_ADMIN`)
- College-aware access control and status checks
- Equipment catalog, units, inventory, requests, and check-in/out flow
- Email verification and password reset with OTP
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

## Documentation

Full system docs (architecture, roles, API, database, security, deploy):

- **[`docs/README.md`](docs/README.md)** — index of all documents
- **[`docs/ai-recommendation-and-rate-limiting.md`](docs/ai-recommendation-and-rate-limiting.md)** — how catalog ranking and email cooldowns work

Short per-package guides:

- Frontend: [`frontend/README.md`](frontend/README.md)
- Backend: [`backend/README.md`](backend/README.md)

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, Lucide
- Backend: Spring Boot 3, Spring Security, Spring Data JPA, MySQL, JWT, Java Mail
- DevOps: Docker, GitHub Actions

## Maintainers

- Graduation Project Team - Mawrid
