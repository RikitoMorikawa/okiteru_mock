-- Remove UNIQUE constraint from previous_day_reports table
-- This allows multiple previous day reports for the same user on the same date

-- Drop the existing unique constraint
ALTER TABLE public.previous_day_reports
DROP CONSTRAINT IF EXISTS previous_day_reports_user_id_report_date_key;

-- The index can remain as it's still useful for performance
-- CREATE INDEX IF NOT EXISTS idx_previous_day_reports_user_date ON public.previous_day_reports (user_id, report_date);