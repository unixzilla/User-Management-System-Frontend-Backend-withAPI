# User Management Service

A production-ready User Management Web Service built with **FastAPI**, **PostgreSQL**, and **MongoDB**.

## Architecture

```
                    ┌─────────────────┐
                    │   FastAPI App   │
                    │   (Python 3.11) │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
         ┌──────▼──────┐          ┌──────▼──────┐
         │ PostgreSQL  │          │   MongoDB   │
         │ (Users,     │          │ (Audit Log) │
         │  Roles,     │          └─────────────┘
         │  Permissions,
         │  Groups,
         │  Sessions)  │
         └─────────────┘

                    ┌─────────────────┐
                    │ React Frontend  │
                    │ (Vite + MUI)    │
                    └─────────────────┘
```

## Features

### Backend (FastAPI)
- **User Management**: CRUD operations with soft deletes, last_login tracking
- **Role-Based Access Control**: Many-to-many user-role relationships
- **Granular Permission System**: 12 resource-scoped permissions + admin wildcard, role-permission associations
- **User Groups**: Group users together, assign roles to groups for inherited permissions
- **JWT Authentication**: Access tokens (15 min) + refresh tokens (7 days), session expiration handling
- **Audit Logging**: All mutations logged to MongoDB asynchronously
- **PostgreSQL Advanced Features**: Views, CTEs, Window Functions, Stored Procedures
- **Async-First**: All database operations are async
- **Auto-Seeding**: Idempotent startup seeding (roles → permissions → groups → users)

### Frontend (React + Vite + MUI)
- **SPA with TanStack Router**: Client-side routing with protected routes
- **RTK Query**: Data fetching with tag-based cache invalidation
- **Material UI (MUI)**: Professional component library
- **React Hook Form + Zod**: Type-safe form validation
- **Permission-Based UI**: Granular component gating (canViewUsers, canEditUsers, canManageRoles, etc.)
- **Responsive Design**: Mobile-friendly layout with sidebar navigation

### DevOps
- **Dockerized**: One-command deployment with Docker Compose
- **Full-Stack Containers**: API (8000) + Frontend (3000) + PostgreSQL + MongoDB
- **Deploy Script**: `deploy.sh` with keep-data (`-k`) and rebuild-only (`-r`) modes

## Prerequisites

- **Docker** + **Docker Compose** (recommended)
- **Python 3.11+** (for local development)

## Quick Start (Docker)

```bash
# Clone and enter
cd user-management-service

# Copy environment file
cp .env.example .env

# Full clean deploy (recommended)
./deploy.sh

# Or keep existing data
./deploy.sh -k

# Or rebuild without re-pulling base images
./deploy.sh -r

# Run tests
docker compose exec api pytest

# Access
# ──────────────────────────────────────
# Frontend (React SPA):  http://localhost:3000
# API docs (Swagger):     http://localhost:8000/docs
# ReDoc:                  http://localhost:8000/redoc
```

> **Note:** The system auto-seeds on first startup — no manual `seed.py` step needed. Default accounts:
> - **Admin**: `admin@example.com` / password from `FIRST_SUPERUSER_PASSWORD`
> - **Guest**: `guest@example.com` / password from `GUEST_USER_PASSWORD` (default: `guest123`)

## Permission System

The authorization model uses granular, resource-scoped permissions attached to roles.

### Permission Names

| Resource | Read | Write | Delete |
|----------|------|-------|--------|
| `users` | `users.read` | `users.write` | `users.delete` |
| `roles` | `roles.read` | `roles.write` | `roles.delete` |
| `permissions` | `permissions.read` | `permissions.write` | — |
| `groups` | `groups.read` | `groups.write` | `groups.delete` |

Plus one wildcard: **`admin`** (`resource=*`, `action=*`) — grants all permissions.

### Default Role-Permission Assignments

| Role | Permissions |
|------|-------------|
| `admin` | `admin` |
| `editor` | `users.read`, `users.write`, `roles.read`, `permissions.read`, `groups.read`, `groups.write` |
| `viewer` | `users.read`, `roles.read`, `permissions.read`, `groups.read` |
| `guest` | *(none)* |

### Permission Inheritance

A user's effective permissions are the union of:
1. Permissions from roles directly assigned to the user
2. Permissions from roles assigned to any group the user belongs to

### Backend: `require_permission` Dependency

```python
@router.get("/users/", dependencies=[Depends(require_permission("users.read"))])
async def list_users(...):
    ...
```

## User Groups

Users can be organized into groups. Each group can have roles assigned, and those role permissions inherit to all group members.

### Default Groups

| Group | Assigned Role | Default Members |
|-------|---------------|-----------------|
| `admin` | `admin` | Admin user |
| `guest` | `guest` | Guest user |

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `postgres` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `postgres` |
| `POSTGRES_DB` | PostgreSQL database name | `user_management` |
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DB` | MongoDB audit database name | `user_management_audit` |
| `SECRET_KEY` | JWT signing secret (min 32 chars) | *(required)* |
| `ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry | `7` |
| `FIRST_SUPERUSER_EMAIL` | Admin user email | `admin@example.com` |
| `FIRST_SUPERUSER_PASSWORD` | Admin user password | *(required)* |
| `FIRST_SUPERUSER_USERNAME` | Admin username | `admin` |
| `GUEST_USER_EMAIL` | Guest user email | `guest@example.com` |
| `GUEST_USER_PASSWORD` | Guest user password | `guest123` |
| `GUEST_USER_USERNAME` | Guest username | `guest` |
| `CORS_ORIGINS` | Allowed CORS origins (JSON array) | `["http://localhost:3000","http://localhost:8080"]` |

### Frontend (Docker-only)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL for frontend | `http://localhost:8000` |

> **Note:** `VITE_API_BASE_URL` is injected at build time (Vite convention). For local development, create a `.env` file in `user-management-frontend/` or configure via Vite.

## API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication (`/api/v1/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | No | Email + password → access + refresh tokens |
| POST | `/refresh` | No | Refresh token → new access token |
| POST | `/logout` | Yes | Invalidate refresh token |

### Users (`/api/v1/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | `users.read` | List users (paginated, filterable, searchable) |
| POST | `/` | `users.write` | Create new user |
| GET | `/{user_id}` | Self or `users.read` | Get user by ID |
| PATCH | `/{user_id}` | Self or `users.write` | Update user fields |
| DELETE | `/{user_id}` | `users.delete` | Soft-delete user |
| POST | `/{user_id}/roles` | `roles.write` | Assign role to user |
| DELETE | `/{user_id}/roles/{role_id}` | `roles.write` | Remove role from user |

### Roles (`/api/v1/roles`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | `roles.read` | List all roles |
| POST | `/` | `roles.write` | Create role |
| DELETE | `/{role_id}` | `roles.delete` | Delete role |

### Permissions (`/api/v1/permissions`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | `permissions.read` | List all permissions |
| POST | `/` | `permissions.write` | Create permission |
| PATCH | `/{permission_id}` | `permissions.write` | Update permission |
| DELETE | `/{permission_id}` | `permissions.write` | Delete permission |
| GET | `/roles/{role_id}/permissions` | `permissions.read` | Get role permissions |
| PUT | `/roles/{role_id}/permissions` | `permissions.write` | Set role permissions (bulk) |
| POST | `/roles/{role_id}/permissions/{permission_id}` | `permissions.write` | Assign permission to role |
| DELETE | `/roles/{role_id}/permissions/{permission_id}` | `permissions.write` | Remove permission from role |

### Groups (`/api/v1/groups`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | `groups.read` | List all groups |
| POST | `/` | `groups.write` | Create group |
| PATCH | `/{group_id}` | `groups.write` | Update group |
| DELETE | `/{group_id}` | `groups.delete` | Delete group |
| POST | `/{group_id}/members` | `groups.write` | Add member to group |
| DELETE | `/{group_id}/members/{user_id}` | `groups.write` | Remove member from group |
| POST | `/{group_id}/roles/{role_id}` | `groups.write` | Assign role to group |
| DELETE | `/{group_id}/roles/{role_id}` | `groups.write` | Remove role from group |

## Database Design

### PostgreSQL Schema

**Tables:**
- `users` — User accounts (soft-deletable, UUID primary key, last_login tracking)
- `roles` — Role definitions (admin, editor, viewer, guest)
- `user_roles` — Many-to-many user-role join table
- `permissions` — Granular permission definitions (resource + action)
- `role_permissions` — Many-to-many role-permission join table
- `user_groups` — User group definitions
- `user_group_members` — Many-to-many group-member join table
- `user_group_roles` — Many-to-many group-role join table

**Views** (`sql/views.sql`):
- `active_users_view` — Active users with aggregated role list

**Complex Queries** (`sql/complex_queries.sql`):
- CTE: Roleless users
- Window Function: User signup rank per role
- Multi-join analytics report

**Stored Procedures** (`sql/stored_procedures.sql`):
- `soft_delete_user()` — Atomic soft-delete with role cleanup

### MongoDB Audit Log

Every mutating operation creates an audit document:

```json
{
  "_id": "ObjectId",
  "event_type": "user.created | user.updated | role.assigned | group.member_added | ...",
  "actor_id": "UUID",
  "target_id": "UUID",
  "target_type": "user | role | group",
  "payload": { "changed_fields": [], "old_values": {}, "new_values": {} },
  "ip_address": "127.0.0.1",
  "user_agent": "FastAPI",
  "timestamp": "2025-04-16T10:30:00Z"
}
```

## Project Structure

```
user-management-service/
├── app/                              # Backend (FastAPI)
│   ├── main.py                       # App entry point + lifespan (auto-seeding)
│   ├── config.py                     # Settings from env vars
│   ├── dependencies.py               # DI: DB sessions, current user, require_permission
│   ├── api/v1/
│   │   ├── router.py                 # Aggregates all v1 routes
│   │   └── endpoints/                # auth, users, roles, permissions, groups
│   ├── core/                         # Security (JWT, password hashing), exceptions
│   ├── db/                           # PostgreSQL & MongoDB connections
│   ├── models/                       # SQLAlchemy ORM models (User, Role, Permission, UserGroup)
│   ├── schemas/                      # Pydantic request/response schemas
│   ├── crud/                         # Generic CRUD base + specific CRUD classes
│   └── services/                     # Business logic + audit logging + seed data
├── user-management-frontend/         # Frontend (React + Vite + MUI)
│   ├── src/
│   │   ├── api/                      # RTK Query API slices (auth, users, roles, permissions, groups)
│   │   ├── components/               # Reusable UI components (layout, dialogs)
│   │   ├── pages/                    # Page components (dashboard, users, roles, groups, profile, login)
│   │   ├── store/                    # Redux store
│   │   ├── theme/                    # MUI theme configuration
│   │   ├── types/                    # TypeScript interfaces
│   │   ├── hooks/                    # Custom hooks (usePermissions, useAuth)
│   │   ├── routes/                   # TanStack Router route definitions
│   │   ├── utils/                    # Helpers (validation, permissions, format, storage)
│   │   ├── App.tsx                   # Root component
│   │   └── main.tsx                  # Entry point
│   ├── Dockerfile                    # Multi-stage build (Node → Nginx)
│   ├── nginx.conf                    # Nginx static file config
│   ├── vite.config.ts                # Vite configuration
│   ├── package.json                  # Frontend dependencies
│   └── tsconfig.json                 # TypeScript configuration
├── alembic/                          # DB migrations (4 migrations)
│   └── versions/                     # 0001_init, 0002_last_login, 0003_permissions, 0004_user_groups
├── sql/                              # Views, procedures, complex queries
├── scripts/                          # Utility scripts
├── tests/                            # Unit + integration tests
├── docker/
│   └── Dockerfile                    # API backend Dockerfile
├── docker-compose.yml                # Main compose file
├── deploy.sh                         # Full deploy script (-k keep data, -r rebuild only)
├── pyproject.toml                    # Project metadata + tools
├── .env.example                      # Environment template
└── README.md                         # This file
```

## Running Tests

### Backend: Unit Tests (mocked, fast)

```bash
pytest tests/unit/ -v --cov=app.core --cov=app.crud --cov=app.services
```

### Backend: Integration Tests (real databases via Docker)

```bash
# Ensure Docker services are running
docker compose up -d postgres mongodb

# Run integration tests
pytest tests/integration/ -v
```

### Backend: Full Test Suite

```bash
pytest -v --cov=app --cov-report=html
```

Coverage report will be available at `htmlcov/index.html`.

### Frontend: Unit Tests (Vitest)

```bash
cd user-management-frontend

# Run tests in watch mode
npm run test

# Run tests once (CI mode)
npm run test -- --run

# Run tests with UI
npm run test:ui
```

## Development (Local)

### Backend (FastAPI)

```bash
# Install dependencies
pip install -e ".[dev]"

# Start databases only
docker compose up -d postgres mongodb

# Run migrations
alembic upgrade head

# Run dev server
uvicorn app.main:app --reload --port 8000

# API docs
# http://localhost:8000/docs
# http://localhost:8000/redoc
```

### Frontend (React + Vite)

```bash
cd user-management-frontend

# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev
# → http://localhost:5173 (default Vite port)

# Or use preview mode after building
npm run build
npm run preview
# → http://localhost:4173
```

### Full-Stack Development

1. Start backend databases: `docker compose up -d postgres mongodb`
2. In terminal 1 — run backend API: `uvicorn app.main:app --reload --port 8000`
3. In terminal 2 — run frontend dev server: `cd user-management-frontend && npm run dev`
4. Access frontend at `http://localhost:5173` (or configured port)

## Quick Reference

### Deploy Script

| Command | Description |
|---|---|
| `./deploy.sh` | Full clean rebuild — removes containers, images, volumes, data, pulls fresh base images |
| `./deploy.sh -k` | Rebuild keeping existing data volumes (still pulls fresh base images) |
| `./deploy.sh -r` | Rebuild only — skip base image pulls, keep data (uses local cache) |
| `./deploy.sh -k -r` | Combined: keep data + skip base image pulls |

### Docker Compose

| Command | Description |
|---|---|
| `cp .env.example .env` | Create local env — edit values before spinning up |
| `docker compose up -d` | Start all services (API + Frontend + DBs) |
| `docker compose up -d --build` | Rebuild all images then start |
| `docker compose logs -f api` | Tail backend API logs |
| `docker compose logs -f frontend` | Tail frontend logs |
| `docker compose ps` | Check service status |
| `docker compose down -v` | Stop services & delete volumes (drops all data) |
| `docker compose stop` | Stop services (keeps volumes) |
| `docker compose restart` | Restart all services |

### Backend Commands

| Command | Description |
|---|---|
| `docker compose exec api alembic history` | Show migration history |
| `docker compose exec api alembic upgrade head` | Run migrations manually |
| `docker compose exec api pytest tests/unit/ -v` | Run unit tests only |
| `docker compose exec api pytest tests/integration/ -v` | Run integration tests |

### Frontend Commands

| Command | Description |
|---|---|
| `cd user-management-frontend && npm install` | Install dependencies |
| `npm run dev` | Start dev server (usually `http://localhost:5173`) |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests (Vitest) |
| `npm run lint` | Run ESLint |
| `docker compose build frontend` | Rebuild frontend Docker image |
| `docker compose up -d frontend` | Start only frontend service |

## Contributing

### Branch Naming
- `feature/<short-desc>` — New features
- `fix/<short-desc>` — Bug fixes
- `refactor/<short-desc>` — Code improvements
- `docs/<short-desc>` — Documentation changes

### Commit Style
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add user search endpoint
fix: resolve token refresh race condition
docs: update API reference table
test: add pagination test for users list
```

### PR Checklist
- [ ] All tests pass (`pytest -v`)
- [ ] Code formatted with `black`
- [ ] Linting passes (`ruff check .`)
- [ ] Type hints included where applicable
- [ ] API docs updated if endpoints changed
- [ ] Migration file included for DB schema changes

## License

MIT
