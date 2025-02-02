-- First drop any existing user-related policies
DROP POLICY IF EXISTS "profile_select" ON "Profile";
DROP POLICY IF EXISTS "profile_insert" ON "Profile";
DROP POLICY IF EXISTS "profile_update" ON "Profile";
DROP POLICY IF EXISTS "profile_delete" ON "Profile";
DROP POLICY IF EXISTS "credit_select" ON "User Credit";
DROP POLICY IF EXISTS "credit_insert" ON "User Credit";
DROP POLICY IF EXISTS "credit_update" ON "User Credit";
DROP POLICY IF EXISTS "reaction_select" ON "Reaction";
DROP POLICY IF EXISTS "reaction_insert" ON "Reaction";

-- Profile policies - even more permissive for creation
CREATE POLICY "public_profiles" ON "Profile"
FOR SELECT USING (true);

CREATE POLICY "users_can_create_profile" ON "Profile"
FOR INSERT WITH CHECK (true);  -- Allow any authenticated user to create a profile

CREATE POLICY "users_can_update_own_profile" ON "Profile"
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_can_delete_own_profile" ON "Profile"
FOR DELETE USING (auth.uid() = id);

-- User Credit policies
CREATE POLICY "credit_select" ON "User Credit"
FOR SELECT USING (
    user_id = auth.uid() -- Can only view own credit
);

CREATE POLICY "credit_insert" ON "User Credit"
FOR INSERT WITH CHECK (
    user_id = auth.uid() -- Can only insert own credit
);

CREATE POLICY "credit_update" ON "User Credit"
FOR UPDATE USING (
    user_id = auth.uid() -- Can only update own credit
);

-- Reaction policies
CREATE POLICY "reaction_select" ON "Reaction"
FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid() -- Can see reactions they're involved in
);

CREATE POLICY "reaction_insert" ON "Reaction"
FOR INSERT WITH CHECK (
    sender_id = auth.uid() -- Can only create reactions as themselves
);

-- Enable RLS
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User Credit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users
ALTER TABLE "Profile" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User Credit" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" FORCE ROW LEVEL SECURITY;

-- Allow access for authenticated users
GRANT ALL ON "Profile" TO authenticated;
GRANT ALL ON "User Credit" TO authenticated;
GRANT ALL ON "Reaction" TO authenticated;
