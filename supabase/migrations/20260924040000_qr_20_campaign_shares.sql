-- شركاءُ الحملة: إذنٌ على الحاوية يسري على ما فيها (م٢٠)
--
-- ## العلّة، بكلمة المالك (٢٠٢٦-٠٩-٢٤)
-- «نريد إنشاء خاصّيّة مشاركة الحملة». وحملةُ المعرض ستّةُ ملصقاتٍ يشتغل عليها اثنان، فلا
-- يُعقل أن يُشارَك كلُّ ملصقٍ وحدَه ستَّ مرّات، ثمّ تُعاد المشاركةُ كلّما وُلد ملصقٌ سابع.
--
-- ## والتصميم: لا نظامَ مشاركةٍ ثانٍ
-- سياساتُ الغرفة كلُّها (الباركودُ والمسحاتُ والمواعيد) تسأل دالّةً واحدة:
-- `qr_share_access(link)`. فالمشاركةُ الجديدة **توسّع تلك الدالّة** ولا تبني لها سياساتٍ
-- موازية: من شُورِك في الحاوية صار له ما لصاحب الشِّركة في كلّ باركودٍ داخلها، في الإحصاء
-- والمواعيد والتحرير سواءً، بلا أن تُلمَس سياسةٌ واحدة.
--
-- · **الإذنُ على الحاوية لا على نسخةٍ من محتواها** (قرارُ المالك): يسري على ما فيها الآن
--   وما يُضمّ إليها غدًا، **ويسقط عمّا يخرج منها** في اللحظة نفسِها. ولو نُسخت المشاركةُ
--   على الباركودات يومَها لصار للحاوية معنيان: ما تقوله، وما بقي مكتوبًا في صفوفٍ قديمة.
-- · **وأوسعُ الإذنين يفوز** (قرارُ المالك): من ناله «يحرّر» من الحاوية و«يقرأ» من الباركود
--   فهو محرِّر. والقاعدةُ أن الإذنَ يُجمَع لا يُطرَح، وهي أسهلُ ما يُشرَح لصاحبه.
-- · **والبنيةُ للمالك** (قرارُ المالك): الشريكُ يقرأ أو يحرّر **ما بداخلها**، ولا يضمّ ولا
--   يُخرج ولا يعيد تسميتها ولا يشاركها. وحارسُ م١٨ (`qr_campaign_guard`) يحرس الضمَّ أصلًا.
--
-- ## ودورةُ التعاود محروسة (درسُ م١٦)
-- سياسةُ `qr_campaigns` التي تُري الشريكَ حاويتَه **لا تسأل جدولَ الشركاء مباشرةً**: لو
-- فعلت لسألت سياسةُ الشركاء جدولَ الحملات وسألت الأخرى الشركاءَ بلا نهاية. فالسؤالُ يمرّ
-- بدالّةٍ `security definer` تقطع الدورة، كما فعلت `qr_share_access` يومَ وُلدت.

begin;

-- ═══ جدولُ الشركاء ═════════════════════════════════════════════════════════════
create table if not exists public.qr_campaign_shares (
  campaign_id uuid not null references public.qr_campaigns(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  access      text not null default 'read' check (access in ('read', 'edit')),
  granted_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create index if not exists qr_campaign_shares_user_idx on public.qr_campaign_shares (user_id);

comment on table public.qr_campaign_shares is
  'شركاءُ الحملة: إذنٌ على الحاوية يسري على باركوداتها عبر qr_share_access. البنيةُ والمشاركةُ تبقيان للمالك.';

alter table public.qr_campaign_shares enable row level security;

-- ═══ قاطعُ الدورة: إذنُ صاحب الجلسة في حاويةٍ بعينها ═══════════════════════════
create or replace function public.qr_campaign_share_access(p_campaign uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
           when bool_or(s.access = 'edit') then 'edit'
           when bool_or(s.access = 'read') then 'read'
           else null
         end
  from public.qr_campaign_shares s
  where s.campaign_id = p_campaign and s.user_id = auth.uid();
$$;

comment on function public.qr_campaign_share_access(uuid) is
  'إذنُ صاحب الجلسة في حملةٍ بعينها (read/edit) أو NULL. تُنادى من سياسة qr_campaigns لقطع دورة التعاود.';

revoke all on function public.qr_campaign_share_access(uuid) from public, anon;
grant execute on function public.qr_campaign_share_access(uuid) to authenticated;

-- ═══ سياساتُ جدول الشركاء: يُقرأ من طرفيه، ويُكتَب من طرفٍ واحد ═════════════════
drop policy if exists qr_campaign_shares_read on public.qr_campaign_shares;
create policy qr_campaign_shares_read on public.qr_campaign_shares
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.check_user_permission(auth.uid(), 'oversee_qr')
    or exists (select 1 from public.qr_campaigns c where c.id = campaign_id and c.owner_id = auth.uid())
  );

-- **والكتابةُ للمالك وحدَه**: هو من يدعو ويرفع ويُخرج، فلا يشارك شريكٌ شريكًا.
drop policy if exists qr_campaign_shares_owner_write on public.qr_campaign_shares;
create policy qr_campaign_shares_owner_write on public.qr_campaign_shares
  for all to authenticated
  using (exists (select 1 from public.qr_campaigns c where c.id = campaign_id and c.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.qr_campaigns c where c.id = campaign_id and c.owner_id = auth.uid())
    and public.check_user_permission(user_id, 'use_qr_generator')
    and user_id <> auth.uid()
  );

-- **والمنحُ على الجدول لا على أعمدته**، خلافًا لـ`qr_links` وعلى مثال `qr_link_shares`:
-- هناك أعمدةٌ يُمنَع منها **المالكُ نفسُه** (الرمزُ والعدّادُ والمالك)، فيضيق المنحُ بالعمود.
-- وهنا كلُّ عمودٍ يكتبه صاحبُ الحاوية بحقّه، والحارسُ سياسةُ الصفّ. **وضيقٌ في غير موضعه
-- يكسر**: `grant update (access)` وحدَه يردّ الإضافةَ بـ42501، لأنّ الـupsert يكتب
-- `granted_by` عند التصادم (أُمسك قبل التطبيق ٢٠٢٦-٠٩-٢٤).
grant select, insert, update, delete on public.qr_campaign_shares to authenticated;

-- ═══ والشريكُ يرى حاويتَه في «الحملات» ═════════════════════════════════════════
drop policy if exists qr_campaigns_share_read on public.qr_campaigns;
create policy qr_campaigns_share_read on public.qr_campaigns
  for select to authenticated
  using (public.qr_campaign_share_access(id) is not null);

-- ═══ الدالّةُ الواحدة تتّسع: إذنُ الباركود، أو إذنُ حاويته ══════════════════════
--
-- **وأوسعُهما يفوز.** والقراءةُ من جدولين في استعلامٍ واحدٍ لا نداءين: الدالّةُ تُنادى في
-- كلّ صفٍّ من كلّ سياسةٍ في الغرفة، فثمنُها يُضاعَف بعدد الصفوف لا بعدد الشاشات.
create or replace function public.qr_share_access(p_link uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
           when bool_or(t.a = 'edit') then 'edit'
           when bool_or(t.a = 'read') then 'read'
           else null
         end
  from (
    select s.access as a
    from public.qr_link_shares s
    where s.link_id = p_link and s.user_id = auth.uid()
    union all
    select cs.access
    from public.qr_links l
    join public.qr_campaign_shares cs on cs.campaign_id = l.campaign_id
    where l.id = p_link and cs.user_id = auth.uid()
  ) t;
$$;

comment on function public.qr_share_access(uuid) is
  'إذنُ صاحب الجلسة في باركودٍ بعينه: أوسعُ ما يصله من شِركةٍ على الباركود أو على حاويته (م٢٠).';

-- ═══ ومنزلةُ الناظر من الحاوية نفسِها ══════════════════════════════════════════
create or replace function public.qr_campaign_access(p_campaign uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
           when exists (
             select 1 from public.qr_campaigns c
             where c.id = p_campaign and c.owner_id = auth.uid()
           ) then 'owner'
           else public.qr_campaign_share_access(p_campaign)
         end;
$$;

comment on function public.qr_campaign_access(uuid) is
  'منزلةُ صاحب الجلسة من حملة: owner أو edit أو read أو NULL. تقرؤها الشاشةُ لتعرف ما تعرض.';

revoke all on function public.qr_campaign_access(uuid) from public, anon;
grant execute on function public.qr_campaign_access(uuid) to authenticated;

commit;
