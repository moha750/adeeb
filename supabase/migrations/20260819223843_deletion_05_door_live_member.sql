-- **توحيدُ تعريف «العضو الحيّ» بين البابِ وحارسِه** — عطبٌ أمسكه الفحصُ بعد التطبيق.
--
-- نزل ترحيلُ ٠٤ وفيه تعريفان لشيءٍ واحد: بابُ الخروج يعدّ العضوَ حيًّا إن كان
-- `account_status is distinct from 'suspended'`، وحارسُ «لا عضويّةَ بلا مقعد» يعدّه حيًّا إن
-- كان `account_status = 'active'`. وبينهما `inactive`: حسابٌ مجمَّد يقع في البابِ ولا يقع في
-- الحارس. فيُري صاحبَه بابَ «أنهِ عضويّتَك» وهو لا يخالف حكمًا أصلًا.
--
-- والقاعدةُ عندنا أنّ **تعريفَ الحال يُكتب مرّةً**، فوُحّد على تعريف الحارس: **الحيُّ من له
-- تاريخُ انضمامٍ وحسابُه `active`**. وأثرُه في القاعدة اليومَ صفٌّ واحد (مقعدُ المعاينة
-- المؤقّت) ينتقل من `end_now` إلى `delete`، وهو الصواب: حسابٌ مجمَّدٌ لا عضويّةَ تُنهى فيه.

create or replace function public.membership_exit_door(p_user uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('club_president', 'executive_council_president', 'president_advisor'))
      then 'vacate_seat'
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name <> 'committee_member')
      then 'request'
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active)
      or exists (select 1 from profiles p where p.id = p_user
                   and p.joined_date is not null and p.account_status = 'active')
      then 'end_now'
    else 'delete'
  end;
$$;
