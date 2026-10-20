ALTER TABLE items ADD COLUMN deleted_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_items_deleted ON items(deleted_at);
