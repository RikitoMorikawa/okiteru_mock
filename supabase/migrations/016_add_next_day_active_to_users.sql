-- Add next day status column to users table for managing tomorrow's availability
-- This separates current day status (active) from next day status (next_day_active)

ALTER TABLE public.users
ADD COLUMN next_day_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for better performance when filtering by next day status
CREATE INDEX idx_users_next_day_active ON public.users (next_day_active);

-- Add comment to document the column purpose
COMMENT ON COLUMN public.users.next_day_active IS 'Indicates if the user will be active and available for scheduling on the next day';

-- Optional: Add a composite index for queries that filter by both current and next day status
CREATE INDEX idx_users_active_next_day_active ON public.users (active, next_day_active);