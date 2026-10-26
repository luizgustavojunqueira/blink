-- name: GetItem :one
SELECT * FROM items WHERE id = sqlc.arg('id') AND user_id = sqlc.arg('user_id');

-- name: GetItemByGuid :one
SELECT * FROM items WHERE guid = sqlc.arg('guid') AND user_id = sqlc.arg('user_id');

-- name: CreateItem :one
INSERT INTO items (
    guid, title, description, type, parent_id, status, priority, tags, user_id
) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?
)
RETURNING *;

-- name: UpdateItem :one
UPDATE items
SET
    title = COALESCE(sqlc.narg('title'), title),
    description = COALESCE(sqlc.narg('description'), description),
    status = COALESCE(sqlc.narg('status'), status),
    priority = COALESCE(sqlc.narg('priority'), priority),
    tags = COALESCE(sqlc.narg('tags'), tags),
    parent_id = COALESCE(sqlc.narg('parent_id'), parent_id),
    updated_at = CURRENT_TIMESTAMP,
    completed_at = COALESCE(sqlc.narg('completed_at'), completed_at)
WHERE guid = sqlc.arg('guid') AND user_id = sqlc.arg('user_id')
RETURNING *;

-- name: DeleteItem :exec
DELETE FROM items WHERE guid = sqlc.arg('guid') AND user_id = sqlc.arg('user_id');

-- name: GetTags :many
WITH all_tags AS (
    SELECT
        TRIM(json_each.value) AS tag
    FROM
        items,
        json_each('["' || REPLACE(tags, ',', '","') || '"]')
    WHERE
        tags IS NOT NULL
        AND tags != ''
        AND deleted_at IS NULL
        AND user_id = sqlc.arg('user_id')
)
SELECT DISTINCT
    tag
FROM
    all_tags
WHERE
    tag != ''
ORDER BY
    tag ASC;

-- name: CreateAgent :one
INSERT INTO agents (
    guid, name, token_hash, user_id
) VALUES (
    ?, ?, ?, ?
)
RETURNING *;

-- name: ListAgents :many
SELECT * FROM agents WHERE user_id = ? ORDER BY created_at ASC, id ASC;

-- name: DeleteAgent :execrows
DELETE FROM agents WHERE guid = sqlc.arg('guid') AND user_id = sqlc.arg('user_id');

-- name: TouchAgentByTokenHash :one
UPDATE agents SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND user_id IS NOT NULL
RETURNING user_id;

-- name: CreateUser :one
INSERT INTO users (guid, username, password_hash) VALUES (?, ?, ?)
RETURNING *;

-- name: GetUserByUsername :one
SELECT * FROM users WHERE username = ?;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = ?;

-- name: CountUsers :one
SELECT COUNT(*) FROM users;

-- name: UpdateUserPassword :exec
UPDATE users SET password_hash = ? WHERE id = ?;

-- name: AdoptOrphanItems :exec
UPDATE items SET user_id = ? WHERE user_id IS NULL;

-- name: AdoptOrphanAgents :exec
UPDATE agents SET user_id = ? WHERE user_id IS NULL;

-- name: CreateSession :exec
INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?);

-- name: GetSessionUser :one
SELECT u.id, u.guid, u.username, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id
WHERE s.token_hash = ?;

-- name: DeleteSession :exec
DELETE FROM sessions WHERE token_hash = ?;

-- name: DeleteUserSessions :exec
DELETE FROM sessions WHERE user_id = ?;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions WHERE expires_at <= ?;

-- name: DeleteUserItems :exec
DELETE FROM items WHERE user_id = ?;

-- name: DeleteUserAgents :exec
DELETE FROM agents WHERE user_id = ?;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = ?;

-- name: ListItemHistory :many
SELECT
    h.id,
    u.username AS actor,
    h.field,
    h.old_value,
    h.new_value,
    h.at
FROM item_history h
JOIN items i ON i.id = h.item_id
LEFT JOIN users u ON u.id = h.actor_id
WHERE i.guid = sqlc.arg('guid') AND i.user_id = sqlc.arg('user_id')
ORDER BY h.id DESC
LIMIT 200;
