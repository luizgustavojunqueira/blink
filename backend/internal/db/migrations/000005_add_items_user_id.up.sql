ALTER TABLE items ADD COLUMN user_id INTEGER REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
