-- من يصلح مالكًا لباركود: حاملُ قدرة المولّد (لغرفة الإشراف)
--
-- ولمَ دالّة: الأسماءُ تُقرأ من `profiles` والقدرةُ تُحسَب لكلّ صفّ، وذلك استعلامٌ لا تُحسنه
-- الشاشة (سياسةُ القراءة تسمح، لكنّ حساب القدرة لكلّ عضوٍ من الشاشة نداءٌ لكلّ اسم).
-- وترجع الاسمَ والمعرّفَ فقط: لا بريدَ ولا جوّال.
begin;

create or replace function public.qr_owner_candidates()
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name
  from public.profiles p
  where public.check_user_permission(auth.uid(), 'oversee_qr')
    and public.check_user_permission(p.id, 'use_qr_generator')
  order by p.full_name;
$$;

comment on function public.qr_owner_candidates() is
  'أسماءُ من يصلح مالكًا لباركود (حاملو use_qr_generator). لا تردّ شيئًا لمن لا يملك oversee_qr.';

revoke all on function public.qr_owner_candidates() from public, anon;
grant execute on function public.qr_owner_candidates() to authenticated;

commit;
