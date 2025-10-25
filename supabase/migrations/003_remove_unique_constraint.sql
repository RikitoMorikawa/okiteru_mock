-- Remove the unique constraint on (staff_id, date) to allow multiple records per day
ALTER TABLE public.attendance_records
DROP CONSTRAINT IF EXISTS attendance_records_staff_id_date_key;

-- Add an index for better performance when querying by staff_id and date
CREATE INDEX IF NOT EXISTS idx_attendance_records_staff_date_status ON public.attendance_records (
    staff_id,
    date,
    status,
    created_at DESC
);