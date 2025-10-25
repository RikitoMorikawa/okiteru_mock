-- Remove the unique constraint on (staff_id, date) from daily_reports to allow multiple reports per day
ALTER TABLE public.daily_reports
DROP CONSTRAINT IF EXISTS daily_reports_staff_id_date_key;

-- Add an index for better performance when querying by staff_id and date
CREATE INDEX IF NOT EXISTS idx_daily_reports_staff_date_status ON public.daily_reports (
    staff_id,
    date,
    status,
    created_at DESC
);