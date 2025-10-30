-- Add manager dashboard view preference column to users table (if not exists)
-- This column stores whether the manager prefers to view today's or next day's reports

-- Add column only if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'dashboard_view_preference'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users
        ADD COLUMN dashboard_view_preference TEXT DEFAULT 'today' CHECK (
            dashboard_view_preference IN ('today', 'next_day')
        );
    END IF;
END $$;

-- Add index for better performance when querying manager preferences (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_users_dashboard_view_preference'
    ) THEN
        CREATE INDEX idx_users_dashboard_view_preference ON public.users (dashboard_view_preference)
        WHERE role = 'manager';
    END IF;
END $$;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.users.dashboard_view_preference IS 'Manager dashboard view preference: today (current day reports) or next_day (next day reports)';

-- Create a function to update dashboard preference safely
CREATE OR REPLACE FUNCTION update_user_dashboard_preference(user_id UUID, preference TEXT)
RETURNS VOID AS $$
BEGIN
  -- Validate preference value
  IF preference NOT IN ('today', 'next_day') THEN
    RAISE EXCEPTION 'Invalid preference value. Must be "today" or "next_day"';
  END IF;
  
  -- Update the user's dashboard preference
  UPDATE public.users 
  SET dashboard_view_preference = preference 
  WHERE id = user_id;
  
  -- Check if the update affected any rows
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found with id: %', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;