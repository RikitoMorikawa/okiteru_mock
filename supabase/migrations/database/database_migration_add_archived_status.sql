-- Add 'archived' to attendance_status enum
-- IMPORTANT: Execute these statements ONE BY ONE, not as a single transaction

-- Step 1: Add the new enum value (execute this first)
ALTER TYPE attendance_status ADD VALUE 'archived';

-- Step 2: Commit the transaction (this happens automatically in Supabase SQL Editor)

-- Step 3: Verify the enum values (execute this after step 1 is committed)
-- SELECT unnest(enum_range(NULL::attendance_status)) AS attendance_status_values;

-- Alternative approach if the above doesn't work:
-- You can also recreate the enum type entirely:

/*
-- Step A: Create new enum type
CREATE TYPE attendance_status_new AS ENUM ('pending', 'partial', 'complete', 'active', 'reset', 'archived');

-- Step B: Add new column with new type
ALTER TABLE attendance_records ADD COLUMN status_new attendance_status_new;

-- Step C: Copy data from old column to new column
UPDATE attendance_records SET status_new = status::text::attendance_status_new;

-- Step D: Drop old column
ALTER TABLE attendance_records DROP COLUMN status;

-- Step E: Rename new column
ALTER TABLE attendance_records RENAME COLUMN status_new TO status;

-- Step F: Drop old enum type
DROP TYPE attendance_status;

-- Step G: Rename new enum type
ALTER TYPE attendance_status_new RENAME TO attendance_status;
*/