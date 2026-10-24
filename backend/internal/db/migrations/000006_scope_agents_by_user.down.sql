CREATE TABLE agents_old (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guid         TEXT UNIQUE NOT NULL,
    name         TEXT UNIQUE NOT NULL,
    token_hash   TEXT UNIQUE NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME
);

INSERT OR IGNORE INTO agents_old (id, guid, name, token_hash, created_at, last_used_at)
SELECT id, guid, name, token_hash, created_at, last_used_at FROM agents;

DROP TABLE agents;

ALTER TABLE agents_old RENAME TO agents;
