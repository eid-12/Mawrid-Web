# Mawrid documentation

This folder describes **Mawrid System with AI Recommendation and Rate Limiting**: a university equipment lending platform for the University of Hail (UOH), including how catalog ranking and auth email cooldowns work, how data is isolated per college, and how the frontend, backend, database, security, and deployment fit together.

Live site: [https://mawrid.cloudbase.website](https://mawrid.cloudbase.website)  
Source: [https://github.com/eid-12/Mawrid-Web](https://github.com/eid-12/Mawrid-Web)

## Read in this order

| # | File | Contents |
|---|------|----------|
| 1 | [overview.md](overview.md) | Product goal, features, tech stack |
| 2 | [ai-recommendation-and-rate-limiting.md](ai-recommendation-and-rate-limiting.md) | Catalog ranking scores and 60s email rate limiting |
| 3 | [architecture.md](architecture.md) | System diagram, multi-tenancy, request path |
| 4 | [project-structure.md](project-structure.md) | Repository folders and important files |
| 5 | [roles-and-permissions.md](roles-and-permissions.md) | USER, ADMIN, SUPER_ADMIN |
| 6 | [user-flows.md](user-flows.md) | Signup, login, borrow, check-in/out |
| 7 | [frontend.md](frontend.md) | React app, routes, portals |
| 8 | [backend.md](backend.md) | Spring Boot packages and services |
| 9 | [api-reference.md](api-reference.md) | REST endpoints |
| 10 | [database.md](database.md) | MySQL tables and relationships |
| 11 | [security.md](security.md) | JWT, cookies, route guards, email cooldown |
| 12 | [deployment.md](deployment.md) | Docker, GitHub Actions, CloudBase |
| 13 | [local-setup.md](local-setup.md) | Run the project on a developer machine |

Shorter READMEs also live in [`../README.md`](../README.md), [`../frontend/README.md`](../frontend/README.md), and [`../backend/README.md`](../backend/README.md).
