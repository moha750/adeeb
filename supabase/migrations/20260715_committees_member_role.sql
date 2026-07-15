-- committees.member_role_name — الوحدة تُصرّح بدور عضويّتها، كما صرّحت بدور قيادتها.
--
-- ═══ لماذا ═══
--
-- بعد توزيع المشرفين، صار committee_id لعضو الإدارة يشير إلى اللجنة التي
-- **يشرف عليها** لا إلى إدارته — وهو الصواب، لأنّ assign_position تفرض
-- «مشرف واحد لكلّ لجنة»، وهذا لا معنى له إلّا للإشراف.
--
-- لكنّ الأثر: لم يعد أحد يشير إلى الإدارة نفسها. مقيس على الإنتاج:
--   إدارة الموارد -> صفّ واحد يشير إليها (قائدتها)، وأعضاؤها الحقيقيّون ٣.
--   إدارة الضمان  -> صفّ واحد، وعضوها الحقيقيّ ١.
-- فالإدارتان تظهران فارغتين إلّا من قائدتيهما.
--
-- ═══ الحقيقة التي يجب أن تُكتب ═══
--
-- انتماء عضو الإدارة تقوله **صفة الدور** (hr_admin_member = من إدارة
-- الموارد)، لا committee_id. فبدل أن يستنتج V2 ذلك، تُصرّح الوحدة به:
--   22 -> hr_admin_member | 23 -> qa_admin_member | اللجان -> committee_member
--
-- وبهذا يكتمل النمط: كلّ وحدة تُصرّح بدور قيادتها ودور عضويّتها.
--   councils.head_role_name · committees.leader_role_name · committees.member_role_name

alter table committees
  add column if not exists member_role_name text;

update committees set member_role_name = 'hr_admin_member'
 where id = 22 and member_role_name is distinct from 'hr_admin_member';

update committees set member_role_name = 'qa_admin_member'
 where id = 23 and member_role_name is distinct from 'qa_admin_member';

update committees set member_role_name = 'committee_member'
 where council_id = 'executive' and member_role_name is distinct from 'committee_member';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'committees_member_role_name_fkey') then
    alter table committees
      add constraint committees_member_role_name_fkey
      foreign key (member_role_name) references roles (role_name);
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='committees'
               and column_name='member_role_name' and is_nullable='YES')
     and not exists (select 1 from committees where member_role_name is null) then
    alter table committees alter column member_role_name set not null;
  end if;
end $$;

comment on column committees.member_role_name is
  'الدور الذي يمثّل عضويّة هذه الوحدة. إدارة -> hr/qa_admin_member (وأعضاؤها يشرفون على لجان أخرى، فلا يشيرون إليها بـ committee_id — انتماؤهم يقوله الدور). لجنة تشغيليّة -> committee_member (وأعضاؤها يشيرون إليها).';
