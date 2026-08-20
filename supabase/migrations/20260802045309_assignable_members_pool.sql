-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802045309   الاسم: assignable_members_pool

-- بِركةُ الإسناد بحكم القاعدة — لا بحكمٍ مستنسخ.
--
-- الواجهة كانت تعرض للجميع كلَّ نشِطٍ، فيرى قائدُ الإدارة رئيسَ المجلس التنفيذيّ وقادةَ
-- اللجان خياراتٍ تُردّ بعد الاختيار. والردّ لا يكفي: الظهور نفسه خطأ.
--
-- ولا يُصلَح باستنساخ `can_assign_role` في العميل — حَكَمان يفترقان. يُصلَح بأن تُسأل
-- القاعدة: من يستطيع هذا المُنفّذ أن يُسنِد إليه؟ أي: من لا منصب له (لا أحدَ يُنتزع منه)،
-- ومن يشغل منصبًا تبلغه سلطةُ المُنفّذ (فله أن ينقله). ورئيس النادي محجوبٌ كما في
-- `assign_position` و`revoke_position`.
--
-- الشرط هنا هو **طرف النزع** وحده. أمّا طرفُ الإجلاس — أيّ مقعدٍ يملأ المُنفّذ — فيحرسه
-- `assign_position` عند الإسناد، وتقوله شاشتُه بما تعرض من مقاعد.
create or replace function public.assignable_members(p_actor uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.id
  from profiles p
  left join lateral (
    select ur.role_name, ur.committee_id
    from user_roles ur
    where ur.user_id = p.id and ur.is_active
    limit 1                                   -- صفٌّ واحدٌ بحكم ثابت «منصبٌ واحدٌ لكلّ شخص»
  ) h on true
  where (check_user_permission(p_actor, 'manage_positions')
         or check_user_permission(p_actor, 'assign_unit_members'))
    and p.account_status = 'active'
    and (h.role_name is null
         or (h.role_name <> 'club_president'
             and can_assign_role(p_actor, h.role_name, h.committee_id)));
$function$;

comment on function public.assignable_members(uuid) is
  'من يجوز لهذا المُنفّذ أن يُسنِد إليه: بلا منصب، أو بمنصبٍ تبلغه سلطتُه (can_assign_role). بِركةُ منتقي الإسناد — فلا يُعرَض من يُردّ.';
