-- Separate notes columns for each attendance type and keep location only for arrival
-- This migration adds specific notes columns for wake_up, departure, and arrival
-- Location is only tracked for arrival reports

-- Add wake_up specific notes column
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS wake_up_notes TEXT;

-- Add departure specific notes column
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS departure_notes TEXT;

-- Add arrival specific notes column
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS arrival_notes TEXT;

-- Rename existing location column to arrival_location for clarity
-- (The existing 'location' column will be used for arrival location)
-- No need to add arrival_location as it already exists as 'location'

-- Add comments for documentation
COMMENT ON COLUMN public.attendance_records.wake_up_notes IS 'Notes about wake up time (health condition, sleep quality, etc.)';

COMMENT ON COLUMN public.attendance_records.departure_notes IS 'Notes about departure (traffic conditions, delays, etc.)';

COMMENT ON COLUMN public.attendance_records.arrival_notes IS 'Notes about arrival (delays, issues, etc.)';

COMMENT ON COLUMN public.attendance_records.location IS 'Location where staff arrived (GPS coordinates or address) - used for arrival reports only';

-- Verify the columns were added
DO $$
BEGIN
    -- Check notes columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'wake_up_notes') THEN
        RAISE NOTICE 'Column "wake_up_notes" added successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'departure_notes') THEN
        RAISE NOTICE 'Column "departure_notes" added successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'arrival_notes') THEN
        RAISE NOTICE 'Column "arrival_notes" added successfully';
    END IF;
    
    RAISE NOTICE 'Migration 012: Separate notes columns (location only for arrival) completed successfully';
    RAISE NOTICE 'Note: Existing "location" column is used for arrival location only';
END $$;
;