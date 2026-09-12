-- شركاءُ الباركود: عملٌ يشترك فيه اثنان (م١٢)
--
-- ## العلّة
-- الباركودُ اليوم **مِلكُ واحدٍ لا يشاركه أحد**: إمّا أن تملكه وحدك، أو تنقله كلَّه لغيرك،
-- أو يراه المشرفُ بحكم إشرافه. ولا شيء بينهما لعملٍ يشترك فيه اثنان: قائدٌ يصنع الملصق،
-- وعضوٌ يبدّل وجهتَه ليلة الفعاليّة، وثالثٌ يقرأ أرقامَه في الصباح.
--
-- ## والتصميم: إذنان لا واحد
-- · **`read`** يرى الصفَّ وإحصاءَه ولا يكتب.
-- · **`edit`** يبدّل الاسمَ والوجهةَ والتصميمَ والحالَ والجدولَ — بحدود الأعمدة نفسِها التي
--   يملكها المالك (م١): الرمزُ والمالكُ والعدّادُ تبقى ممنوعةً على الجميع.
--
-- ## وثلاثةٌ تبقى للمالك وحدَه
-- الحذفُ، ونقلُ الملكيّة، و**المشاركةُ نفسُها** — فلا يشارك شريكٌ شريكًا، ولا يتوسّع الدائرةُ
-- بلا علم صاحبها. (والإشرافُ فوق ذلك كلِّه بقدرته، وسجلُّ الوقائع يقيّد كلَّ تغييرٍ باسم
-- فاعله لا باسم المالك — فمن بدّل الوجهةَ معروفٌ ولو كان شريكًا.)
--
-- ## وشرطُ الشريك
-- يملك قدرةَ المولّد (`use_qr_generator`)، وإلّا ملَك بابًا لا يراه: سياسةُ القراءة تعطيه
-- الصفَّ، وقفلُ الغرفة يمنعه من فتحها.

begin;

create table if not exists public.qr_link_shares (
  link_id    uuid not null references public.qr_links(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  access     text not null default 'read' check (access in ('read', 'edit')),
  granted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (link_id, user_id)
);

create index if not exists qr_link_shares_user_idx on public.qr_link_shares (user_id);

comment on table public.qr_link_shares is
  'شركاءُ الباركود: قراءةٌ أو تحرير. المشاركةُ والحذفُ والنقلُ تبقى للمالك وحدَه.';

alter table public.qr_link_shares enable row level security;

-- **الجدولُ يُقرأ من طرفيه**: المالكُ يرى شركاءَ باركوده، والشريكُ يرى صفَّه هو (ليعرف بمَ
-- شورك)، والمشرفُ يرى الكلّ.
drop policy if exists qr_shares_read on public.qr_link_shares;
create policy qr_shares_read on public.qr_link_shares
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.check_user_permission(auth.uid(), 'oversee_qr')
    or exists (select 1 from public.qr_links l where l.id = link_id and l.owner_id = auth.uid())
  );

-- **والكتابةُ للمالك وحدَه**: هو من يدعو ويرفع ويُخرج.
drop policy if exists qr_shares_owner_write on public.qr_link_shares;
create policy qr_shares_owner_write on public.qr_link_shares
  for all to authenticated
  using (exists (select 1 from public.qr_links l where l.id = link_id and l.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.qr_links l where l.id = link_id and l.owner_id = auth.uid())
    and public.check_user_permission(user_id, 'use_qr_generator')
    and user_id <> auth.uid()
  );

grant select, insert, update, delete on public.qr_link_shares to authenticated;

-- ═══ الشريكُ يرى، والمحرِّرُ يكتب ═════════════════════════════════════════════
-- سياستان تُضافان ولا تُنقَض القائمة: `qr_links_own` تبقى كما هي (المالكُ يفعل كلَّ شيء).
drop policy if exists qr_links_shared_read on public.qr_links;
create policy qr_links_shared_read on public.qr_links
  for select to authenticated
  using (exists (
    select 1 from public.qr_link_shares s
    where s.link_id = qr_links.id and s.user_id = auth.uid()
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ));

drop policy if exists qr_links_shared_edit on public.qr_links;
create policy qr_links_shared_edit on public.qr_links
  for update to authenticated
  using (exists (
    select 1 from public.qr_link_shares s
    where s.link_id = qr_links.id and s.user_id = auth.uid() and s.access = 'edit'
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ))
  with check (exists (
    select 1 from public.qr_link_shares s
    where s.link_id = qr_links.id and s.user_id = auth.uid() and s.access = 'edit'
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ));

-- والمسحاتُ تُقرأ لمن يقرأ الصفّ.
drop policy if exists qr_scans_shared_read on public.qr_scans;
create policy qr_scans_shared_read on public.qr_scans
  for select to authenticated
  using (exists (
    select 1 from public.qr_link_shares s
    where s.link_id = qr_scans.link_id and s.user_id = auth.uid()
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ));

-- والجدولُ الزمنيُّ: يقرؤه الشريكُ، ويحرّره من له `edit`.
drop policy if exists qr_schedules_shared_read on public.qr_schedules;
create policy qr_schedules_shared_read on public.qr_schedules
  for select to authenticated
  using (exists (
    select 1 from public.qr_link_shares s
    where s.link_id = qr_schedules.link_id and s.user_id = auth.uid()
      and public.check_user_permission(auth.uid(), 'use_qr_generator')
  ));

drop policy if exists qr_schedules_shared_write on public.qr_schedules;
create policy qr_schedules_shared_write on public.qr_schedules
  for all to authenticated
  using (exists (
    select 1 from public.qr_link_shares s
    where s.link_id = qr_schedules.link_id and s.user_id = auth.uid() and s.access = 'edit'
  ))
  with check (exists (
    select 1 from public.qr_link_shares s
    where s.link_id = qr_schedules.link_id and s.user_id = auth.uid() and s.access = 'edit'
  ));

commit;
