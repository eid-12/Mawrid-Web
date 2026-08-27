# Mawrid documentation

This folder describes the **Mawrid** university equipment lending platform: what it is, how it is structured, how data is isolated per college, and how the frontend, backend, database, security, and deployment fit together.

Live site: [https://mawrid.cloudbase.website](https://mawrid.cloudbase.website)  
Source: [https://github.com/eid-12/Mawrid-Web](https://github.com/eid-12/Mawrid-Web)

## Read in this order

| # | File | Contents |
|---|------|----------|
| 1 | [overview.md](overview.md) | Product goal, features, tech stack |
| 2 | [architecture.md](architecture.md) | System diagram, multi-tenancy, request path |
| 3 | [project-structure.md](project-structure.md) | Repository folders and important files |
| 4 | [roles-and-permissions.md](roles-and-permissions.md) | USER, ADMIN, SUPER_ADMIN |
| 5 | [user-flows.md](user-flows.md) | Signup, login, borrow, check-in/out |
| 6 | [frontend.md](frontend.md) | React app, routes, portals |
| 7 | [backend.md](backend.md) | Spring Boot packages and services |
| 8 | [api-reference.md](api-reference.md) | REST endpoints |
| 9 | [database.md](database.md) | MySQL tables and relationships |
| 10 | [security.md](security.md) | JWT, cookies, route guards |
| 11 | [deployment.md](deployment.md) | Docker, GitHub Actions, CloudBase |
| 12 | [local-setup.md](local-setup.md) | Run the project on a developer machine |

Shorter READMEs also live in [`../README.md`](../README.md), [`../frontend/README.md`](../frontend/README.md), and [`../backend/README.md`](../backend/README.md).
