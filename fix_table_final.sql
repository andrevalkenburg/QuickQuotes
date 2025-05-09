-- FINAL FIX for invited_team_members table and RLS policies
-- Run this script to completely reset and fix the team member invitation system

-- First, remove existing policies to start fresh
DROP POLICY IF EXISTS select_invited_by_email ON public.invited_team_members;
DROP POLICY IF EXISTS select_all_invited_by_owner ON public.invited_team_members;
DROP POLICY IF EXISTS select_all_for_authenticated ON public.invited_team_members; 
DROP POLICY IF EXISTS insert_team_member_policy ON public.invited_team_members;
DROP POLICY IF EXISTS delete_invites_by_owner ON public.invited_team_members;
DROP POLICY IF EXISTS update_invites_by_owner ON public.invited_team_members;

-- Reset the entire table if needed
DO $$
BEGIN
    -- Drop table if it exists
    DROP TABLE IF EXISTS public.invited_team_members;

    -- Create the table fresh
    CREATE TABLE public.invited_team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id UUID,
        email TEXT NOT NULL,
        role TEXT DEFAULT 'team_member',
        invited_by UUID,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add RLS
    ALTER TABLE public.invited_team_members ENABLE ROW LEVEL SECURITY;

    -- Create a simple SUPER PERMISSIVE policy for development/testing
    -- IMPORTANT: For production, you would want to restrict this!
    CREATE POLICY "Allow all operations for all users" ON public.invited_team_members
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);

    -- Add test data
    INSERT INTO public.invited_team_members (email, status, business_id) 
    VALUES ('testm@gmail.com', 'pending', 
            (SELECT id FROM public.businesses LIMIT 1)
    );

    RAISE NOTICE 'Table reset successful. Created test entry for testm@gmail.com';
END
$$;

-- Add an explicit grant for the table
GRANT ALL ON public.invited_team_members TO authenticated, anon, service_role; 