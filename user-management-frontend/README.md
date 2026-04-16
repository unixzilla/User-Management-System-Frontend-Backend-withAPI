# User Management Frontend

React-based admin interface for the User Management Service backend.

## Tech Stack

- **React 19** + TypeScript
- **Vite** for fast builds
- **Material-UI v9** component library
- **Redux Toolkit** + **RTK Query** for state management
- **TanStack Router v1** for file-based routing
- **React Hook Form** + **Zod** for form validation
- **notistack** for toast notifications

## Prerequisites

- Node.js 18+
- Backend API running on `http://localhost:8000` (or set `VITE_API_BASE_URL`)
- Docker Compose for running backend (see parent directory)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start dev server on http://localhost:3000
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_APP_NAME` | Application name | `User Management` |

## Project Structure

```
src/
├── api/                          # RTK Query API slices
│   ├── axios.ts                  # Axios instance
│   ├── baseApi.ts                # RTK Query base
│   ├── authApi.ts                # Login, refresh, logout
│   ├── userApi.ts                # User CRUD
│   └── roleApi.ts                # Role CRUD
├── store/                        # Redux store
│   ├── authSlice.ts              # Auth reducer
│   ├── authMiddleware.ts         # Token refresh
│   └── index.ts                  # Store config
├── context/
│   └── AuthContext.tsx           # Auth React Context
├── hooks/
│   └── usePermissions.ts         # RBAC helpers
├── components/
│   ├── auth/ProtectedRoute/      # Route guard
│   ├── common/                   # Loading, ConfirmDialog, etc.
│   ├── layout/                   # Header, Sidebar
│   ├── shared/RoleBadge/         # Role chip
│   └── table/
│       ├── DataTable/            # Generic table
│       ├── UserTable/            # User columns
│       └── RoleTable/            # Role table
├── pages/
│   ├── login/                    # Login
│   ├── dashboard/                # Dashboard
│   ├── users/                    # User CRUD (admin)
│   ├── roles/                    # Role CRUD (admin)
│   ├── profile/                  # Self profile
│   ├── unauthorized/             # 403
│   └── not-found/                # 404
├── routes/AppRoutes.tsx          # Router
├── theme/                        # MUI theme
├── types/                        # TypeScript types
└── utils/                        # storage, permissions, validation
```

## Features

### Authentication
- JWT with access token (15 min) + refresh token (7 days)
- Auto-refresh on 401
- Persistent via localStorage

### RBAC

| Role | Dashboard | Users | Roles | Profile |
|---|---|---|---|---|
| **admin** | ✅ | ✅ Full | ✅ Full | Edit all |
| **editor** | ✅ | Limited | ❌ | Edit self |
| **viewer** | ✅ | View only | ❌ | View self |

### User Management (Admin)
- Paginated table with role badges
- Create / Edit / Delete users
- Assign or remove roles per user

### Role Management (Admin)
- List all roles
- Create new roles
- Delete roles (admin protected)

### Profile
- View own details
- Edit own information

## Development

```bash
npm run dev          # Start http://localhost:3000
npm run build        # Production build
npm run preview      # Preview build
npx tsc --noEmit     # Type check
```

## Testing with Backend

1. Start backend in parent directory:
   ```bash
   cd ..
   docker compose up -d postgres mongodb
   docker compose up api
   docker compose exec api python scripts/seed.py
   ```

2. Start frontend:
   ```bash
   npm run dev
   ```

3. Login credentials: `admin@example.com` / `admin123`

## Build Status

✅ Build successful — all TypeScript errors resolved

## Notes

- Uses **MUI v9** Grid2 API (size prop)
- Axios interceptor adds Authorization header automatically
- RTK Query cache invalidation keeps UI in sync
- CORS must be enabled on backend for port 3000
