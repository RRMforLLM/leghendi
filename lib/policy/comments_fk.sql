-- Drop the existing foreign key constraint
ALTER TABLE public."Agenda Comment"
DROP CONSTRAINT "Agenda Comment_author_id_fkey";

-- Add new foreign key constraint for Agenda Comment table
ALTER TABLE "public"."Agenda Comment"
ADD CONSTRAINT "Agenda Comment_author_id_fkey"
FOREIGN KEY (author_id) REFERENCES "public"."Profile"(id)
ON DELETE CASCADE;
