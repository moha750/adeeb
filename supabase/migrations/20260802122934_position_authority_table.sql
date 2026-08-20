-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802122934   الاسم: position_authority_table

-- سلطة الإسناد تُقال في جدولٍ يُقرأ، لا في منطقٍ يُكتَب داخل دالّة.
--
-- كانت `can_assign_role` تحكم بنفسها: قدرةٌ في `role_permissions` + قيادةُ وحدةٍ تُصرّح
-- بعضوها. فلم يكن في النظام موضعٌ واحدٌ يُسأل: «ما حدود هذا الدور؟» — نصفُ الجواب كودٌ
-- ونصفُه صفوف. وصار الجدولُ هو الجواب: صفٌّ واحدٌ لكلّ دور يقول ثلاثة أشياء لا رابع لها.
--
-- والقانون بكلمات المالك (2026-08-02):
--   · رئيس النادي يُسنِد ويعزل كلّ منصب.
--   · الرئيس التنفيذيّ مثله، إلّا رئيسَ النادي — لا تطوله يدُه.
--   · قائد الموارد يُسنِد منسّقي الأقسام وقادة اللجان ونوّابهم في كلّ النادي، والعضو
--     الإداريّ في إدارته. ويعزل أيًّا منهم.
--   · قائد الضمان يُسنِد العضو الإداريّ في إدارته.
--   · والعضو الإداريّ لا يُسنَد إلّا لمن هو عضو لجنةٍ الآن — انتقالٌ لا ضمٌّ من خارج.
--
-- والسحب تابعٌ للإجلاس: من بلغ المقعدَ الجديد أخذ شاغلَه من حيث كان، ولا يُسأل عن سلطته
-- على مقعده القديم. وما يُمنع منه يُسمّى صراحةً في `blocked_roles`.
create table if not exists public.position_authority (
  role_name      text primary key references public.roles(role_name) on update cascade on delete cascade,
  target_roles   text[] not null default '{}',   -- المقاعد التي يُجلس فيها
  own_unit_roles text[] not null default '{}',   -- منها ما لا يُسنَد إلّا في وحدته التي يقودها
  blocked_roles  text[] not null default '{}',   -- شاغلو هذه المقاعد لا يُسحبون بيده
  note           text
);

comment on table public.position_authority is
  'سلطةُ الإسناد والعزل — صفٌّ لكلّ دور: أيّ المقاعد يملؤها، أيّها في وحدته وحدها، ومن لا تطوله يدُه. المصدرُ الوحيد الذي تقرؤه can_assign_role.';

alter table public.position_authority enable row level security;
drop policy if exists position_authority_read on public.position_authority;
create policy position_authority_read on public.position_authority for select using (true);

-- شرطُ المقعد: منصبٌ سابقٌ يجب أن يشغله المرشّح. العضو الإداريّ لا يُسنَد إلّا لعضو لجنة.
alter table public.roles add column if not exists prerequisite_role_name text
  references public.roles(role_name) on update cascade;
comment on column public.roles.prerequisite_role_name is
  'المنصب الذي يجب أن يشغله المرشّح قبل هذا المقعد (العضو الإداريّ ← عضو لجنة). فارغ = لا شرط.';

update public.roles set prerequisite_role_name = 'committee_member'
where role_name in ('hr_admin_member', 'qa_admin_member');

-- البذر: القانون أعلاه حرفيًّا. من لا صفَّ له فلا سلطةَ له.
insert into public.position_authority (role_name, target_roles, own_unit_roles, blocked_roles, note) values
  ('club_president',
   array['club_president','president_advisor','executive_council_president','hr_committee_leader',
         'qa_committee_leader','department_head','hr_admin_member','qa_admin_member',
         'committee_leader','deputy_committee_leader','committee_member'],
   '{}', '{}',
   'رئيس النادي — كلّ منصبٍ في كلّ وحدة.'),
  ('executive_council_president',
   array['president_advisor','executive_council_president','hr_committee_leader',
         'qa_committee_leader','department_head','hr_admin_member','qa_admin_member',
         'committee_leader','deputy_committee_leader','committee_member'],
   '{}', array['club_president'],
   'رئيس المجلس التنفيذيّ — كلّ منصبٍ إلّا رئاسة النادي، ولا تطول يدُه رئيسَ النادي.'),
  ('hr_committee_leader',
   array['department_head','committee_leader','deputy_committee_leader','hr_admin_member'],
   array['hr_admin_member'],
   array['club_president','executive_council_president','president_advisor','qa_committee_leader'],
   'قائد إدارة الموارد — المنسّقون والقادة والنوّاب في كلّ النادي، والعضو الإداريّ في إدارته.'),
  ('qa_committee_leader',
   array['qa_admin_member'],
   array['qa_admin_member'],
   array['club_president','executive_council_president','president_advisor','hr_committee_leader'],
   'قائد إدارة الضمان — العضو الإداريّ في إدارته وحده.')
on conflict (role_name) do update
  set target_roles   = excluded.target_roles,
      own_unit_roles = excluded.own_unit_roles,
      blocked_roles  = excluded.blocked_roles,
      note           = excluded.note;
