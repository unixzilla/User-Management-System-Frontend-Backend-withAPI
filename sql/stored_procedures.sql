-- Soft-delete a user and strip all their roles atomically
CREATE OR REPLACE PROCEDURE soft_delete_user(p_user_id UUID)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE users SET deleted_at = NOW(), is_active = FALSE
    WHERE id = p_user_id AND deleted_at IS NULL;

    DELETE FROM user_roles WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found or already deleted', p_user_id;
    END IF;
END;
$$;

-- Bulk activate users
CREATE OR REPLACE PROCEDURE bulk_activate_users(p_user_ids UUID[])
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE users
    SET is_active = TRUE, deleted_at = NULL
    WHERE id = ANY(p_user_ids) AND deleted_at IS NOT NULL;
END;
$$;

-- Get user role count
CREATE OR REPLACE FUNCTION get_user_role_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
AS $$
    SELECT COUNT(*) FROM user_roles WHERE user_id = p_user_id;
$$;
