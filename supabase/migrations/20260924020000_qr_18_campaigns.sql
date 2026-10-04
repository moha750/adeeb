-- الحملةُ حاويةُ باركودات: كيانٌ يُنشأ ويُملأ (م١٨)
--
-- ## العلّة، بكلمة المالك (٢٠٢٦-٠٩-٢٤)
-- «تنشئ حملةً وداخلها عدّةُ باركودات وكأنّها حاوية» — معرضُ اليوم الوطنيّ يخرج بستّة
-- ملصقاتٍ في ستّة مواضع، والسؤالُ بعده «كم مسحةً للمعرض كلِّه؟» و«أيُّ موضعٍ نجح؟».
--
-- ## وهذا ينقض قرارَ م٨ صراحةً
-- كتبنا في `qr_11_tags`: «الحملةُ صفةٌ تُقرأ لا كيانٌ يُدار، فجدولٌ لها ديونٌ بلا مقابل»،
-- فنزل عمودُ `tags` ولم تُبنَ له شاشةٌ قطّ. ونُقِض بعد أن عُرضت الأشكالُ الثلاثةُ على
-- المالك في `/ui/qr-campaigns` فاختار **غرفةَ الحملة**. والفرقُ ليس لفظًا:
--
-- · الوسمُ صفةٌ تُكتب على باركودٍ قائم، فلا يوجد قبله ولا بعد زواله.
-- · والحاويةُ تُنشأ **أوّلًا** ثمّ تُملأ، ولها اسمٌ يُعدَّل وصاحبٌ وإحصاءٌ مجموعٌ وصفحةٌ
--   تُفتح، وتحيا فارغةً تنتظر ملصقاتِها.
--
-- وعمودُ `tags` يبقى في هذا الترحيل كما هو (ميّتًا بلا قارئ)، وإعدامُه ترحيلٌ مستقلٌّ
-- بإذنٍ باسمه: إسقاطُ عمودٍ لا رجعةَ فيه.
--
-- ## التصميم
-- · **علاقةُ واحدٍ إلى كثير**: الباركودُ في حملةٍ واحدةٍ لا غير (قرارُ المالك مع اختياره
--   للغرفة: غرفتان تقولان «هذا داخلَها» فتكذب إحداهما).
-- · **`on delete set null` لا `cascade`**: حذفُ الحاوية تمزيقُ ورقةِ تنظيم، والملصقُ
--   المطبوعُ في الشارع يبقى يعمل. **لا يموت باركودٌ بموت حاويته.**
-- · **الحاويةُ لصاحبها**: لا يُوضَع باركودٌ في حملةٍ ليست لمالكه، ولا ينقله بينها شريكٌ
--   محرِّر. يحرسه محفّزٌ لأنّ السياسةَ تحكم الصفَّ ولا تحكم العمود.
-- · **والمجاميعُ تُحسَب ولا تُخزَّن**: `scan_count` مصدرٌ واحد، وعدّادٌ ثانٍ على الحملة
--   يفترق عنه يومَ يُحذَف باركودٌ منها.

begin;

-- ═══ الحاوية ═══════════════════════════════════════════════════════════════════
create table if not exists public.qr_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text,
  -- **بلا مفتاحٍ أجنبيّ اليوم** (وصُحّح وصفُه ٢٠٢٦-٠٩-٢٤ عند التطبيق): ظننتُ أنّ
  -- `qr_links.owner_id` بلا مفتاح، وهو **بمفتاحٍ إلى `auth.users` بـcascade** ــ ومن أجله
  -- بُني محفّزُ التوريث (م٦) أصلًا. فبقاءُ الحاوية بلا مفتاحٍ ثغرةٌ لا اتّساق: لو غاب
  -- حسابُ النادي لَذهبت باركوداتُه بالـcascade وبقيت حملاتُه صفوفًا يتيمةً لا يراها أحد.
  -- ويسدّها ترحيلُ م١٩ (مفتاحٌ بـcascade)، وهو موقوفٌ على إذنٍ باسمه.
  owner_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_campaigns_name_shape check (btrim(name) <> '' and length(name) <= 120),
  constraint qr_campaigns_note_shape check (note is null or length(note) <= 200)
);

create index if not exists qr_campaigns_owner_idx on public.qr_campaigns (owner_id, created_at desc);

comment on table public.qr_campaigns is
  'حملةٌ تحوي باركودات: كيانٌ يُنشأ ثمّ يُملأ، لا وسمٌ يُكتب على صفٍّ قائم (م١٨، ينقض م٨).';
comment on column public.qr_campaigns.note is 'تعريفٌ قصير يُقرأ تحت الاسم في الكرت. اختياريّ.';

alter table public.qr_campaigns enable row level security;

-- سياساتُها نظيرةُ سياسات `qr_links` بلا اجتهاد: مِلكٌ، وإشرافٌ يقرأ، وشِركةٌ تقرأ.
drop policy if exists qr_campaigns_own on public.qr_campaigns;
create policy qr_campaigns_own on public.qr_campaigns
  for all to authenticated
  using (owner_id = auth.uid() and public.check_user_permission(auth.uid(), 'use_qr_generator'))
  with check (owner_id = auth.uid() and public.check_user_permission(auth.uid(), 'use_qr_generator'));

drop policy if exists qr_campaigns_oversight_read on public.qr_campaigns;
create policy qr_campaigns_oversight_read on public.qr_campaigns
  for select to authenticated
  using (public.check_user_permission(auth.uid(), 'oversee_qr'));

-- الامتيازُ بالعمود كما في `qr_links` (م١): الاسمُ والتعريفُ يُحرَّران، والمعرّفُ والصاحبُ لا.
grant select, insert, delete on public.qr_campaigns to authenticated;
grant update (name, note, updated_at) on public.qr_campaigns to authenticated;

-- ═══ انتماءُ الباركود إلى حاويته ═══════════════════════════════════════════════
alter table public.qr_links
  add column if not exists campaign_id uuid references public.qr_campaigns(id) on delete set null;

create index if not exists qr_links_campaign_idx on public.qr_links (campaign_id);

comment on column public.qr_links.campaign_id is
  'حاويةُ الباركود إن كان في حملة. حذفُ الحملة يُفرغها ولا يحذف الباركود.';

-- **بلا هذا المنحِ لا تبلغ السياسةَ كتابةٌ** (درسُ `profiles`): الامتيازُ بالعمود يُردّ
-- بـ403 قبل أن يُنظَر في الصفّ.
grant insert (campaign_id), update (campaign_id) on public.qr_links to authenticated;

-- **وسياسةُ الشِّركة تأتي بعد العمود لا قبله** (أُمسك عند التطبيق ٢٠٢٦-٠٩-٢٤): سياسةٌ تسمّي
-- عمودًا لم يُضَف بعدُ تُردّ بـ42703 ويرتدّ الترحيلُ كلُّه. الحدُّ العامّ: **ما يُذكَر في
-- تعبيرٍ يُنشَأ قبلَه**، ولا ينفع أن يكون الملفُّ مرتَّبًا بالمعنى وحدَه.
--
-- **ومن شُورِك في باركودٍ داخلها قرأ اسمَها**: وإلّا رأى في قائمته خانةَ حملةٍ فارغةً
-- فظنّها عطلًا. يقرأ الاسمَ ولا يملك الحاوية: لا يُعدّلها ولا يضمّ إليها.
drop policy if exists qr_campaigns_shared_read on public.qr_campaigns;
create policy qr_campaigns_shared_read on public.qr_campaigns
  for select to authenticated
  using (
    exists (
      select 1 from public.qr_links l
      where l.campaign_id = qr_campaigns.id and public.qr_share_access(l.id) is not null
    )
  );

-- ═══ حارسُ الحاوية: السياسةُ تحكم الصفَّ، وهذا يحكم العمود ═════════════════════
create or replace function public.qr_campaign_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ما لم تتبدّل الحاويةُ فلا شأنَ لهذا الحارس (إيقافٌ، وتبديلُ وجهة، ونقلُ ملكيّة).
  if tg_op = 'UPDATE' and new.campaign_id is not distinct from old.campaign_id then
    return new;
  end if;

  -- **الحاويةُ لصاحب الباركود**: وإلّا وضع أحدُهم ملصقَه في غرفة غيره فقرأ صاحبُها عنوانًا لا يملكه.
  if new.campaign_id is not null and not exists (
    select 1 from public.qr_campaigns c where c.id = new.campaign_id and c.owner_id = new.owner_id
  ) then
    raise exception 'CAMPAIGN_NOT_YOURS';
  end if;

  -- **والشريكُ المحرِّر لا ينقل باركودَ غيره بين الحاويات.** ونقلُ الملكيّة مستثنًى: هو
  -- يُفرغ الحاويةَ في الحركة نفسِها (`qr_transfer_owner`) وصاحبُ الجلسة فيه مشرفٌ لا مالك.
  if tg_op = 'UPDATE'
     and new.owner_id = old.owner_id
     and auth.uid() is not null
     and auth.uid() <> new.owner_id then
    raise exception 'CAMPAIGN_OWNER_ONLY';
  end if;

  return new;
end;
$$;

comment on function public.qr_campaign_guard() is
  'يمنع وضعَ باركودٍ في حملةٍ ليست لمالكه، ويمنع شريكًا محرِّرًا من نقله بين الحاويات.';

drop trigger if exists trg_qr_campaign_guard on public.qr_links;
create trigger trg_qr_campaign_guard
  before insert or update on public.qr_links
  for each row execute function public.qr_campaign_guard();

-- ═══ والحاويةُ تُقيَّد في السجلّ كما تُقيَّد الوجهة ══════════════════════════════
alter table public.qr_link_events drop constraint if exists qr_link_events_kind_check;
alter table public.qr_link_events add constraint qr_link_events_kind_check
  check (kind in ('target', 'title', 'active', 'spec', 'delete', 'owner', 'schedule', 'tags', 'campaign'));

create or replace function public.qr_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (old.id, auth.uid(), 'delete', old.target_url, null);
    return old;
  end if;

  if new.target_url is distinct from old.target_url then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'target', old.target_url, new.target_url);
  end if;
  if new.title is distinct from old.title then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'title', old.title, new.title);
  end if;
  if new.active is distinct from old.active then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'active', old.active::text, new.active::text);
  end if;
  if new.tags is distinct from old.tags then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'tags',
            array_to_string(old.tags, '، '), array_to_string(new.tags, '، '));
  end if;
  -- **الحاويةُ باسمها لا بمعرّفها**: السجلُّ يُقرأ بعينٍ لا يُستعلَم عنه.
  -- وحين تُحذَف الحملةُ فيُفرِغ `set null` باركوداتِها، يكون صفُّها قد ذهب فيُقرأ الاسمُ
  -- القديمُ فارغًا. وهو مقبول: الواقعةُ «خرج من حملة» محفوظةٌ بزمنها وفاعلها.
  if new.campaign_id is distinct from old.campaign_id then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'campaign',
            (select c.name from public.qr_campaigns c where c.id = old.campaign_id),
            (select c.name from public.qr_campaigns c where c.id = new.campaign_id));
  end if;
  -- الوصفةُ تُقيَّد وقوعًا لا محتوًى (شعارٌ مضمَّنٌ يُضخّم السجلَّ أضعافَ الجدول).
  if new.spec is distinct from old.spec then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'spec', null, null);
  end if;

  return new;
end;
$$;

-- ═══ والحاويةُ تورَث كما يورَث الباركود (امتدادُ م٦) ═══════════════════════════
create or replace function public.qr_bequeath_to_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club uuid;
  v_moved integer;
begin
  select ur.user_id into v_club
  from public.user_roles ur
  where ur.role_name = 'adeeb_admin' and ur.is_active
    and ur.user_id <> old.id
  limit 1;

  if v_club is null then
    return old;  -- لا حسابَ نادٍ: يمضي الحذفُ بسلوكه القديم ولا يُعطَّل
  end if;

  -- **الحاويةُ قبل ما فيها**: لو نُقل الباركودُ وحدَه لبقي في حملةٍ صاحبُها معدوم، فتقرأ
  -- شاشةُ النادي باركودًا في حملةٍ لا يراها أحد. والحارسُ يشترط اتّحادَ المالكَين.
  update public.qr_campaigns set owner_id = v_club, updated_at = now() where owner_id = old.id;

  update public.qr_links set owner_id = v_club, updated_at = now() where owner_id = old.id;
  get diagnostics v_moved = row_count;

  if v_moved > 0 then
    -- الفاعلُ هو من نفّذ الحذف إن كان معلومًا، وإلّا فالنظام (كنسٌ مجدول): `actor_id` يقبل NULL.
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    select l.id, auth.uid(), 'owner', old.id::text, v_club::text
    from public.qr_links l
    where l.owner_id = v_club and l.updated_at >= now() - interval '1 second';
  end if;

  return old;
end;
$$;

-- ═══ ونقلُ الملكيّة يُخرج الباركودَ من حاويته ══════════════════════════════════
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

  -- **ويخرج من حاويته**: الحملةُ ملكُ صاحبها، فباركودٌ انتقل إلى غيره يبقى في غرفةٍ لا
  -- يراها مالكُه الجديد ويعدّه صاحبُها القديمُ في مجموعه. والخروجُ يُقيَّد بنفسه في السجلّ.
  update public.qr_links
     set owner_id = p_to, campaign_id = null, updated_at = now()
   where id = p_id;

  -- المحفّزُ العامُّ لا يرى تبدّلَ المالك (يقيّد الوجهةَ والاسمَ والحالَ والوصفة)، فتُكتَب
  -- الواقعةُ هنا صراحةً بالقيمتين: من كان ومن صار.
  insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
  values (p_id, auth.uid(), 'owner', v_old::text, p_to::text);

  return true;
end;
$$;

commit;
