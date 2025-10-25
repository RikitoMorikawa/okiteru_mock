-- Add new values to attendance_status enum
ALTER TYPE attendance_status ADD VALUE 'active';

ALTER TYPE attendance_status ADD VALUE 'reset';

ALTER TYPE attendance_status ADD VALUE 'reopened';

-- Add a comment to explain the status values
COMMENT ON TYPE attendance_status IS 'Status values: pending (initial), partial (some tasks done), active (in progress), complete (finished), reset (new day started), reopened (reopened after completion)';