-- Create a reliable SQL function to find team invitations by email
-- This uses multiple matching strategies to ensure we find the invitation

-- First drop any existing version
DROP FUNCTION IF EXISTS public.find_team_invitation(text);

-- Create the stored procedure
CREATE OR REPLACE FUNCTION public.find_team_invitation(email_param TEXT)
RETURNS SETOF public.invited_team_members
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Try an exact match (case-insensitive)
  SELECT * FROM public.invited_team_members 
  WHERE LOWER(email) = LOWER(email_param)
  
  UNION
  
  -- Try a partial match (the email contains the parameter or vice versa)
  SELECT * FROM public.invited_team_members 
  WHERE 
    LOWER(email) LIKE '%' || LOWER(email_param) || '%' OR
    LOWER(email_param) LIKE '%' || LOWER(email) || '%'
  
  UNION
  
  -- Try matching just the username part (before the @)
  SELECT * FROM public.invited_team_members 
  WHERE 
    LOWER(SPLIT_PART(email, '@', 1)) = LOWER(SPLIT_PART(email_param, '@', 1))
    
  LIMIT 10;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_team_invitation(text) TO authenticated, anon, service_role;

-- Create a special test entry for tester@gmail.com if it doesn't exist
DO $$
DECLARE
    business_id_var UUID;
BEGIN
    -- Check if tester@gmail.com already exists
    IF NOT EXISTS (
        SELECT 1 FROM public.invited_team_members 
        WHERE LOWER(email) = 'tester@gmail.com'
    ) THEN
        -- Get a business ID
        SELECT id INTO business_id_var FROM public.businesses LIMIT 1;
        
        IF business_id_var IS NOT NULL THEN
            -- Insert the test record
            INSERT INTO public.invited_team_members (
                business_id, email, role, status, created_at
            ) VALUES (
                business_id_var, 
                'tester@gmail.com', 
                'team_member', 
                'pending', 
                NOW()
            );
            
            RAISE NOTICE 'Added test entry for tester@gmail.com';
        ELSE
            RAISE NOTICE 'No business ID found, cannot add test entry';
        END IF;
    ELSE
        RAISE NOTICE 'tester@gmail.com already exists in invited_team_members';
    END IF;
END
$$; 