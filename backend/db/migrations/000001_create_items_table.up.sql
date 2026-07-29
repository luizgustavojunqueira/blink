CREATE TABLE IF NOT EXISTS items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guid         TEXT UNIQUE NOT NULL,
    title        TEXT NOT NULL,
    description  TEXT,
    type         TEXT NOT NULL CHECK(type IN ('TASK', 'GROUP')),
    parent_id    INTEGER REFERENCES items(id),
    status       TEXT NOT NULL CHECK(status IN ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELED', 'ARCHIVED')),
    priority     TEXT NOT NULL CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    tags         TEXT,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_items_guid ON items(guid);
CREATE INDEX IF NOT EXISTS idx_items_parent ON items(parent_id);
