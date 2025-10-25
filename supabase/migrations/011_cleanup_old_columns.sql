-- Cleanup old generic columns after migration to specific columns
-- This migration removes the old generic 'notes' and 'location' columns
-- Run this ONLY after confirming all data has been migrated to the new specific columns

-- WARNING: This will permanently delete data in the old columns
-- Make sure to backup your database before running this migration

-- Uncomment the following lines when ready to remove old columns:

-- Remove old generic notes column (replaced by wake_up_notes, departure_notes, arrival_notes)
-- ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS notes;

-- Remove old generic location column (replaced by wake_up_location, departure_location, arrival_location)
-- ALTER TABLE public.attendance_records DROP COLUMN IF EXISTS location;

-- For now, just add a notice that this migration is available but not executed
DO $$
BEGIN
    RAISE NOTICE 'Migration 011: Cleanup old columns is available but not executed';
    RAISE NOTICE 'To execute: uncomment the DROP COLUMN statements in this migration';
    RAISE NOTICE 'WARNING: This will permanently delete data in old columns';
    RAISE NOTICE 'Make sure all data has been migrated to new specific columns first';
END $$;