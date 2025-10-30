-- Create a function to update dashboard preference safely
-- This function is needed for the TypeScript code to work without type errors

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

-- Grant execute permission to authenticated users
GRANT
EXECUTE ON FUNCTION update_user_dashboard_preference (UUID, TEXT) TO authenticated;