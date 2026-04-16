-- 1. CTE: Users who have never been assigned any role
WITH roleless_users AS (
    SELECT u.id, u.email, u.created_at
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    WHERE ur.user_id IS NULL
      AND u.deleted_at IS NULL
)
SELECT * FROM roleless_users ORDER BY created_at DESC;

-- 2. Window function: Rank users by signup date within each role
SELECT
    u.username,
    r.name AS role,
    u.created_at,
    RANK() OVER (PARTITION BY r.name ORDER BY u.created_at ASC) AS signup_rank
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r       ON r.id  = ur.role_id
WHERE u.deleted_at IS NULL;

-- 3. Multi-join report: Active admins with login statistics
-- (Assumes audit_logs collection sync or use via Postgres table)
SELECT
    u.id,
    u.email,
    u.full_name,
    u.created_at,
    COUNT(DISTINCT ur.role_id) AS role_count,
    COUNT(DISTINCT CASE WHEN al.event_type = 'login.success' THEN 1 END) AS successful_logins,
    COUNT(DISTINCT CASE WHEN al.event_type = 'login.failed' THEN 1 END) AS failed_logins
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON r.id = ur.role_id
LEFT JOIN audit_events al ON al.actor_id = u.id
WHERE u.is_active = TRUE
  AND r.name = 'admin'
  AND u.deleted_at IS NULL
GROUP BY u.id, u.email, u.full_name, u.created_at
ORDER BY u.created_at DESC;

-- 4. Monthly user registration trend
SELECT
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS new_users,
    STRING_AGG(DISTINCT u.email, ', ' ORDER BY u.email) AS emails
FROM users u
WHERE u.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- 5. Role distribution report
SELECT
    r.name AS role_name,
    r.description,
    COUNT(ur.user_id) AS assigned_count,
    MAX(u.created_at) AS last_assigned_at,
    JSON_AGG(
        JSONB_BUILD_OBJECT('user_id', u.id, 'email', u.email, 'assigned_at', ur.assigned_at)
    ) FILTER (WHERE ur.user_id IS NOT NULL) AS assigned_users
FROM roles r
LEFT JOIN user_roles ur ON r.id = ur.role_id
LEFT JOIN users u ON u.id = ur.user_id AND u.deleted_at IS NULL
GROUP BY r.id, r.name, r.description
ORDER BY assigned_count DESC;
