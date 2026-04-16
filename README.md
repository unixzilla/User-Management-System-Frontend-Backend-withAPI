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
```

## Features

- **User Management**: CRUD operations with soft deletes
- **Role-Based Access Control**: Many-to-many user-role relationships
- **JWT Authentication**: Access tokens (15 min) + refresh tokens (7 days)
- **Audit Logging**: All mutations logged to MongoDB asynchronously
- **PostgreSQL Advanced Features**: Views, CTEs, Window Functions, Stored Procedures
- **Async-First**: All database operations are async
- **Dockerized**: One-command deployment with Docker Compose

## Prerequisites

- **Docker** + **Docker Compose** (recommended)
- **Python 3.11+** (for local development)

## Quick Start (Docker)

```bash
# Clone and enter
cd user-management-service

# Copy environment file
cp .env.example .env

# Start all services
docker compose up -d

# Wait for services to be ready (~30 seconds)
docker compose ps

# Seed initial data (admin user + roles)
docker compose exec api python scripts/seed.py

# Run tests
docker compose exec api pytest

# Access API docs
open http://localhost:8000/docs
```

## Environment Variables

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
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | *(empty)* |

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

### Unit Tests (mocked, fast)

```bash
pytest tests/unit/ -v --cov=app.core --cov=app.crud --cov=app.services
```

### Integration Tests (real databases via Docker)

```bash
# Ensure Docker services are running
docker compose up -d postgres mongodb

# Run integration tests
pytest tests/integration/ -v
```

### Full Test Suite

```bash
pytest -v --cov=app --cov-report=html
```

Coverage report will be available at `htmlcov/index.html`.

## Project Structure

```
user-management-service/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Settings from env vars
│   ├── dependencies.py      # DI: DB sessions, current user
│   ├── api/v1/              # API version 1
│   │   ├── router.py        # Aggregates all v1 routes
│   │   └── endpoints/       # auth.py, users.py, roles.py
│   ├── core/                # Security, exceptions
│   ├── db/                  # Postgres & MongoDB connections
│   ├── models/              # SQLAlchemy & Pydantic models
│   ├── schemas/             # Request/response schemas
│   ├── crud/                # Generic + specific CRUD
│   └── services/            # Business logic + audit
├── alembic/                 # DB migrations
├── sql/                     # Views, procedures, queries
├── scripts/                 # seed.py, export_users.py
├── tests/                   # Unit + integration tests
├── docker/                  # Dockerfile, docker-compose.yml
├── pyproject.toml           # Project metadata + tools
├── .env.example             # Environment template
└── README.md                # This file
```

## Development (Local)

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
