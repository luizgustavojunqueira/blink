DROP INDEX IF EXISTS idx_items_deleted;

ALTER TABLE items DROP COLUMN deleted_at;
