# Project structure

Repository root (GitHub: `eid-12/Mawrid-Web`):

```text
.
├── docs/                      # This documentation
├── frontend/                  # React + Vite client
├── backend/                   # Spring Boot API
├── docker-compose.yml         # Local MySQL + backend + frontend
├── .github/workflows/main.yml # Build and push Docker images on main
└── README.md
```

## Frontend (`frontend/`)

```text
frontend/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx              # AuthProvider + RouterProvider
│   │   ├── routes.tsx           # All routes and guards
│   │   ├── api/client.ts        # Fetch wrapper, JWT, refresh
│   │   ├── auth/                # AuthContext, RequireAuth, GuestOnly
│   │   ├── layouts/             # User / Admin / SuperAdmin shells
│   │   ├── pages/               # Screens (public, user, admin, superadmin)
│   │   ├── components/          # Shared UI
│   │   ├── hooks/
│   │   └── lib/
│   └── styles/
├── nginx.conf                 # SPA fallback + /api proxy
├── Dockerfile
├── vite.config.ts             # Dev proxy /api → :8080
└── .env.example               # VITE_API_BASE_URL=/api
```

## Backend (`backend/`)

```text
backend/
├── src/main/java/com/equipment/
│   ├── EquipmentRentalApplication.java   # Boot + seed data
│   ├── config/           # Security, CORS
│   ├── controller/       # REST
│   ├── dto/              # Request/response types
│   ├── entity/           # JPA models
│   ├── exception/
│   ├── repository/
│   ├── security/         # JWT filter, TenantAccess
│   ├── service/          # Business rules
│   └── util/
├── src/main/resources/application.properties
├── scripts/              # Occasional SQL maintenance
├── Dockerfile
└── pom.xml
```

## What is not source of truth

| Path | Why |
|------|-----|
| `frontend/dist/` | Build output; gitignored |
| `backend/target/` | Maven output |
| `node_modules/` | Dependencies |
| `.env` files | Secrets; gitignored |

## Naming note

The Java package is `com.equipment` (equipment rental). The product name in the UI and docs is **Mawrid**.
