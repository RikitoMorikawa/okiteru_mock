-- Add GPS location column for arrival reports
-- This separates GPS coordinates from manual location input

-- Add GPS location column for arrival
ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS arrival_gps_location TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.attendance_records.arrival_gps_location IS 'GPS coordinates where staff arrived (latitude, longitude) - automatically obtained via GPS';

COMMENT ON COLUMN public.attendance_records.location IS 'Manual location input where staff arrived (place name, address) - user input';

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'arrival_gps_location') THEN
        RAISE NOTICE 'Column "arrival_gps_location" added successfully';
    END IF;
    
    RAISE NOTICE 'Migration 013: Add GPS location column completed successfully';
    RAISE NOTICE 'GPS coordinates and manual location input are now separated';
END $$;
;