CREATE INDEX idx_items_parent_deleted ON items(parent_id, deleted_at);
DROP INDEX idx_items_parent;
