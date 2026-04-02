-- Add re-engagement drip email types to notification_type enum
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction in PostgreSQL.
-- These statements run as standalone DDL outside any transaction block.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 're-engagement-day3';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 're-engagement-day7';
