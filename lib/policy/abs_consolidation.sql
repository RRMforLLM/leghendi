# User Policies
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

# Agenda Policies
-- First, drop ALL existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON %I;',
                   pol.policyname,
                   tab.tablename),
            E'\n'
        )
        FROM pg_policies pol
        JOIN pg_tables tab ON pol.tablename = tab.tablename
        WHERE tab.schemaname = 'public'
    );
END $$;

-- Agenda base policies (completely independent)
CREATE POLICY "agenda_select_own" ON "Agenda"
FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "agenda_select_public" ON "Agenda"
FOR SELECT USING (key_visible = true);

CREATE POLICY "agenda_insert" ON "Agenda"
FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "agenda_delete" ON "Agenda"
FOR DELETE USING (creator_id = auth.uid());

-- Member policies (only depends on user_id)
CREATE POLICY "member_select" ON "Agenda Member"
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "member_insert" ON "Agenda Member"
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "member_delete" ON "Agenda Member"
FOR DELETE USING (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
    )
);

-- Editor policies (only depends on user_id)
CREATE POLICY "editor_select" ON "Agenda Editor"
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "editor_insert" ON "Agenda Editor"
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "editor_delete" ON "Agenda Editor"
FOR DELETE USING (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
    )
);

-- Urgent Element policies (only depends on user_id)
CREATE POLICY "urgent_select" ON "Urgent Element"
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "urgent_insert" ON "Urgent Element"
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "urgent_element_delete" ON "Urgent Element"
FOR DELETE USING (
    element_id IN (
        SELECT id FROM "Agenda Element"
        WHERE section_id IN (
            SELECT id FROM "Agenda Section"
            WHERE agenda_id IN (
                SELECT id FROM "Agenda"
                WHERE creator_id = auth.uid()
            )
        )
    )
);

-- Section policies (only depends on agenda creator)
CREATE POLICY "section_select" ON "Agenda Section"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id
        AND (creator_id = auth.uid() OR key_visible = true)
    )
);

CREATE POLICY "section_delete" ON "Agenda Section"
FOR DELETE USING (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
    )
);

-- Add section insert policy
CREATE POLICY "section_insert" ON "Agenda Section"
FOR INSERT WITH CHECK (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
    )
);

-- Element policies (only depends on section)
CREATE POLICY "element_select" ON "Agenda Element"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Agenda Section"
        WHERE id = section_id
    )
);

CREATE POLICY "element_delete" ON "Agenda Element"
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM "Agenda Section" s
        JOIN "Agenda" a ON s.agenda_id = a.id
        WHERE s.id = section_id
        AND a.creator_id = auth.uid()
    )
);

-- Update element insert policy to include editors
CREATE POLICY "element_insert" ON "Agenda Element"
FOR INSERT WITH CHECK (
    section_id IN (
        SELECT id FROM "Agenda Section"
        WHERE agenda_id IN (
            SELECT id FROM "Agenda"
            WHERE creator_id = auth.uid() OR
            id IN (SELECT agenda_id FROM "Agenda Editor" WHERE user_id = auth.uid())
        )
    )
);

-- Add Element Comment delete policy
CREATE POLICY "comment_delete" ON "Element Comment"
FOR DELETE USING (
    element_id IN (
        SELECT id FROM "Agenda Element"
        WHERE section_id IN (
            SELECT id FROM "Agenda Section"
            WHERE agenda_id IN (
                SELECT id FROM "Agenda"
                WHERE creator_id = auth.uid()
            )
        )
    )
);

-- Enable RLS
ALTER TABLE "Agenda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Editor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Urgent Element" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Element" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Element Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Element Comment" FORCE ROW LEVEL SECURITY;

# Update Foreign Key Constraints
-- Drop existing foreign key constraints first
ALTER TABLE "Agenda Section" DROP CONSTRAINT IF EXISTS "Agenda Section_agenda_id_fkey";
ALTER TABLE "Agenda Element" DROP CONSTRAINT IF EXISTS "Agenda Element_section_id_fkey";
ALTER TABLE "Agenda Editor" DROP CONSTRAINT IF EXISTS "Agenda Editor_agenda_id_fkey";
ALTER TABLE "Agenda Member" DROP CONSTRAINT IF EXISTS "Agenda Member_agenda_id_fkey";
ALTER TABLE "Element Comment" DROP CONSTRAINT IF EXISTS "Element Comment_element_id_fkey";
ALTER TABLE "Completed Element" DROP CONSTRAINT IF EXISTS "Completed Element_element_id_fkey";
ALTER TABLE "Neutral Element" DROP CONSTRAINT IF EXISTS "Neutral Element_element_id_fkey";
ALTER TABLE "Urgent Element" DROP CONSTRAINT IF EXISTS "Urgent Element_element_id_fkey";

-- Add new constraints with CASCADE
ALTER TABLE "Agenda Section"
ADD CONSTRAINT "Agenda Section_agenda_id_fkey"
FOREIGN KEY (agenda_id) 
REFERENCES "Agenda"(id) 
ON DELETE CASCADE;

ALTER TABLE "Agenda Element"
ADD CONSTRAINT "Agenda Element_section_id_fkey"
FOREIGN KEY (section_id) 
REFERENCES "Agenda Section"(id) 
ON DELETE CASCADE;

ALTER TABLE "Agenda Editor"
ADD CONSTRAINT "Agenda Editor_agenda_id_fkey"
FOREIGN KEY (agenda_id) 
REFERENCES "Agenda"(id) 
ON DELETE CASCADE;

ALTER TABLE "Agenda Member"
ADD CONSTRAINT "Agenda Member_agenda_id_fkey"
FOREIGN KEY (agenda_id) 
REFERENCES "Agenda"(id) 
ON DELETE CASCADE;

ALTER TABLE "Element Comment"
ADD CONSTRAINT "Element Comment_element_id_fkey"
FOREIGN KEY (element_id) 
REFERENCES "Agenda Element"(id) 
ON DELETE CASCADE;

ALTER TABLE "Completed Element"
ADD CONSTRAINT "Completed Element_element_id_fkey"
FOREIGN KEY (element_id) 
REFERENCES "Agenda Element"(id) 
ON DELETE CASCADE;

ALTER TABLE "Neutral Element"
ADD CONSTRAINT "Neutral Element_element_id_fkey"
FOREIGN KEY (element_id) 
REFERENCES "Agenda Element"(id) 
ON DELETE CASCADE;

ALTER TABLE "Urgent Element"
ADD CONSTRAINT "Urgent Element_element_id_fkey"
FOREIGN KEY (element_id) 
REFERENCES "Agenda Element"(id) 
ON DELETE CASCADE;

# Add description to Profile table
-- Update RLS policy for Profile table to allow description updates
CREATE POLICY "Users can update own profile description"
ON "public"."Profile"
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

# Comment Access Control Policies
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

# Add Foreign Key Constraint for Profile Comment
ALTER TABLE public."Profile Comment"
DROP CONSTRAINT "Profile Comment_author_id_fkey";

-- Add foreign key constraint for Profile Comment table
ALTER TABLE "public"."Profile Comment"
ADD CONSTRAINT "Profile Comment_author_id_fkey"
FOREIGN KEY (author_id) REFERENCES "public"."Profile"(id)
ON DELETE CASCADE;

# Update Foreign Key Constraint for Agenda Comments
-- Drop the existing foreign key constraint
ALTER TABLE public."Agenda Comment"
DROP CONSTRAINT "Agenda Comment_author_id_fkey";

-- Add new foreign key constraint for Agenda Comment table
ALTER TABLE "public"."Agenda Comment"
ADD CONSTRAINT "Agenda Comment_author_id_fkey"
FOREIGN KEY (author_id) REFERENCES "public"."Profile"(id)
ON DELETE CASCADE;

# Row Level Security for Agenda Comments
-- Enable RLS
ALTER TABLE "Agenda Comment" ENABLE ROW LEVEL SECURITY;

-- Policy for inserting comments
CREATE POLICY "Users can add comments to agendas they have access to" ON "Agenda Comment"
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Agenda" a
    LEFT JOIN "Agenda Member" am ON am.agenda_id = a.id
    LEFT JOIN "Agenda Editor" ae ON ae.agenda_id = a.id
    WHERE a.id = "Agenda Comment".agenda_id
    AND (
      a.creator_id = auth.uid() OR
      am.user_id = auth.uid() OR
      ae.user_id = auth.uid()
    )
  )
);

-- Policy for reading comments
CREATE POLICY "Users can read comments on agendas they have access to" ON "Agenda Comment"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Agenda" a
    LEFT JOIN "Agenda Member" am ON am.agenda_id = a.id
    LEFT JOIN "Agenda Editor" ae ON ae.agenda_id = a.id
    WHERE a.id = "Agenda Comment".agenda_id
    AND (
      a.creator_id = auth.uid() OR
      am.user_id = auth.uid() OR
      ae.user_id = auth.uid()
    )
  )
);

# Element Policies Management
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

# Add Foreign Key Constraint to Agenda Member
ALTER TABLE public."Agenda Member"
DROP CONSTRAINT "Agenda Member_user_id_fkey";
alter table "public"."Agenda Member" 
add constraint "Agenda Member_user_id_fkey" 
foreign key ("user_id") 
references "public"."Profile"("id") 
on delete cascade;

# Enable RLS and Manage Reactions
-- First, enable RLS on the Reaction table
ALTER TABLE "public"."Reaction" ENABLE ROW LEVEL SECURITY;

-- Create policy for inserting reactions (allow users to add their own reactions)
CREATE POLICY "Users can add reactions" ON "public"."Reaction"
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create policy for viewing reactions (allow everyone to view all reactions)
CREATE POLICY "Anyone can view reactions" ON "public"."Reaction"
FOR SELECT
USING (true);

-- Create policy for deleting reactions (allow users to delete their own reactions)
CREATE POLICY "Users can delete their own reactions" ON "public"."Reaction"
FOR DELETE
USING (auth.uid() = sender_id);

-- Create policy for updating reactions (optional, if needed)
CREATE POLICY "Users can update their own reactions" ON "public"."Reaction"
FOR UPDATE
USING (auth.uid() = sender_id);

# User Access Policies for Completed Elements
-- Drop existing policies first
drop policy if exists "Users can view their own completed elements" on "Completed Element";
drop policy if exists "Users can view agenda elements they completed" on "Agenda Element";
drop policy if exists "Users can view sections containing their completed elements" on "Agenda Section";
drop policy if exists "Users can manage their own completed elements" on "Completed Element";

-- Simple policy for completed elements
create policy "Users can manage their own completed elements"
on "Completed Element"
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policy for viewing agenda elements (simplified)
create policy "Users can view agenda elements"
on "Agenda Element"
for select
using (
  exists (
    select 1
    from "Agenda Section" s
    join "Agenda" a on a.id = s.agenda_id
    where s.id = "Agenda Element".section_id
    and (
      a.creator_id = auth.uid()
      or exists (
        select 1
        from "Agenda Member"
        where agenda_id = a.id
        and user_id = auth.uid()
      )
      or exists (
        select 1
        from "Agenda Editor"
        where agenda_id = a.id
        and user_id = auth.uid()
      )
    )
  )
);

-- Policy for viewing sections (simplified)
create policy "Users can view agenda sections"
on "Agenda Section"
for select
using (
  exists (
    select 1
    from "Agenda" a
    where a.id = "Agenda Section".agenda_id
    and (
      a.creator_id = auth.uid()
      or exists (
        select 1
        from "Agenda Member"
        where agenda_id = a.id
        and user_id = auth.uid()
      )
      or exists (
        select 1
        from "Agenda Editor"
        where agenda_id = a.id
        and user_id = auth.uid()
      )
    )
  )
);

# Manage Agenda Policies and Constraints
-- First, drop all existing policies
DO $$ 
BEGIN
    EXECUTE (
        SELECT string_agg(
            format('DROP POLICY IF EXISTS %I ON %I;',
                   pol.policyname,
                   tab.tablename),
            E'\n'
        )
        FROM pg_policies pol
        JOIN pg_tables tab ON pol.tablename = tab.tablename
        WHERE tab.schemaname = 'public'
    );
END $$;

-- Enable RLS on all tables
ALTER TABLE "Agenda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Element" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Editor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Completed Element" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Urgent Element" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User Credit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agenda Comment" ENABLE ROW LEVEL SECURITY;

-- Agenda policies
CREATE POLICY "agenda_access" ON "Agenda"
FOR ALL USING (
    creator_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM "Agenda Member" WHERE agenda_id = id AND user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM "Agenda Editor" WHERE agenda_id = id AND user_id = auth.uid()
    ) OR
    key_visible = true
);

-- Agenda Section policies
CREATE POLICY "section_access" ON "Agenda Section"
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM "Agenda" a
        WHERE a.id = agenda_id AND (
            a.creator_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM "Agenda Member" 
                WHERE agenda_id = a.id AND user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM "Agenda Editor" 
                WHERE agenda_id = a.id AND user_id = auth.uid()
            ) OR
            a.key_visible = true
        )
    )
);

-- Agenda Element policies
CREATE POLICY "element_access" ON "Agenda Element"
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM "Agenda Section" s
        JOIN "Agenda" a ON a.id = s.agenda_id
        WHERE s.id = section_id AND (
            a.creator_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM "Agenda Member" 
                WHERE agenda_id = a.id AND user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM "Agenda Editor" 
                WHERE agenda_id = a.id AND user_id = auth.uid()
            ) OR
            a.key_visible = true
        )
    )
);

-- Member and Editor policies (simplified)
CREATE POLICY "member_access" ON "Agenda Member"
FOR ALL USING (user_id = auth.uid());

CREATE POLICY "editor_access" ON "Agenda Editor"
FOR ALL USING (user_id = auth.uid());

-- Element state policies
CREATE POLICY "completed_element_access" ON "Completed Element"
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "urgent_element_access" ON "Urgent Element"
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Profile related policies
CREATE POLICY "profile_access" ON "Profile"
FOR SELECT USING (true);  -- Profiles are publicly readable
CREATE POLICY "profile_update" ON "Profile"
FOR UPDATE USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Comment policies
CREATE POLICY "agenda_comment_access" ON "Agenda Comment"
FOR ALL USING (
    author_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM "Agenda" a
        WHERE a.id = agenda_id AND (
            a.creator_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM "Agenda Member" 
                WHERE agenda_id = a.id AND user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM "Agenda Editor" 
                WHERE agenda_id = a.id AND user_id = auth.uid()
            )
        )
    )
);

-- Profile Comment policies
CREATE POLICY "profile_comment_access" ON "Profile Comment"
FOR SELECT USING (true);
CREATE POLICY "profile_comment_modify" ON "Profile Comment"
FOR ALL USING (author_id = auth.uid());

-- Reaction policies
CREATE POLICY "reaction_access" ON "Reaction"
FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "reaction_modify" ON "Reaction"
FOR ALL USING (sender_id = auth.uid());

-- User Credit policies
CREATE POLICY "credit_access" ON "User Credit"
FOR ALL USING (user_id = auth.uid());