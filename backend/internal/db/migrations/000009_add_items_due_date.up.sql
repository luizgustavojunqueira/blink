ALTER TABLE items ADD COLUMN due_date TEXT;
CREATE INDEX idx_items_due ON items(user_id, due_date);
