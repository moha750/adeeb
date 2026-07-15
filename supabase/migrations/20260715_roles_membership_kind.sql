-- فكّ الخلط في roles.council_type — «عضو في المجلس» ≠ «تابع لفرعه».
--
-- ═══ المشكلة ═══
--
-- سؤال: من أعضاء المجلس التنفيذيّ؟
--   بحسب هيكلة النادي: المنسّقون + القادة + النوّاب = ٨ أشخاص.
--   بحسب القاعدة (council_type='executive') = ١٥١ شخصًا،
--   لأن «عضو لجنة» (143 شخصًا) يحمل القيمة نفسها التي يحملها «قائد لجنة».
--
-- فالعمود يجيب سؤالين في آنٍ واحد ولا يفرّق بينهما:
--   «أيّ مجلس؟»  و  «ما علاقتك به: تجلس فيه أم تقع تحته؟»
--
-- ونفس الخلط في الجهة الإداريّة: hr_admin_member مكتوب administrative
-- تمامًا كقائدة الإدارة — والقائدة عضو في المجلس، والعضو الإداريّ في
-- الإدارة التي تحته.
--
-- ═══ الحلّ: عمود ثانٍ يحمل السؤال الثاني ═══
--
--   council_type    -> أيّ مجلس؟   (administrative | executive)
--   membership_kind -> ما العلاقة؟ (member = يجلس فيه | subordinate = يقع تحته)
--
-- ═══ وتقاعُد 'both' ═══
--
-- كانت 'both' تعني «يرأس مجلسًا وينتمي لآخر» — وهو معنًى مضغوط في القيمة.
-- وقد فصلنا الرئاسة إلى councils.head_role_name، فلم يبقَ لها ما تقوله:
--   club_president              -> يرأس الإداريّ (head_role_name) وعضو فيه.
--                                  سلطته على الجميع من role_level=10 لا من عضويّة.
--                                  وهو ليس عضوًا في التنفيذيّ (قرار المالك 2026-07-15).
--   executive_council_president -> عضو في الإداريّ، ويرأس التنفيذيّ (head_role_name).
-- فكلاهما administrative، وتسقط 'both'.
--
-- أثر معلوم على الموقع القديم: dashboard.js وpositions-manager.js يرشّحان
-- بـ ['executive','both'] في أربعة مواضع، فلن يظهر الرئيسان في قائمة
-- «المجلس التنفيذيّ» بعد اليوم. تغيّر عرضٍ لا انقطاع خدمة — والعرض الجديد
-- أصدق: المجلس التنفيذيّ يضمّ المنسّقين والقادة والنوّاب، ورئيسه يُقرأ
-- من councils.head_role_name.

-- ── 1) العمود الجديد ──
alter table roles
  add column if not exists membership_kind text;

update roles set membership_kind = 'member'
 where role_name in (
   'club_president',              -- يرأس الإداريّ وعضو فيه
   'executive_council_president', -- عضو في الإداريّ، يرأس التنفيذيّ
   'president_advisor',
   'hr_committee_leader',
   'qa_committee_leader',
   'department_head',
   'committee_leader',
   'deputy_committee_leader'
 ) and membership_kind is distinct from 'member';

update roles set membership_kind = 'subordinate'
 where role_name in (
   'hr_admin_member',    -- في إدارة الموارد، تحت المجلس الإداريّ
   'qa_admin_member',    -- في إدارة الضمان، تحت المجلس الإداريّ
   'committee_member',   -- في لجنة، تحت قسم، تحت المجلس التنفيذيّ
   'activity_coordinator'
 ) and membership_kind is distinct from 'subordinate';

-- ── 2) تقاعُد 'both' ──
update roles set council_type = 'administrative'
 where role_name in ('club_president', 'executive_council_president')
   and council_type = 'both';

-- ── 3) القيود ──
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'roles_membership_kind_check') then
    alter table roles
      add constraint roles_membership_kind_check
      check (membership_kind in ('member', 'subordinate'));
  end if;

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='roles'
               and column_name='membership_kind' and is_nullable='YES')
     and not exists (select 1 from roles where membership_kind is null) then
    alter table roles alter column membership_kind set not null;
  end if;

  -- تضييق council_type بعد إفراغ 'both'
  if not exists (select 1 from roles where council_type = 'both') then
    alter table roles drop constraint if exists roles_council_type_check;
    alter table roles
      add constraint roles_council_type_check
      check (council_type in ('administrative', 'executive'));
  end if;
end $$;

comment on column roles.membership_kind is
  'العلاقة بالمجلس: member = عضو يجلس فيه ويقرّر. subordinate = يقع تحت فرعه ولا يجلس فيه. يُقرأ مع council_type — الأوّل يقول أيّ مجلس، والثاني يقول ما العلاقة.';
comment on column roles.council_type is
  'المجلس الذي ينتمي إليه الدور. الرئاسة ليست هنا — انظر councils.head_role_name.';
