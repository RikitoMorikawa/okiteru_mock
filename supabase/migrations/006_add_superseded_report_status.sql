-- Add superseded value to report_status enum
ALTER TYPE report_status ADD VALUE 'superseded';

-- Update the comment to explain all status values
COMMENT ON TYPE report_status IS 'Status values: draft (in progress), submitted (completed), archived (reset for new day but preserved for history), superseded (replaced by newer report)';