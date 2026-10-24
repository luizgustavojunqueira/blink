CREATE TABLE agents_new (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    guid         TEXT UNIQUE NOT NULL,
    user_id      INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    token_hash   TEXT UNIQUE NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    UNIQUE (user_id, name)
);

INSERT INTO agents_new (id, guid, name, token_hash, created_at, last_used_at)
SELECT id, guid, name, token_hash, created_at, last_used_at FROM agents;

DROP TABLE agents;

ALTER TABLE agents_new RENAME TO agents;

CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id);
