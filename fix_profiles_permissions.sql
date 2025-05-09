-- Fix permissions for profiles table
-- This script ensures team members can update their own profiles

-- Remove potentially conflicting policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Ensure profiles table has Row Level Security enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add permissive policy for authenticated users to view and update their own profiles
CREATE POLICY "Users can view and update own profile" ON public.profiles
    FOR ALL 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow profiles to be created when a user signs up (needed for auth trigger)
CREATE POLICY "Allow profile creation on sign up" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Make sure any auth trigger is set up correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (new.id, 
         coalesce(new.raw_user_meta_data->>'full_name', ''), 
         new.email, 
         coalesce(new.raw_user_meta_data->>'role', 'owner')
        );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure the trigger is set up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  
-- Grant permissions on the table
GRANT ALL ON public.profiles TO authenticated, anon, service_role; 