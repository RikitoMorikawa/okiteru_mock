-- Separate location and notes columns for each attendance type
-- This migration adds specific location and notes columns for wake_up, departure, and arrival

-- Add wake_up specific columns
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS wake_up_location TEXT;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS wake_up_notes TEXT;

-- Add departure specific columns
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS departure_location TEXT;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS departure_notes TEXT;

-- Add arrival specific columns
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS arrival_location TEXT;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS arrival_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.attendance_records.wake_up_location IS 'Location where staff woke up (GPS coordinates or address)';

COMMENT ON COLUMN public.attendance_records.wake_up_notes IS 'Notes about wake up time (health condition, sleep quality, etc.)';

COMMENT ON COLUMN public.attendance_records.departure_location IS 'Location where staff departed from (GPS coordinates or address)';

COMMENT ON COLUMN public.attendance_records.departure_notes IS 'Notes about departure (traffic conditions, delays, etc.)';

COMMENT ON COLUMN public.attendance_records.arrival_location IS 'Location where staff arrived (GPS coordinates or address)';

COMMENT ON COLUMN public.attendance_records.arrival_notes IS 'Notes about arrival (delays, issues, etc.)';

-- Migrate existing data from generic columns to specific columns
-- This preserves any existing data while transitioning to the new structure

-- Note: Since we can't determine which type of report the existing data belongs to,
-- we'll keep the old columns for now and let the application handle the transition

-- Verify the columns were added
DO $$
BEGIN
    -- Check wake_up columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'wake_up_location') THEN
        RAISE NOTICE 'Column "wake_up_location" added successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'wake_up_notes') THEN
        RAISE NOTICE 'Column "wake_up_notes" added successfully';
    END IF;
    
    -- Check departure columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'departure_location') THEN
        RAISE NOTICE 'Column "departure_location" added successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'departure_notes') THEN
        RAISE NOTICE 'Column "departure_notes" added successfully';
    END IF;
    
    -- Check arrival columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'arrival_location') THEN
        RAISE NOTICE 'Column "arrival_location" added successfully';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'arrival_notes') THEN
        RAISE NOTICE 'Column "arrival_notes" added successfully';
    END IF;
    
    RAISE NOTICE 'Migration 010: Separate location and notes columns completed successfully';
END $$;
;