-- Add active status column to users table
ALTER TABLE public.users
ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Add index for better performance when filtering by active status
CREATE INDEX idx_users_active ON public.users (active);

-- Add comment to document the column purpose
COMMENT ON COLUMN public.users.active IS 'Indicates if the user is currently active and available for scheduling';