ALTER TABLE public."Agenda Member"
DROP CONSTRAINT "Agenda Member_user_id_fkey";
alter table "public"."Agenda Member" 
add constraint "Agenda Member_user_id_fkey" 
foreign key ("user_id") 
references "public"."Profile"("id") 
on delete cascade;