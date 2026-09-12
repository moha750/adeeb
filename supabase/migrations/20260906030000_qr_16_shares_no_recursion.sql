-- دورةُ سياساتٍ لا تنتهي: الشركاءُ يسألون الباركود والباركودُ يسأل الشركاء (م١٣)
--
-- ## العطب، مقيسًا
-- سياساتُ `qr_links` تسأل `qr_link_shares` («أشريكٌ أنت؟»)، وسياساتُ `qr_link_shares` تسأل
-- `qr_links` («أمالكٌ أنت؟»). فكلُّ استعلامٍ يوقظ الأخرى، وتردّ القاعدةُ:
-- `infinite recursion detected in policy` — أُمسك بالتجربة قبل النشر ٢٠٢٦-٠٩-٠٦.
--
-- ## العلاج: سؤالٌ واحدٌ يُجاب خارج السياسات
-- دالّةٌ `security definer` تقرأ جدولَ الشركاء **بلا تفعيل سياساته**، فتُقطَع الدورة من طرفٍ
-- واحد: سياساتُ `qr_links` تناديها، وسياساتُ الشركاء تبقى تسأل `qr_links` كما هي.
--
-- وما تكشفه: إذنُ **صاحب الجلسة نفسِه** في باركودٍ بعينه. لا أسماءَ ولا قائمةَ شركاء.

begin;

create or replace function public.qr_share_access(p_link uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.access
  from public.qr_link_shares s
  where s.link_id = p_link and s.user_id = auth.uid()
  limit 1;
$$;

comment on function public.qr_share_access(uuid) is
  'إذنُ صاحب الجلسة في باركودٍ بعينه (read/edit) أو NULL. تُنادى من سياسات qr_links لقطع دورة التعاود.';

revoke all on function public.qr_share_access(uuid) from public, anon;
grant execute on function public.qr_share_access(uuid) to authenticated;

-- ═══ سياساتُ المشاركة تُعاد على الدالّة ═══════════════════════════════════════
drop policy if exists qr_links_shared_read on public.qr_links;
create policy qr_links_shared_read on public.qr_links
  for select to authenticated
  using (
    public.qr_share_access(id) is not null
    and public.check_user_permission(auth.uid(), 'use_qr_generator')
  );

drop policy if exists qr_links_shared_edit on public.qr_links;
create policy qr_links_shared_edit on public.qr_links
  for update to authenticated
  using (
    public.qr_share_access(id) = 'edit'
    and public.check_user_permission(auth.uid(), 'use_qr_generator')
  )
  with check (
    public.qr_share_access(id) = 'edit'
    and public.check_user_permission(auth.uid(), 'use_qr_generator')
  );

drop policy if exists qr_scans_shared_read on public.qr_scans;
create policy qr_scans_shared_read on public.qr_scans
  for select to authenticated
  using (
    public.qr_share_access(link_id) is not null
    and public.check_user_permission(auth.uid(), 'use_qr_generator')
  );

drop policy if exists qr_schedules_shared_read on public.qr_schedules;
create policy qr_schedules_shared_read on public.qr_schedules
  for select to authenticated
  using (
    public.qr_share_access(link_id) is not null
    and public.check_user_permission(auth.uid(), 'use_qr_generator')
  );

drop policy if exists qr_schedules_shared_write on public.qr_schedules;
create policy qr_schedules_shared_write on public.qr_schedules
  for all to authenticated
  using (public.qr_share_access(link_id) = 'edit')
  with check (public.qr_share_access(link_id) = 'edit');

commit;
