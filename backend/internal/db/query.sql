-- name: GetItem :one
SELECT * FROM items WHERE id = ?;

-- name: GetItemsByParent :many
SELECT * FROM items WHERE parent_id = ? ORDER BY created_at DESC;

-- name: CreateItem :one
INSERT INTO items (
    guid, title, description, type, parent_id, status, priority, tags
) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?
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
WHERE guid = sqlc.arg('guid')
RETURNING *;

-- name: DeleteItem :exec
DELETE FROM items WHERE guid = ?;

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
)
SELECT DISTINCT
    tag
FROM
    all_tags
WHERE
    tag != ''
ORDER BY
    tag ASC;
