-- SQL script to fix invited_team_members table issues
-- First check if the table exists
DO $$
BEGIN
    -- First, drop problematic policies if they exist
    DROP POLICY IF EXISTS select_invited_by_email ON public.invited_team_members;
    DROP POLICY IF EXISTS select_all_invited_by_owner ON public.invited_team_members;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invited_team_members') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE public.invited_team_members (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'team_member',
            invited_by UUID,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT now(),
            
            CONSTRAINT fk_business_id
                FOREIGN KEY (business_id)
                REFERENCES public.businesses(id)
                ON DELETE CASCADE
        );
        
        -- Add Row Level Security
        ALTER TABLE public.invited_team_members ENABLE ROW LEVEL SECURITY;
        
        -- Policy for inserting team members - business owners only
        CREATE POLICY insert_team_member_policy ON public.invited_team_members
            FOR INSERT TO authenticated
            WITH CHECK (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role = 'owner'
                AND profiles.business_id = invited_team_members.business_id
            ));
            
        RAISE NOTICE 'Created invited_team_members table';
    ELSE
        -- Table exists, ensure columns exist
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_schema = 'public' 
                      AND table_name = 'invited_team_members' 
                      AND column_name = 'status') THEN
            ALTER TABLE public.invited_team_members ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
            RAISE NOTICE 'Added status column';
        END IF;
        
        RAISE NOTICE 'Table invited_team_members already exists';
    END IF;
    
    -- Make sure we have an email index for faster lookups
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE tablename = 'invited_team_members' AND indexname = 'idx_invited_team_members_email'
    ) THEN
        CREATE INDEX idx_invited_team_members_email ON public.invited_team_members (email);
        RAISE NOTICE 'Created email index';
    END IF;
    
    -- Always recreate these policies to ensure they're correct
    -- VERY PERMISSIVE policy for testing - allow all authenticated users to select from the table
    -- In production you would want to restrict this more
    CREATE POLICY select_all_for_authenticated ON public.invited_team_members
        FOR SELECT TO authenticated
        USING (true);
        
    -- Business owners can update their invites
    CREATE POLICY update_invites_by_owner ON public.invited_team_members
        FOR UPDATE TO authenticated
        USING (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'owner'
            AND profiles.business_id = invited_team_members.business_id
        ));
        
    -- Business owners can delete their invites
    CREATE POLICY delete_invites_by_owner ON public.invited_team_members
        FOR DELETE TO authenticated
        USING (EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'owner'
            AND profiles.business_id = invited_team_members.business_id
        ));
            
    RAISE NOTICE 'Updated invited_team_members policies';
    
    -- Add a sample entry for testing if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM public.invited_team_members WHERE email = 'testm@gmail.com') THEN
        -- Find a valid business_id to use
        DECLARE 
            valid_business_id UUID;
        BEGIN
            SELECT id INTO valid_business_id FROM public.businesses LIMIT 1;
            
            IF valid_business_id IS NOT NULL THEN
                INSERT INTO public.invited_team_members (
                    business_id, email, role, status, created_at
                ) VALUES (
                    valid_business_id, 'testm@gmail.com', 'team_member', 'pending', now()
                );
                RAISE NOTICE 'Added test member: testm@gmail.com';
            ELSE
                RAISE NOTICE 'No businesses found to create test member';
            END IF;
        END;
    END IF;
END
$$; 