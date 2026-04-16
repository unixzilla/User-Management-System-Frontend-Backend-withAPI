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
         │  Sessions)  │
         └─────────────┘

                    ┌─────────────────┐
                    │ React Frontend  │
                    │ (Vite + MUI)    │
                    └─────────────────┘
```

## Features

### Backend (FastAPI)
- **User Management**: CRUD operations with soft deletes
- **Role-Based Access Control**: Many-to-many user-role relationships
- **JWT Authentication**: Access tokens (15 min) + refresh tokens (7 days)
- **Audit Logging**: All mutations logged to MongoDB asynchronously
- **PostgreSQL Advanced Features**: Views, CTEs, Window Functions, Stored Procedures
- **Async-First**: All database operations are async

### Frontend (React + Vite + MUI)
- **SPA with React Router**: Client-side routing with protected routes
- **Redux Toolkit**: Global state management for auth & data
- **Material UI (MUI)**: Professional component library
- **React Hook Form + Zod**: Type-safe form validation
- **Axios Interceptors**: Automatic JWT attachment to requests
- **Role-based UI**: Dynamic component rendering based on user roles
- **Responsive Design**: Mobile-friendly layout with sidebar navigation

### DevOps
- **Dockerized**: One-command deployment with Docker Compose
- **Full-Stack Containers**: API (8000) + Frontend (3000) + Databases

## Prerequisites

- **Docker** + **Docker Compose** (recommended)
- **Python 3.11+** (for local development)

## Quick Start (Docker)

```bash
# Clone and enter
cd user-management-service

# Copy environment file
cp .env.example .env

# Start all services (API + Frontend + Databases)
docker compose up -d

# Wait for services to be ready (~30 seconds)
docker compose ps

# Seed initial data (admin user + roles)
docker compose exec api python scripts/seed.py

# Run tests
docker compose exec api pytest

# Access
# ──────────────────────────────────────
# Frontend (React SPA):  http://localhost:3000
# API docs (Swagger):     http://localhost:8000/docs
# ReDoc:                  http://localhost:8000/redoc
```

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
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://localhost:8080` |

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
| GET | `/` | Admin | List users (paginated, filterable) |
| POST | `/` | Admin | Create new user |
| GET | `/{user_id}` | Self or Admin | Get user by ID |
| PATCH | `/{user_id}` | Self or Admin | Update user fields |
| DELETE | `/{user_id}` | Admin | Soft-delete user |
| POST | `/{user_id}/roles` | Admin | Assign role to user |
| DELETE | `/{user_id}/roles/{role_id}` | Admin | Remove role from user |

### Roles (`/api/v1/roles`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Admin | List all roles |
| POST | `/` | Admin | Create role |
| DELETE | `/{role_id}` | Admin | Delete role |

## Database Design

### PostgreSQL Schema

**Tables:**
- `users` — User accounts (soft-deletable, UUID primary key)
- `roles` — Role definitions (`admin`, `editor`, `viewer`)
- `user_roles` — Many-to-many join table

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
  "event_type": "user.created | user.updated | ...",
  "actor_id": "UUID",
  "target_id": "UUID",
  "target_type": "user | role",
  "payload": { "changed_fields": [], "old_values": {}, "new_values": {} },
  "ip_address": "127.0.0.1",
  "user_agent": "FastAPI",
  "timestamp": "2025-04-16T10:30:00Z"
}
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

## Project Structure

```
user-management-service/
├── app/                          # Backend (FastAPI)
│   ├── main.py                   # App entry point
│   ├── config.py                 # Settings from env vars
│   ├── dependencies.py           # DI: DB sessions, current user
│   ├── api/v1/
│   │   ├── router.py             # Aggregates all v1 routes
│   │   └── endpoints/            # auth.py, users.py, roles.py
│   ├── core/                     # Security, exceptions
│   ├── db/                       # Postgres & MongoDB connections
│   ├── models/                   # SQLAlchemy & Pydantic models
│   ├── schemas/                  # Request/response schemas
│   ├── crud/                     # Generic + specific CRUD
│   └── services/                 # Business logic + audit
├── user-management-frontend/     # Frontend (React + Vite + MUI)
│   ├── src/
│   │   ├── api/                  # Axios instance + API modules
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Page-level components
│   │   ├── store/                # Redux Toolkit slices
│   │   ├── theme/                # MUI theme configuration
│   │   ├── types/                # TypeScript interfaces
│   │   ├── utils/                # Helpers (validation, formatting)
│   │   ├── App.tsx               # Root component
│   │   └── main.tsx              # Entry point
│   ├── Dockerfile                # Multi-stage build (Node → Nginx)
│   ├── nginx.conf                # Nginx static file config
│   ├── vite.config.ts            # Vite configuration
│   ├── package.json              # Frontend dependencies
│   └── tsconfig.json             # TypeScript configuration
├── alembic/                      # DB migrations
├── sql/                          # Views, procedures, queries
├── scripts/                      # seed.py, export_users.py
├── tests/                        # Unit + integration tests
├── docker/
│   ├── Dockerfile                # API backend Dockerfile
│   └── docker-compose.yml        # (legacy — use root docker-compose.yml)
├── docker-compose.yml            # Main compose file (root)
├── pyproject.toml                # Project metadata + tools
├── .env.example                  # Environment template
└── README.md                     # This file
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

# Seed admin user
python scripts/seed.py

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

### Docker Compose

| Command | Description |
|---|---|
| `cp .env.example .env` | Create local env — edit values before spinning up |
| `docker compose up -d` | Start all services (API + Frontend + DBs) |
| `docker compose up -d --build` | Rebuild all images then start |
| `docker compose logs -f api` | Tail backend API logs |
| `docker compose logs -f frontend` | Tail frontend logs |
| `docker compose ps` | Check service status |
| `docker compose down -v` | Stop services & delete volumes (⚠️ drops all data) |
| `docker compose stop` | Stop services (keeps volumes) |
| `docker compose restart` | Restart all services |

### Backend Commands

| Command | Description |
|---|---|
| `docker compose exec api alembic history` | Show migration history |
| `docker compose exec api python scripts/seed.py` | Seed admin + roles (idempotent) |
| `docker compose exec api pytest tests/unit/ -v` | Run unit tests only |
| `docker compose exec api pytest tests/integration/ -v` | Run integration tests |
| `docker compose exec api alembic upgrade head` | Run migrations manually |

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
