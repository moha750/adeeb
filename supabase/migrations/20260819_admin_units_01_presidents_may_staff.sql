-- ============================================================================
-- تعيينُ الأعضاء الإداريّين — بيدِ الرئيسَين أيضًا
--
-- العِلّة (طلبُ المالك، 2026-08-19): «نريد ميزةً للرئيس التنفيذيّ ولرئيس أدِيب بحيث
-- يعيّنون الأعضاء الإداريّين» — ليُدارَ الأمرُ ولو غاب قائدُ الإدارة.
--
-- والحالُ قبل هذا الترحيل أنّ **السلطةَ قائمةٌ والغرفةَ غائبة**: `position_authority` يُعطي
-- رئيسَ النادي كلَّ منصبٍ في كلّ وحدة، ويُعطي رئيسَ التنفيذيّ كلَّها إلّا رئاسةَ النادي —
-- فكلاهما مأذونٌ في القاعدة أن يُسنِد `hr_admin_member` و`qa_admin_member`. وكذلك توزيعُ
-- الإشراف (`committee_supervision`) تُكتَب بـ`manage_positions` وكلاهما يحملها. فلم يكن
-- يمنعُهما إلّا قفلُ الغرفة في التطبيق: `assign_unit_members`.
--
-- فهذا الترحيل بابٌ لا سلطة: يمنحهما المفتاحَ الذي تقفُ خلفه سلطتُهما القائمة.
-- ============================================================================

begin;

-- ١) المفتاح — قفلُ غرفة «إدارتي» (`/dashboard/unit`) للرئيسَين.
--
-- ولا يُوسّع هذا مداهما شيئًا: كلُّ فعلٍ داخل الغرفة يمرّ على `can_assign_role`
-- (وهي تقرأ `position_authority`) أو على `manage_positions` — وكلاهما يقول اليوم نعم.
insert into role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president')) as r(role_name)
cross join permissions p
where p.permission_key = 'assign_unit_members'
on conflict do nothing;

-- ٢) الإداراتُ التي يبلُغها المرء — **مصدرٌ واحد**: `can_assign_role` نفسُها.
--
-- الغرفةُ كانت تعرف إدارةً واحدةً هي التي يقودها الداخل (صفٌّ حيٌّ بـ`leader_role_name`).
-- وذلك يصحّ لقائدٍ ولا يصحّ لرئيس: الرئيسُ لا يقود إدارةً وسلطتُه تبلغ الإدارتين. فبدل أن
-- يُحفَر اسمُ «رئيس» في الكود شرطًا ثانيًا، تُشتقّ القائمةُ من الجدول الذي **يحكم الكتابة**
-- نفسِه — فما تعرضه الشاشة هو ما تسمح به القاعدة، لا أوسعَ ولا أضيق:
--
--   قائدةُ الموارد  ← إدارةُ الموارد وحدها  (`own_unit_roles` تشترط أن تكون هي قائدتَها)
--   قائدةُ الضمان   ← إدارةُ الضمان وحدها   (كذلك)
--   رئيسُ النادي     ← الإدارتان            (`own_unit_roles` فارغ، فلا شرطَ وحدة)
--   رئيسُ التنفيذيّ  ← الإدارتان            (كذلك)
--   قائدُ لجنةٍ تنفيذيّة ← لا شيء            (لا مفتاحَ له أصلًا منذ 20260801)
--
-- وحاملو المفتاح اليوم اثنان لا غير: قائدا الإدارتين. فإن مُنح لثالثٍ لا سلطةَ له، ردّته
-- الدالّةُ بلا شيء وقالت الشاشةُ «لا إدارة تبلغها» — لا زرٌّ معلَّقٌ خلف قفلٍ مفتوح.
create or replace function public.admin_units_i_may_staff(p_actor uuid)
returns setof integer
language sql
stable
security definer
set search_path to 'public'
as $function$
  select c.id
  from committees c
  where c.is_active
    and c.council_id = 'administrative'
    and c.member_role_name is not null
    and can_assign_role(p_actor, c.member_role_name, c.id)
  order by c.id;
$function$;

comment on function public.admin_units_i_may_staff(uuid) is
  'الإداراتُ الإداريّة التي يجوز لهذا الفاعل أن يُعيّن أعضاءها — مشتقّةٌ من can_assign_role وحدها.';

revoke all on function public.admin_units_i_may_staff(uuid) from public, anon;
grant execute on function public.admin_units_i_may_staff(uuid) to authenticated, service_role;

commit;
