-- Check all rows in the invited_team_members table
SELECT * FROM public.invited_team_members;

-- Check specific emails
SELECT * FROM public.invited_team_members 
WHERE LOWER(email) = 'tester@gmail.com';

SELECT * FROM public.invited_team_members 
WHERE LOWER(email) = 'testm@gmail.com';

-- Count total invitations
SELECT COUNT(*) FROM public.invited_team_members;

-- Check all available businesses
SELECT * FROM public.businesses; 