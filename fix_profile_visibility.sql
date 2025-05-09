-- Fix profiles table policies to allow viewing team members
-- This script fixes the infinite recursion issue with policies

-- First, remove ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view profiles in same business" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view and update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation on sign up" ON public.profiles;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a simple policy that allows users to view ANY profile (for team member visibility)
-- This is permissive but necessary for team functionality
CREATE POLICY "Users can view any profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Create a policy that only allows users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Create a policy that only allows users to insert their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- For debugging: Log the existing profiles
SELECT id, email, role, business_id FROM public.profiles;

-- Add a comment to explain the fix
COMMENT ON TABLE public.profiles IS 'Fixed to avoid infinite recursion in policies';

-- NOTE: This is permissive for SELECT operations but restrictive for modifications.
-- In a production environment, you might want to further restrict profile visibility
-- based on business relationships. 