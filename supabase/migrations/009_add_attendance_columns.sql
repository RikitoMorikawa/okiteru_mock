-- Add missing columns to attendance_records table
-- This migration adds notes, destination, and location columns

-- Add notes column (for general notes/comments)
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add destination column (for departure reports - where the staff is going)
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS destination TEXT;

-- Add location column (for arrival reports - where the staff arrived)
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.attendance_records.notes IS 'General notes or comments for the attendance record';

COMMENT ON COLUMN public.attendance_records.destination IS 'Destination for departure reports (where staff is going)';

COMMENT ON COLUMN public.attendance_records.location IS 'Location for arrival reports (where staff arrived)';

-- Verify the columns were added (this will show in the migration log)
DO $$
BEGIN
    -- Check if columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'notes') THEN
        RAISE NOTICE 'Column "notes" added successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'destination') THEN
        RAISE NOTICE 'Column "destination" added successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'location') THEN
        RAISE NOTICE 'Column "location" added successfully';
    END IF;
END $$;