-- Completed Element Policies
ALTER TABLE "Completed Element" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own completed elements"
ON "Completed Element"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed elements"
ON "Completed Element"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view completed elements"
ON "Completed Element"
FOR SELECT
TO authenticated
USING (true);

-- Urgent Element Policies
ALTER TABLE "Urgent Element" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own urgent elements"
ON "Urgent Element"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own urgent elements"
ON "Urgent Element"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view urgent elements"
ON "Urgent Element"
FOR SELECT
TO authenticated
USING (true);
