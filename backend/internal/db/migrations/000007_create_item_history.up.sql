CREATE TABLE item_history (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    actor_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    field     TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    at        DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_item_history_item ON item_history(item_id, id);
