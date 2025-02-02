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
