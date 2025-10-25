-- Add archived value to report_status enum
ALTER TYPE report_status ADD VALUE 'archived';

-- Add a comment to explain the status values
COMMENT ON TYPE report_status IS 'Status values: draft (in progress), submitted (completed), archived (reset for new day but preserved for history)';