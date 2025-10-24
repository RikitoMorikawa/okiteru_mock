-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create profile if it doesn't exist (to avoid conflicts with manual creation)
  INSERT INTO public.users (id, email, role, name)
  VALUES (
    NEW.id,
    NEW.email,
    'staff', -- Default role is staff
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)) -- Use name from metadata or email prefix
  )
  ON CONFLICT (id) DO NOTHING; -- Ignore if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete user profile when auth user is deleted
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically delete user profile on auth.users delete
CREATE OR REPLACE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Create a default manager user (this should be run manually with proper credentials)
-- This is commented out as it should be created through the admin interface
/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'manager@company.com',
  crypt('defaultpassword', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create manager profile
INSERT INTO public.users (id, email, role, name)
SELECT id, email, 'manager', 'System Manager'
FROM auth.users 
WHERE email = 'manager@company.com';
*/