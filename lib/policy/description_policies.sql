-- Update RLS policy for Profile table to allow description updates
CREATE POLICY "Users can update own profile description"
ON "public"."Profile"
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);