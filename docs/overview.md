# Overview

**Mawrid System with AI Recommendation** is a multi-tenant web application for university colleges to lend, borrow, and track lab and classroom equipment. It is a centralized resource and equipment rental platform for the University of Hail (UOH).

Each college is a **tenant**. Students and faculty (`USER`) request equipment from a catalog that is **ranked by an AI recommendation score**. College staff (`ADMIN`) manage inventory, approve requests, and check items in and out. A platform operator (`SUPER_ADMIN`) manages colleges and accounts across the university.

The product name and UI copy are in English. The intended institution context is the University of Hail (emails such as `@uoh.edu.sa` appear in seed and examples).

## What the system does

- Public landing, signup, login, email OTP verification, forgot-password OTP
- Role-based portals (user / college admin / super admin)
- Equipment catalog with **AI recommendation** (relevance score, top-3 Recommended badge)
- Borrow requests with approve / reject / cancel
- Check-out and check-in (including serial-number scan)
- College activation / deactivation / removal
- Activity logs and dashboards
- Dark mode and responsive layout

## What it does not do (yet)

- There is no separate **Instructor** role. Faculty use the same `USER` role as students.
- Recommendation is a scored ranking model from borrow history, not a conversational LLM chatbot.

Full write-up: [ai-recommendation.md](ai-recommendation.md).

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 6, TypeScript, Tailwind CSS, React Router, Lucide |
| Backend | Java 17, Spring Boot 3, Spring Security, Spring Data JPA, JWT |
| Database | MySQL 8 |
| Email | SMTP (Resend in production config) |
| Packaging | Docker (Nginx frontend + Spring Boot JAR) |
| CI | GitHub Actions → Docker Hub (`minipcer/mawrid-frontend`, `minipcer/mawrid-backend`) |

## Main business rules

- A user may have at most **3** items in active states (`APPROVED`, `ON_LOAN` / `BORROWED`).
- A second request for the same equipment is blocked while a request is still `PENDING`, `APPROVED`, `ON_LOAN`, or `BORROWED`.
- Catalog and borrow APIs require a valid session. Public APIs are limited to auth helpers and the active-college list used on signup.
- Public registration always creates a `USER` (not admin).
- If a college is deactivated, its admin cannot log in; pending requests are cancelled.
- If a college is deleted, its users are detached and locked (`COLLEGE_REMOVED`).

## Related files

- Design intent: `frontend/src/imports/pasted_text/mawrid-web-app-design-brief.md`
- Root project README: [`../README.md`](../README.md)
