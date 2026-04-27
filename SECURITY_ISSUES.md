# Security Review — User Management Service

> **Date:** 2026-04-27 | **Review scope:** Backend (FastAPI) + Frontend (React/MUI) + Infrastructure (Docker Compose)

---

## CRITICAL

### 1. Group-based RBAC permissions are completely ignored

**File:** `app/dependencies.py:90-113`

`require_permission()` only checks `current_user.roles` (direct user-to-role assignments). It does **not** look at group-inherited roles (`current_user.groups → roles → permissions`). The `permission_service.get_user_permissions()` method correctly handles this (lines 276-281), but it is never called by the dependency.

`get_current_user_with_permissions()` eagerly loads `User.groups` but does **not** load `UserGroup.roles` or their permissions, so even if `require_permission` were fixed, the data wouldn't be available.

A user added to the "admin" group gets **no permissions** from it. The `is_admin` property has the same blind spot.

```python
# dependencies.py:101 — only iterates direct roles
for role in current_user.roles:
    for permission in role.permissions:
        ...
```

---

### 2. Refresh tokens can be used as access tokens everywhere

**Files:** `app/dependencies.py:27-48`, `app/core/security.py:51-59`

`decode_token()` validates signature and expiry only — it does **not** check the `"type"` claim. Any endpoint protected by `get_current_user` (authentication only) accepts refresh tokens (7-day expiry, `"type": "refresh"`) instead of access tokens (15-min expiry, `"type": "access"`).

An attacker with a refresh token (e.g., stolen via XSS from localStorage) has unrestricted API access for 7 days.

---

### 3. `.env` file tracked in Git — JWT secret, DB password, admin credentials exposed

**File:** `.env` (committed to repository)

Despite `.gitignore` listing `.env`, the file was committed. It contains:

| Line | Value |
|------|-------|
| 3 | `POSTGRES_PASSWORD=postgres` |
| 13 | `SECRET_KEY=your-secret-key-change-this-in-production-at-least-32-characters` |
| 28 | `FIRST_SUPERUSER_PASSWORD=admin123` |
| 39 | `GUEST_USER_PASSWORD=guest123` |

Anyone with repository access can forge JWTs and access the database.

**Fix:** `git rm --cached .env`, rotate all secrets, use `.env.example` only.

---

## HIGH

### 4. No rate limiting on any endpoint

No rate limiting library or middleware exists anywhere in the project. Critical endpoints are unprotected:

- `POST /api/v1/auth/login` — brute-force password guessing
- `POST /api/v1/auth/refresh` — token farming/spam
- `POST /api/v1/users/` — mass account creation

**Fix:** Add `slowapi` middleware, especially on `/auth/login` and `/auth/refresh`.

---

### 5. JWT tokens stored in localStorage (XSS-exfiltratable)

**File:** `user-management-frontend/src/utils/storage.ts:3-27`

Both access and refresh tokens are stored in `localStorage`. Any XSS vulnerability can exfiltrate them via `localStorage.getItem('access_token')`. The backend does not set httpOnly cookies.

**Fix:** Move tokens to httpOnly, Secure, SameSite=Strict cookies. Keep access token in memory only.

---

### 6. No refresh token revocation — stolen tokens valid for 7 days

**File:** `app/api/v1/endpoints/auth.py:76-134`

The refresh endpoint issues new refresh tokens but never invalidates old ones. No `jti` claim is included in tokens, so there is no way to uniquely identify a token for a blocklist. The code acknowledges this with a TODO comment.

**Fix:** Add `jti` claims to tokens, implement a Redis-based blocklist checked during `decode_token()`.

---

### 7. Any user can self-verify via `UserUpdate.is_verified`

**Files:** `app/api/v1/endpoints/users.py:83-106`, `app/schemas/user.py:40-48`

The `update_user` endpoint allows self-profile updates (no `require_permission`). `UserUpdate` includes `is_verified: Optional[bool]`. There is no check preventing a user from setting `is_verified=True` on their own account.

**Fix:** Remove `is_verified` from `UserUpdate`, or add a separate admin-only endpoint for verification.

---

### 8. CORS middleware not added when `CORS_ORIGINS` is empty

**File:** `app/main.py:64-72`

If `CORS_ORIGINS` is empty or unset (the config default is `[]`), the CORS middleware is skipped entirely. FastAPI will accept cross-origin requests without any `Origin` validation.

Additionally, `allow_methods=["*"]` and `allow_headers=["*"]` are overly permissive.

**Fix:** Always add the middleware. Restrict methods/headers to the actual set needed.

---

## MEDIUM

### 9. Hardcoded default guest password

**File:** `app/config.py:42`

```python
guest_user_password: str = Field("guest123", alias="GUEST_USER_PASSWORD")
```

If `GUEST_USER_PASSWORD` is not set in the environment, guest accounts get the well-known default.

---

### 10. Resource endpoints guarded by wrong permission namespace

**File:** `app/api/v1/endpoints/resources.py`

Resource management endpoints require `permissions.read`/`permissions.write`/`permissions.delete` instead of a `resources.*` namespace. Any user with broad permissions-read access can list all resources.

---

### 11. No global exception handler — stack traces may leak

No `@app.exception_handler` is registered. Unhandled exceptions (bad UUID parsing, SQLAlchemy errors) produce FastAPI default 500 responses, which in debug mode include full stack traces.

---

### 12. `"password"` logged in audit `changed_fields`

**File:** `app/services/user_service.py:126-131`

When updating a user, `changed_fields` is computed before the password is removed from the update dict. The audit log records `{"changed_fields": ["password", "email", ...]}`, revealing that a password change occurred, even though the hash itself is not logged.

---

### 13. No password complexity requirements

**File:** `app/schemas/user.py:30`

`UserCreate.password` requires only `min_length=8`. No uppercase, lowercase, digit, or special character rules. The login schema accepts `min_length=1`.

---

### 14. CORS: `.env.example` format mismatch

**File:** `.env.example:24`

```
CORS_ORIGINS=http://localhost:3000,http://localhost:8080   # WRONG — comma-separated string
```

**File:** `.env:24`

```
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080"]  # CORRECT — JSON array
```

Copying `.env.example` to `.env` yields a broken CORS config.

---

### 15. MongoDB exposed on host port 27017 with no authentication

**File:** `docker-compose.yml:19-33`

No `MONGO_INITDB_ROOT_USERNAME`/`MONGO_INITDB_ROOT_PASSWORD` are set. Anyone with network access to port 27017 can read the entire audit log.

---

### 16. PostgreSQL exposed on host port 5432

**File:** `docker-compose.yml:9`

`"5432:5432"` exposes the database to the host network. Should be internal-only in production.

---

### 17. `user_id` accepted as raw `str` — unguarded `UUID()` parsing

**File:** `app/api/v1/endpoints/users.py:67`, `app/api/v1/endpoints/groups.py:150`

`user_id: str` in path parameters with manual `UUID(user_id)` casting can raise unhandled `ValueError` → 500 response.

**Fix:** Use `user_id: UUID` as the path parameter type.

---

## LOW

### 18. Demo admin credentials displayed on login page

**File:** `user-management-frontend/src/pages/login/LoginPage.tsx:128`

```tsx
<Typography>Demo credentials: admin@example.com / admin123</Typography>
```

Credentials visible to anyone who loads the login page.

---

### 19. Missing security headers in nginx

**File:** `user-management-frontend/nginx.conf`

No `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, or `Content-Security-Policy` headers.

---

### 20. Plain HTTP — no TLS termination

**File:** `docker-compose.yml:37-38,62-63`

All services exposed on plain HTTP. Sensitive data (passwords, tokens) transmitted in cleartext.

---

### 21. `serializableCheck: false` in Redux store

**File:** `user-management-frontend/src/store/index.ts:12-13`

Disables the safety net that catches non-serializable values entering Redux state.

---

### 22. Open redirect via `location.state` with `as any` cast

**File:** `user-management-frontend/src/pages/login/LoginPage.tsx:41`

```tsx
const from = (location as any).state?.from?.pathname || '/';
```

Bypasses TypeScript type safety on the redirect target.

---

### 23. Weak JWT algorithm (HS256 symmetric)

**File:** `app/config.py:28`

HS256 uses the same key for signing and verification. RS256 (asymmetric) would be better for distributed systems and limits blast radius of a key leak.

---

## Summary

| Severity | Count | Key Items |
|----------|-------|-----------|
| CRITICAL | 3 | Group RBAC bypass, refresh-as-access tokens, .env in Git |
| HIGH | 5 | No rate limiting, localStorage tokens, no token revocation, self-verify, CORS gap |
| MEDIUM | 9 | Default passwords, wrong permission namespace, no global error handler, audit log leak, no password complexity, MongoDB/PostgreSQL exposure, UUID parsing, CORS format mismatch |
| LOW | 6 | Demo credentials in UI, missing nginx headers, plain HTTP, serializableCheck off, open redirect, HS256 algorithm |

### Recommended Priority Fix Order

1. **Remove `.env` from Git and rotate all secrets** (CRITICAL #3)
2. **Add `"type"` claim check to `decode_token()`** (CRITICAL #2)
3. **Fix `require_permission` to include group-inherited roles** (CRITICAL #1)
4. **Add rate limiting on auth endpoints** (HIGH #4)
5. **Remove `is_verified` from `UserUpdate`** (HIGH #7)
6. **Implement refresh token blocklist** (HIGH #6)
7. **Move tokens to httpOnly cookies** (HIGH #5)
8. **Always add CORS middleware** (HIGH #8)
9. Remainder at medium/low priority
