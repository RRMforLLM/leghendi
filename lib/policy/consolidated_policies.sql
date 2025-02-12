-- First, drop ALL existing constraints and policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies
    FOR r IN (SELECT pol.policyname, tab.tablename
              FROM pg_policies pol
              JOIN pg_tables tab ON pol.tablename = tab.tablename
              WHERE tab.schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;

    -- Drop all foreign key constraints
    FOR r IN (SELECT tc.constraint_name, tc.table_name
              FROM information_schema.table_constraints tc
              WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = 'public')
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;
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

-- 1. Core Profile & User Policies
DROP POLICY IF EXISTS "profile_access" ON "Profile";
DROP POLICY IF EXISTS "profile_update" ON "Profile";

CREATE POLICY "public_profiles" ON "Profile"
FOR SELECT USING (true);

CREATE POLICY "users_can_create_profile" ON "Profile"
FOR INSERT WITH CHECK (true);  -- Allow any authenticated user to create a profile

CREATE POLICY "users_can_update_own_profile" ON "Profile"
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_can_delete_own_profile" ON "Profile"
FOR DELETE USING (auth.uid() = id);

CREATE POLICY "credit_management" ON "User Credit"
FOR ALL USING (user_id = auth.uid());

-- 2. Simplified Access Policies
DROP POLICY IF EXISTS "agenda_direct_access" ON "Agenda";
DROP POLICY IF EXISTS "section_direct_access" ON "Agenda Section";
DROP POLICY IF EXISTS "element_direct_access" ON "Agenda Element";
DROP POLICY IF EXISTS "member_basic_access" ON "Agenda Member";
DROP POLICY IF EXISTS "editor_basic_access" ON "Agenda Editor";

CREATE POLICY "agenda_select_own" ON "Agenda"
FOR SELECT USING (creator_id = auth.uid());

CREATE POLICY "agenda_select_public" ON "Agenda"
FOR SELECT USING (key_visible = true);

CREATE POLICY "agenda_insert" ON "Agenda"
FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "agenda_delete" ON "Agenda"
FOR DELETE USING (creator_id = auth.uid());

CREATE POLICY "member_select" ON "Agenda Member"
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "member_insert" ON "Agenda Member"
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "section_select" ON "Agenda Section"
FOR SELECT USING (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid() OR key_visible = true
    )
);

CREATE POLICY "section_insert" ON "Agenda Section"
FOR INSERT WITH CHECK (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
    )
);

-- Add missing section deletion policy after the section_insert policy
CREATE POLICY "section_delete" ON "Agenda Section"
FOR DELETE USING (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
    )
);

CREATE POLICY "element_select" ON "Agenda Element"
FOR SELECT USING (
    section_id IN (
        SELECT id FROM "Agenda Section"
        WHERE agenda_id IN (
            SELECT id FROM "Agenda"
            WHERE creator_id = auth.uid() OR key_visible = true
        )
    )
);

-- Also add element deletion policy
CREATE POLICY "element_delete" ON "Agenda Element"
FOR DELETE USING (
    section_id IN (
        SELECT id FROM "Agenda Section"
        WHERE agenda_id IN (
            SELECT id FROM "Agenda"
            WHERE creator_id = auth.uid()
        )
    )
);

-- 3. Element & State Policies
CREATE POLICY "element_access" ON "Agenda Element"
FOR ALL USING (
    section_id IN (
        SELECT s.id FROM "Agenda Section" s
        WHERE s.agenda_id IN (
            SELECT id FROM "Agenda"
            WHERE creator_id = auth.uid() OR
            key_visible = true OR
            id IN (
                SELECT agenda_id FROM "Agenda Member" WHERE user_id = auth.uid()
            ) OR
            id IN (
                SELECT agenda_id FROM "Agenda Editor" WHERE user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY "completed_element_access" ON "Completed Element"
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "urgent_element_access" ON "Urgent Element"
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Member & Editor Policies
CREATE POLICY "member_access" ON "Agenda Member"
FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id AND creator_id = auth.uid()
    )
);

CREATE POLICY "editor_access" ON "Agenda Editor"
FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id AND creator_id = auth.uid()
    )
);

-- 5. Comment Policies
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

CREATE POLICY "profile_comment_access" ON "Profile Comment"
FOR SELECT USING (true);

CREATE POLICY "profile_comment_modify" ON "Profile Comment"
FOR ALL USING (author_id = auth.uid());

-- 6. Reaction Policies
CREATE POLICY "reaction_access" ON "Reaction"
FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "reaction_modify" ON "Reaction"
FOR ALL USING (sender_id = auth.uid());

-- Add all foreign key constraints with CASCADE
ALTER TABLE "Agenda Section" 
ADD CONSTRAINT "Agenda Section_agenda_id_fkey"
FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Element"
ADD CONSTRAINT "Agenda Element_section_id_fkey"
FOREIGN KEY (section_id) REFERENCES "Agenda Section"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Editor"
ADD CONSTRAINT "Agenda Editor_agenda_id_fkey"
FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Member"
ADD CONSTRAINT "Agenda Member_agenda_id_fkey"
FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

ALTER TABLE "Completed Element"
ADD CONSTRAINT "Completed Element_element_id_fkey"
FOREIGN KEY (element_id) REFERENCES "Agenda Element"(id) ON DELETE CASCADE;

ALTER TABLE "Urgent Element"
ADD CONSTRAINT "Urgent Element_element_id_fkey"
FOREIGN KEY (element_id) REFERENCES "Agenda Element"(id) ON DELETE CASCADE;

ALTER TABLE "Profile Comment"
ADD CONSTRAINT "Profile Comment_profile_id_fkey"
FOREIGN KEY (profile_id) REFERENCES "Profile"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Comment"
ADD CONSTRAINT "Agenda Comment_agenda_id_fkey"
FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Member"
ADD CONSTRAINT "Agenda Member_user_id_fkey"
FOREIGN KEY (user_id) REFERENCES "Profile"(id) ON DELETE CASCADE;

-- Add missing author foreign key constraints for comments
ALTER TABLE "Agenda Comment"
ADD CONSTRAINT "Agenda Comment_author_id_fkey"
FOREIGN KEY (author_id) 
REFERENCES "Profile"(id) 
ON DELETE CASCADE;

ALTER TABLE "Profile Comment"
ADD CONSTRAINT "Profile Comment_author_id_fkey"
FOREIGN KEY (author_id) 
REFERENCES "Profile"(id) 
ON DELETE CASCADE;

-- Create basic policies for authored content
CREATE POLICY "agenda_comment_author_access" ON "Agenda Comment"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Profile"
        WHERE id = author_id
    )
);

CREATE POLICY "profile_comment_author_access" ON "Profile Comment"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Profile"
        WHERE id = author_id
    )
);
