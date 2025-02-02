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