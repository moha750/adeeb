-- نقلُ ملكيّة الباركود: أصولُ نادٍ لا أصولُ أفراد (م٥)
--
-- ## العلّة
-- الباركودُ مربوطٌ بحسابِ صاحبه (`owner_id … on delete cascade`). فمن غادر النادي وحُذف
-- حسابُه ذهبت باركوداتُه ومسحاتُها معه، **وماتت ملصقاتٌ مطبوعةٌ في الشارع** لا ذنبَ لها.
-- ومن سلّم مهمّتَه لغيره يبقى الملصقُ باسمه، فلا يملك الخلَفُ تبديلَ وجهته.
--
-- ## والنقلُ فعلُ إشراف
-- المالكُ الحاليُّ **لا ينقل بيده**: العمودُ `owner_id` ممنوعٌ من التحديث في امتياز
-- `authenticated` (ترحيل م١)، لأنّ من ملك تبديلَ المالك ملك إهداءَ صفٍّ لغيره أو انتحالَه.
-- فالنقلُ بدالّةٍ تفحص قدرةَ `oversee_qr`، والمحفّزُ يقيّده في السجلّ باسم فاعله.
--
-- ## والوجهةُ الجديدةُ عضوٌ قائم
-- يُشترَط أن يكون للمنقول إليه صفٌّ في `profiles` وأن يملك قدرةَ المولّد
-- (`use_qr_generator`) — وإلّا نُقل الصفُّ إلى من لا يرى غرفتَه، فيصير الباركودُ يتيمًا:
-- سياسةُ own-row تعطيه إيّاه، والقفلُ يمنعه من فتح الباب.

begin;

-- نوعُ الواقعة يتّسع للنقل، فالسجلُّ يقول «نُقلت الملكيّة» كما يقول «بُدّلت الوجهة».
alter table public.qr_link_events drop constraint if exists qr_link_events_kind_check;
alter table public.qr_link_events add constraint qr_link_events_kind_check
  check (kind in ('target', 'title', 'active', 'spec', 'delete', 'owner'));

create or replace function public.qr_transfer_owner(p_id uuid, p_to uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if not public.check_user_permission(auth.uid(), 'oversee_qr') then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if not exists (select 1 from public.profiles where id = p_to) then
    raise exception 'NO_SUCH_PROFILE';
  end if;
  if not public.check_user_permission(p_to, 'use_qr_generator') then
    raise exception 'TARGET_LACKS_CAPABILITY';
  end if;

  select owner_id into v_old from public.qr_links where id = p_id;
  if v_old is null then
    return false;
  end if;
  if v_old = p_to then
    return true;  -- هو مالكُه أصلًا: لا واقعةَ تُقيَّد لفعلٍ لم يقع
  end if;

  update public.qr_links set owner_id = p_to, updated_at = now() where id = p_id;

  -- المحفّزُ العامُّ لا يرى تبدّلَ المالك (يقيّد الوجهةَ والاسمَ والحالَ والوصفة)، فتُكتَب
  -- الواقعةُ هنا صراحةً بالقيمتين: من كان ومن صار.
  insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
  values (p_id, auth.uid(), 'owner', v_old::text, p_to::text);

  return true;
end;
$$;

comment on function public.qr_transfer_owner(uuid, uuid) is
  'نقلُ ملكيّة باركود إلى عضوٍ يملك قدرةَ المولّد. تفحص قدرةَ oversee_qr وتقيّد الواقعةَ في qr_link_events.';

revoke all on function public.qr_transfer_owner(uuid, uuid) from public, anon;
grant execute on function public.qr_transfer_owner(uuid, uuid) to authenticated;

commit;
