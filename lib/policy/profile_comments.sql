-- Allow public read access
CREATE POLICY "Public read access"
ON "public"."Profile Comment"
FOR SELECT
USING (true);

-- Allow authenticated users to create comments
CREATE POLICY "Authenticated users can create comments"
ON "public"."Profile Comment"
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow authors to delete their own comments
CREATE POLICY "Users can delete own comments"
ON "public"."Profile Comment"
FOR DELETE
USING (auth.uid() = author_id);