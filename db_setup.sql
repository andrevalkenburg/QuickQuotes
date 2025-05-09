-- Ensure invited_team_members table has the right structure and permissions
-- This script focuses on making the team member invitation flow work correctly

-- Check if table exists, create it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invited_team_members') THEN
        -- Create the table
        CREATE TABLE public.invited_team_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL,
            email TEXT NOT NULL,
            role TEXT DEFAULT 'team_member',
            invited_by UUID,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT now()
        );
        
        -- Add index on email for faster lookups (case insensitive)
        CREATE INDEX idx_invited_team_members_email_lower 
        ON public.invited_team_members (LOWER(email));
        
        RAISE NOTICE 'Created invited_team_members table';
    ELSE
        RAISE NOTICE 'Table invited_team_members already exists';
    END IF;
END
$$;

-- Drop any existing policies for a clean start
DROP POLICY IF EXISTS "Allow all operations for all users" ON public.invited_team_members;

-- Enable RLS
ALTER TABLE public.invited_team_members ENABLE ROW LEVEL SECURITY;

-- Create a VERY PERMISSIVE policy for development
-- IMPORTANT: In production, you would want to restrict this!
CREATE POLICY "Allow all operations for all users" ON public.invited_team_members
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant table permissions
GRANT ALL ON public.invited_team_members TO authenticated, anon, service_role;

-- Log all existing invitations for debugging
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.invited_team_members;
    RAISE NOTICE 'Total invitations in database: %', total_count;
END
$$; 