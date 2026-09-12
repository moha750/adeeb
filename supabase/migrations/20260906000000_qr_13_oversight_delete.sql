-- الإشرافُ يحذف كما يوقف، ويقرأ صفحةَ أيّ باركود (م١٠)
--
-- ## العلّة، بكلمة المالك
-- «أضِف للإيقاف حذفًا وتحكّمًا كاملًا» — غرفةُ الإشراف بُنيت رؤيةً وإيقافًا، والحذفُ لم
-- يكن فيها. وباركودٌ صُنع تصيّدًا لا يكفيه الإيقاف: يُزال.
--
-- ## وبابٌ واحدٌ ضيّقٌ لكلّ فعل
-- لا تُفتَح سياسةُ حذفٍ على صفوف الناس (من ملك حذفَ صفٍّ ملك محوَ أثرِ ملصقٍ ليس له بلا
-- قيد). فالحذفُ دالّةٌ تفحص `oversee_qr` وتحذف صفًّا بعينه، وتُقيّد الواقعةَ باسم فاعلها
-- عبر محفّز السجلّ نفسِه (`security definer` تبدّل الامتيازَ ولا تبدّل `auth.uid()`).
--
-- **والمسحاتُ تذهب معه** كما في حذف صاحبه سواءً: الصفُّ الأب يُحذف فتتبعه مسحاتُه
-- (`on delete cascade`)، وتبقى واقعةُ الحذف في السجلّ شاهدةً بلا مفتاحِ إسناد.

begin;

create or replace function public.qr_admin_delete(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hit integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not public.check_user_permission(auth.uid(), 'oversee_qr') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from public.qr_links where id = p_id;
  get diagnostics v_hit = row_count;
  return v_hit > 0;
end;
$$;

comment on function public.qr_admin_delete(uuid) is
  'حذفُ باركودٍ من غرفة الإشراف. تفحص قدرةَ oversee_qr، والمحفّزُ يقيّد الواقعةَ باسم الفاعل.';

revoke all on function public.qr_admin_delete(uuid) from public, anon;
grant execute on function public.qr_admin_delete(uuid) to authenticated;

commit;
