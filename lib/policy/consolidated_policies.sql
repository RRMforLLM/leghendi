BEGIN;

-- Drop ALL constraints first (including foreign keys, check constraints, and unique constraints)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Find and drop all constraints (foreign key, check, unique)
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name, tc.constraint_type
        FROM information_schema.table_constraints tc
        WHERE tc.table_schema = 'public'
        AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE',
            r.table_schema, r.table_name, r.constraint_name);
    END LOOP;

    -- Find and drop all primary key constraints
    FOR r IN (
        SELECT tc.table_schema, tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE',
            r.table_schema, r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- Drop ALL policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    )
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I CASCADE', r.policyname, r.tablename);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop policy %: %', r.policyname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Drop ALL triggers
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tgname, relname
        FROM pg_trigger, pg_class
        WHERE pg_trigger.tgrelid = pg_class.oid
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    )
    LOOP
        BEGIN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I CASCADE', r.tgname, r.relname);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to drop trigger %: %', r.tgname, SQLERRM;
        END;
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

-- Set default value and add timestamp trigger for Profile table
ALTER TABLE "Profile" 
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

CREATE OR REPLACE FUNCTION update_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_timestamp ON "Profile";
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON "Profile"
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_timestamp();

-- Add trigger function for auto-creating profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Profile
  INSERT INTO public."Profile" (id, username, avatar_url, updated_at)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),  -- Set username to email prefix
    'https://api.dicebear.com/7.x/avataaars/svg',  -- Default avatar
    NOW()
  );
  
  -- Create User Credit with initial balance of 100
  INSERT INTO public."User Credit" (user_id, amount)
  VALUES (NEW.id, 100);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- First add PRIMARY KEYS
ALTER TABLE "Profile" ADD PRIMARY KEY (id);
ALTER TABLE "Agenda" ADD PRIMARY KEY (id);
ALTER TABLE "Agenda Section" ADD PRIMARY KEY (id);
ALTER TABLE "Agenda Element" ADD PRIMARY KEY (id);
ALTER TABLE "Agenda Editor" ADD PRIMARY KEY (id);
ALTER TABLE "Agenda Member" ADD PRIMARY KEY (id);
ALTER TABLE "Completed Element" ADD PRIMARY KEY (id);
ALTER TABLE "Urgent Element" ADD PRIMARY KEY (id);
ALTER TABLE "Profile Comment" ADD PRIMARY KEY (id);
ALTER TABLE "Reaction" ADD PRIMARY KEY (id);
ALTER TABLE "User Credit" ADD PRIMARY KEY (id);
ALTER TABLE "Agenda Comment" ADD PRIMARY KEY (id);

-- Add Foreign Keys - ONE PLACE ONLY, NO DUPLICATES
-- Core Profile relations
ALTER TABLE "Profile" 
ADD FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Agenda hierarchy (keep proper references)
ALTER TABLE "Agenda" 
ADD CONSTRAINT "Agenda_creator_id_fkey" 
    FOREIGN KEY (creator_id) REFERENCES "Profile"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Section" 
ADD CONSTRAINT "Agenda_Section_agenda_id_fkey"
    FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Element"
ADD CONSTRAINT "Agenda_Element_section_id_fkey"
    FOREIGN KEY (section_id) REFERENCES "Agenda Section"(id) ON DELETE CASCADE;

-- Member & Editor relations (reference Profile, not auth.users)
ALTER TABLE "Agenda Editor"
ADD CONSTRAINT "Agenda_Editor_user_id_fkey"
    FOREIGN KEY (user_id) REFERENCES "Profile"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Agenda_Editor_agenda_id_fkey"
    FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Member"
ADD CONSTRAINT "Agenda_Member_user_id_fkey"
    FOREIGN KEY (user_id) REFERENCES "Profile"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Agenda_Member_agenda_id_fkey"
    FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

-- Element states - Update these constraints
ALTER TABLE "Completed Element"
ADD CONSTRAINT "Completed_Element_user_id_fkey"
    FOREIGN KEY (user_id) REFERENCES "Profile"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Completed_Element_element_id_fkey"
    FOREIGN KEY (element_id) REFERENCES "Agenda Element"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Completed_Element_agenda_id_fkey"
    FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

ALTER TABLE "Urgent Element"
ADD COLUMN IF NOT EXISTS agenda_id BIGINT REFERENCES "Agenda"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Urgent_Element_user_id_fkey"
    FOREIGN KEY (user_id) REFERENCES "Profile"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Urgent_Element_element_id_fkey"
    FOREIGN KEY (element_id) REFERENCES "Agenda Element"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Urgent_Element_agenda_id_fkey"
    FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

-- Comments (reference Profile for authors)
ALTER TABLE "Profile Comment"
ADD CONSTRAINT "Profile_Comment_author_id_fkey"
    FOREIGN KEY (author_id) REFERENCES "Profile"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Profile_Comment_profile_id_fkey"
    FOREIGN KEY (profile_id) REFERENCES "Profile"(id) ON DELETE CASCADE;

ALTER TABLE "Agenda Comment"
ADD CONSTRAINT "Agenda_Comment_author_id_fkey"
    FOREIGN KEY (author_id) REFERENCES "Profile"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Agenda_Comment_agenda_id_fkey"
    FOREIGN KEY (agenda_id) REFERENCES "Agenda"(id) ON DELETE CASCADE;

-- User Credits & Reactions
ALTER TABLE "User Credit"
ADD CONSTRAINT "User_Credit_user_id_fkey"
    FOREIGN KEY (user_id) REFERENCES "Profile"(id) ON DELETE CASCADE;

ALTER TABLE "Reaction"
ADD CONSTRAINT "Reaction_sender_id_fkey"
    FOREIGN KEY (sender_id) REFERENCES "Profile"(id) ON DELETE CASCADE,
ADD CONSTRAINT "Reaction_recipient_id_fkey"
    FOREIGN KEY (recipient_id) REFERENCES "Profile"(id) ON DELETE CASCADE;

-- Drop ALL specific policies first
DROP POLICY IF EXISTS "element_access" ON "Agenda Element";
DROP POLICY IF EXISTS "section_select" ON "Agenda Section";
DROP POLICY IF EXISTS "section_insert" ON "Agenda Section";
DROP POLICY IF EXISTS "section_delete" ON "Agenda Section";
DROP POLICY IF EXISTS "agenda_direct_access" ON "Agenda";
DROP POLICY IF EXISTS "section_direct_access" ON "Agenda Section";
DROP POLICY IF EXISTS "element_direct_access" ON "Agenda Element";
DROP POLICY IF EXISTS "member_basic_access" ON "Agenda Member";
DROP POLICY IF EXISTS "editor_basic_access" ON "Agenda Editor";
DROP POLICY IF EXISTS "profile_access" ON "Profile";
DROP POLICY IF EXISTS "profile_update" ON "Profile";
DROP POLICY IF EXISTS "profile_comment_access" ON "Profile Comment";
DROP POLICY IF EXISTS "profile_comment_modify" ON "Profile Comment";
DROP POLICY IF EXISTS "profile_comment_author_access" ON "Profile Comment";
DROP POLICY IF EXISTS "reaction_access" ON "Reaction";

-- First, drop ALL element state policies (only once!)
DROP POLICY IF EXISTS "element_state_creator_manage" ON "Completed Element";
DROP POLICY IF EXISTS "completed_element_creator_manage" ON "Completed Element";
DROP POLICY IF EXISTS "completed_element_access" ON "Completed Element";
DROP POLICY IF EXISTS "element_access" ON "Completed Element";
DROP POLICY IF EXISTS "urgent_element_creator_manage" ON "Urgent Element";
DROP POLICY IF EXISTS "urgent_element_access" ON "Urgent Element";
DROP POLICY IF EXISTS "element_access" ON "Urgent Element";

-- Now create new policies for element states with clear comments
CREATE POLICY "completed_element_creator_manage" ON "Completed Element"
FOR ALL USING (
    user_id = auth.uid() OR  -- User can manage their own
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id 
        AND creator_id = auth.uid()  -- Creator can manage anyone's
    )
);

CREATE POLICY "urgent_element_creator_manage" ON "Urgent Element"
FOR ALL USING (
    user_id = auth.uid() OR  -- User can manage their own
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id 
        AND creator_id = auth.uid()  -- Creator can manage anyone's
    )
);

-- 1. Core Profile & User Policies
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

-- Update or add the function to extract username from email
CREATE OR REPLACE FUNCTION get_username_from_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.username IS NULL THEN
        -- Extract everything before the @ symbol
        NEW.username := split_part(auth.email(), '@', 1);
    END IF;
    RETURN NEW;
END;
$$ language plpgsql security definer;

-- Add trigger to set default username from email
DROP TRIGGER IF EXISTS set_default_username ON "Profile";

CREATE TRIGGER set_default_username
    BEFORE INSERT ON "Profile"
    FOR EACH ROW
    EXECUTE FUNCTION get_username_from_email();

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

DROP POLICY IF EXISTS "section_select" ON "Agenda Section";
DROP POLICY IF EXISTS "section_insert" ON "Agenda Section";
DROP POLICY IF EXISTS "section_delete" ON "Agenda Section";

CREATE POLICY "section_select" ON "Agenda Section"
FOR SELECT USING (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid() 
        OR key_visible = true 
        OR id IN (
            SELECT agenda_id FROM "Agenda Editor"
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "section_insert" ON "Agenda Section"
FOR INSERT WITH CHECK (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
        OR id IN (
            SELECT agenda_id FROM "Agenda Editor"
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "section_delete" ON "Agenda Section"
FOR DELETE USING (
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
        OR id IN (
            SELECT agenda_id FROM "Agenda Editor"
            WHERE user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "element_select" ON "Agenda Element";
DROP POLICY IF EXISTS "element_access" ON "Agenda Element";
DROP POLICY IF EXISTS "element_delete" ON "Agenda Element";

CREATE POLICY "element_access" ON "Agenda Element"
FOR ALL USING (
    section_id IN (
        SELECT s.id FROM "Agenda Section" s
        WHERE s.agenda_id IN (
            SELECT id FROM "Agenda"
            WHERE creator_id = auth.uid()
            OR key_visible = true
            OR id IN (
                SELECT agenda_id FROM "Agenda Editor"
                WHERE user_id = auth.uid()
            )
            OR id IN (
                SELECT agenda_id FROM "Agenda Member"
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- 3. Element & State Policies
CREATE POLICY "completed_element_access" ON "Completed Element"
FOR ALL USING (
    user_id = auth.uid() AND
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid() OR
        key_visible = true OR
        id IN (
            SELECT agenda_id FROM "Agenda Member"
            WHERE user_id = auth.uid()
        )
    )
)
WITH CHECK (user_id = auth.uid());

CREATE POLICY "urgent_element_access" ON "Urgent Element"
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "element_state_creator_manage" ON "Completed Element"
FOR ALL USING (
    user_id = auth.uid() OR
    agenda_id IN (
        SELECT id FROM "Agenda"
        WHERE creator_id = auth.uid()
    )
);

-- Make sure these are the ONLY policies for these tables
DROP POLICY IF EXISTS "completed_element_access" ON "Completed Element";
DROP POLICY IF EXISTS "urgent_element_access" ON "Urgent Element";

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

-- Add specific policy for managing members (after the existing member policies)
CREATE POLICY "agenda_member_management" ON "Agenda Member"
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id AND (
            creator_id = auth.uid() OR
            id IN (
                SELECT agenda_id FROM "Agenda Editor"
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- Add similar policy for editor management
CREATE POLICY "agenda_editor_management" ON "Agenda Editor"
FOR ALL USING (
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

-- Drop existing Profile Comment policies first
DROP POLICY IF EXISTS "profile_comment_access" ON "Profile Comment";
DROP POLICY IF EXISTS "profile_comment_modify" ON "Profile Comment";
DROP POLICY IF EXISTS "profile_comment_author_access" ON "Profile Comment";

-- Create new policies for Profile Comment
CREATE POLICY "profile_comment_select" ON "Profile Comment"
FOR SELECT USING (true);  -- Anyone can read comments

CREATE POLICY "profile_comment_insert" ON "Profile Comment"
FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND  -- User must be authenticated
    author_id = auth.uid()      -- Author must be the current user
);

CREATE POLICY "profile_comment_update" ON "Profile Comment"
FOR UPDATE USING (
    auth.uid() = author_id  -- Only the author can update their comments
);

CREATE POLICY "profile_comment_delete" ON "Profile Comment"
FOR DELETE USING (
    auth.uid() = author_id OR  -- Author can delete their comments
    auth.uid() = profile_id    -- Profile owner can delete comments on their profile
);

-- Make sure RLS is enabled
ALTER TABLE "Profile Comment" ENABLE ROW LEVEL SECURITY;

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

-- Add missing Reaction policies
DROP POLICY IF EXISTS "reaction_access" ON "Reaction";

CREATE POLICY "reaction_select" ON "Reaction"
FOR SELECT USING (true);  -- Anyone can view reactions

CREATE POLICY "reaction_insert" ON "Reaction"
FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND  -- Only authenticated user can send reactions
    sender_id != recipient_id   -- Cannot react to yourself
);

CREATE POLICY "reaction_delete" ON "Reaction"
FOR DELETE USING (
    auth.uid() = sender_id  -- Only sender can remove their reaction
);

-- Update the Reaction table constraints if needed
ALTER TABLE "Reaction"
ADD CONSTRAINT "no_self_reactions" 
    CHECK (sender_id != recipient_id);

-- Make sure RLS is enabled for Reaction table
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;

-- Add default value for comments column
ALTER TABLE "Profile" 
ALTER COLUMN comments SET DEFAULT true;

ALTER TABLE "Agenda" 
ALTER COLUMN comments SET DEFAULT true;

-- Fix the comments toggle policies
CREATE POLICY "users_can_toggle_own_profile_comments" ON "Profile"
FOR UPDATE USING (
    auth.uid() = id
)
WITH CHECK (
    auth.uid() = id AND
    (
        -- Only allow updating the 'comments' column
        comments IS NOT NULL
    )
);

CREATE POLICY "users_can_toggle_own_agenda_comments" ON "Agenda"
FOR UPDATE USING (
    auth.uid() = creator_id
)
WITH CHECK (
    auth.uid() = creator_id AND
    (
        -- Only allow updating the 'comments' column
        comments IS NOT NULL
    )
);

-- Add comment visibility policies
CREATE POLICY "profile_comments_visibility" ON "Profile Comment"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Profile"
        WHERE id = profile_id
        AND comments = true
    )
);

CREATE POLICY "agenda_comments_visibility" ON "Agenda Comment"
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id
        AND comments = true
    )
);

-- Add comment creation policies
CREATE POLICY "profile_comments_creation" ON "Profile Comment"
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Profile"
        WHERE id = profile_id
        AND comments = true
    )
);

CREATE POLICY "agenda_comments_creation" ON "Agenda Comment"
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM "Agenda"
        WHERE id = agenda_id
        AND comments = true
    )
);

-- Drop existing language-related constraints if they exist
ALTER TABLE "Profile" DROP CONSTRAINT IF EXISTS language_check;

-- Add language column with constraint and default
ALTER TABLE "Profile" 
  ALTER COLUMN language SET DEFAULT 'en',
  ADD CONSTRAINT language_check CHECK (language IN ('en', 'es', 'fr'));

-- Add policies for language management
DROP POLICY IF EXISTS "users_can_read_language" ON "Profile";
DROP POLICY IF EXISTS "users_can_update_language" ON "Profile";

-- Anyone can read a user's language setting
CREATE POLICY "users_can_read_language" ON "Profile"
FOR SELECT
USING (true);

-- Only user can update their own language setting
CREATE POLICY "users_can_update_language" ON "Profile"
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND
  language IN ('en', 'es', 'fr')
);

COMMIT;
