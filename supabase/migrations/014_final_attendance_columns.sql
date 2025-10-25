-- Final attendance columns migration
-- Add only the required columns based on current requirements:
-- - Notes columns for each report type (wake_up, departure, arrival)
-- - GPS location column for arrival only
-- - Keep existing 'location' column for manual arrival location input

-- Add notes columns for each report type
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS wake_up_notes TEXT;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS departure_notes TEXT;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS arrival_notes TEXT;

-- Add GPS location column for arrival reports only
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS arrival_gps_location TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.attendance_records.wake_up_notes IS 'Notes about wake up (health condition, sleep quality, etc.)';

COMMENT ON COLUMN public.attendance_records.departure_notes IS 'Notes about departure (traffic conditions, delays, etc.)';

COMMENT ON COLUMN public.attendance_records.arrival_notes IS 'Notes about arrival (delays, issues, etc.)';

COMMENT ON COLUMN public.attendance_records.arrival_gps_location IS 'GPS coordinates for arrival (latitude, longitude) - automatically obtained';

COMMENT ON COLUMN public.attendance_records.location IS 'Manual location input for arrival (place name, address) - user input';

-- Verify columns were added successfully
DO $$
BEGIN
    -- Check all required columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'wake_up_notes') THEN
        RAISE NOTICE 'Column "wake_up_notes" ready';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'departure_notes') THEN
        RAISE NOTICE 'Column "departure_notes" ready';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'arrival_notes') THEN
        RAISE NOTICE 'Column "arrival_notes" ready';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'arrival_gps_location') THEN
        RAISE NOTICE 'Column "arrival_gps_location" ready';
    END IF;
    
    RAISE NOTICE 'Migration 014: Final attendance columns completed successfully';
END $$;