-- Active users view with aggregated roles
CREATE OR REPLACE VIEW active_users_view AS
SELECT
    u.id,
    u.email,
    u.username,
    u.full_name,
    u.created_at,
    STRING_AGG(r.name, ', ' ORDER BY r.name) AS roles
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r       ON r.id = ur.role_id
WHERE u.is_active = TRUE AND u.deleted_at IS NULL
GROUP BY u.id;

-- User stats view
CREATE OR REPLACE VIEW user_stats_view AS
SELECT
    COUNT(*) FILTER (WHERE is_active = TRUE AND deleted_at IS NULL) AS active_users,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS deleted_users,
    COUNT(DISTINCT user_id) AS users_with_roles,
    COUNT(DISTINCT role_id) AS total_roles_assigned
FROM users LEFT JOIN user_roles ON users.id = user_roles.user_id;
