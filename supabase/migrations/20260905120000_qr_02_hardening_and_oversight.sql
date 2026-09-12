-- الباركود — تحصينُ بابه، وسجلُّ وجهاته، وعينُ «أَدِيب» عليها (م١)
--
-- ⚠️ **مكتوبٌ ينتظر إذن المالك. لا يُنفَّذ إلّا بكلمته** (قاعدةُ DDL).
--
-- ## علّتُه: جردٌ أمنيٌّ في ٢٠٢٦-٠٩-٠٥ أخرج ثلاثةً
--
-- ١) **بابُ المسح `/q/<code>` مفتوحٌ بلا حدّ.** الرمزُ علنيٌّ مطبوعٌ على ملصق، وكلُّ طلبٍ
--    يُدرج صفًّا ويزيد العدّاد. فحلقةُ `curl` ببصمةِ هاتفٍ تنفخ الرقمَ وتُنمي الجدولَ بلا
--    سقف، والعدّادُ هو كلُّ ما يُبنى عليه الإحصاء.
-- ٢) **المتصفّحُ يكتب في `qr_links` مباشرةً.** الامتيازُ ممنوحٌ للجدول كلِّه، والسياسةُ تفحص
--    المالكَ والقدرةَ لا **ما يُكتَب**. فصاحبُ القدرة يبدّل عدّادَه، أو رمزَه بعد الطباعة،
--    أو يحشو وصفةً بعشرات الميغابايت، بلا أن يمرّ بأيّ تصديق.
-- ٣) **لا عينَ على الوجهات ولا سجلَّ تغيير.** حسابٌ يُخترَق يحوّل ملصقًا مطبوعًا في الجامعة
--    إلى صفحةِ تصيّدٍ تحمل رابطنا، ولا أحدَ يرى، ولا يُعرَف بعدها من بدّل ولا ما كانت.
--
-- ## وقرارُ المالك في الثالثة (٢٠٢٦-٠٩-٠٥)
-- عُرض عليه **قدرةُ إشرافٍ تُمنَح لشخصٍ بعينه**، فاختار **حسابًا واحدًا باسم «أَدِيب»** يملك
-- كلَّ القدرات، ونبدأ به من الباركود. فيُنشأ له دورٌ (`adeeb_admin`) يأخذ **كلَّ** المفاتيح،
-- والسياساتُ تقرأ **قدرةً** لا اسمَ دور (قانونُ المستودع: لا رتبةَ ولا ترقيم — القدرةُ وحدها).
-- وقيل له مرّةً: الحسابُ المشترَك يجعل السجلَّ يقول «أَدِيب» لا اسمَ الفاعل. فإن بقي له
-- وحدَه فالمسألةُ محلولة.

begin;

-- ═══ (١) المسحةُ المكرّرة تُحوَّل ولا تُعَدّ ═══════════════════════════════════
-- نافذةُ دقيقةٍ لبصمةِ الزائر نفسِها على الرمز نفسِه: من فتح الرابطَ مرّتين لم يمسح مرّتين،
-- ومن يضرب بحلقةٍ آليّةٍ لا يزيد العدّادَ إلّا مرّةً في الدقيقة. **والتحويلُ لا يتأثّر**:
-- الزائرُ يصل إلى وجهته دائمًا — الحدُّ على العدّ لا على الطريق.
--
-- ولا يُغني عن ذلك وسمُ الآلة: `is_bot` يمسك المعاينات المعلنةَ عن نفسها، لا من تنكّر.
create index if not exists qr_scans_dedupe_idx
  on public.qr_scans (link_id, visitor, scanned_at desc)
  where visitor is not null;

create or replace function public.qr_resolve(
  p_code     text,
  p_visitor  text default null,
  p_referrer text default null,
  p_device   text default null,
  p_is_bot   boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id     uuid;
  v_target text;
  v_recent boolean := false;
begin
  select id, target_url into v_id, v_target
  from public.qr_links
  where code = p_code and active
  limit 1;

  if v_id is null then
    return null;  -- المسارُ يعرض «غير متاح» ولا يفرّق بين معدومٍ وموقوف
  end if;

  -- البصمةُ تدور كلّ يوم (تُحسَب في التطبيق)، فهي تكفي لتمييز طلبين متتابعين ولا تصلح
  -- لوصلِ أمسِ باليوم بشخص. ومن جاء بلا بصمةٍ يُعَدّ: لا نعاقب من تعذّر قراءةُ عنوانه.
  if p_visitor is not null then
    select exists (
      select 1 from public.qr_scans s
      where s.link_id = v_id
        and s.visitor = p_visitor
        and s.scanned_at > now() - interval '1 minute'
    ) into v_recent;
  end if;

  if not v_recent then
    insert into public.qr_scans (link_id, visitor, referrer, device, is_bot)
    values (v_id, p_visitor, left(p_referrer, 500), coalesce(p_device, 'unknown'), coalesce(p_is_bot, false));

    -- الآلةُ لا تُعَدّ في الرقم الظاهر، وصفُّها محفوظٌ على كلّ حال.
    if not coalesce(p_is_bot, false) then
      update public.qr_links set scan_count = scan_count + 1 where id = v_id;
    end if;
  end if;

  return v_target;
end;
$$;

revoke all on function public.qr_resolve(text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.qr_resolve(text, text, text, text, boolean) to service_role;

-- ═══ (٢) سجلُّ المسحات لا ينمو إلى الأبد ══════════════════════════════════════
-- المخطّطُ لا يعرض أبعدَ من سنةٍ أصلًا، و**العدّادُ الكلّيُّ عمودٌ مستقلّ** فلا يضيع رقمٌ
-- بالتنظيف: يُحذف الصفُّ ويبقى المجموع.
create or replace function public.qr_purge_scans(p_days integer default 365)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gone integer;
begin
  delete from public.qr_scans
  where scanned_at < now() - make_interval(days => greatest(p_days, 30));
  get diagnostics v_gone = row_count;
  return v_gone;
end;
$$;

comment on function public.qr_purge_scans(integer) is
  'حذفُ صفوف المسح الأقدم من المدّة. العدّادُ الكلّيّ في qr_links لا يتأثّر.';

revoke all on function public.qr_purge_scans(integer) from public, anon, authenticated;

select cron.unschedule('qr-scans-purge')
where exists (select 1 from cron.job where jobname = 'qr-scans-purge');

-- أوّلَ كلّ شهرٍ في ساعةٍ خالية، على عُرف مهامّ النظافة الأخرى.
select cron.schedule('qr-scans-purge', '35 4 1 * *', $$select public.qr_purge_scans(365);$$);

-- ═══ (٣) ما لا يُكتَب من المتصفّح ═════════════════════════════════════════════
-- الامتيازُ كان على الجدول كلِّه، فصار **بالأعمدة**: يُحرَّر الاسمُ والوجهةُ والوصفةُ والحالُ
-- وتاريخُ التعديل، ويمتنع **الرمزُ** (ملصقٌ مطبوعٌ يموت بتبديله) و**المالكُ** (انتحالُ صفّ)
-- و**العدّادُ** (رقمٌ يُقرأ حقيقةً). والإدراجُ يبقى للجدول لأنّ الصفَّ الجديد يحتاج رمزَه
-- ومالكَه، والسياسةُ تفرض `owner_id = auth.uid()`.
revoke update on public.qr_links from authenticated;
grant update (title, target_url, spec, active, updated_at) on public.qr_links to authenticated;

-- وحدُّ الوصفة في القاعدة لا في التطبيق وحده: الخادمُ يصدّق، والقيدُ يمسك ما يفلت منه.
alter table public.qr_links drop constraint if exists qr_links_spec_size;
-- `octet_length(spec::text)` لا `pg_column_size`: الأخيرةُ ليست IMMUTABLE فيرفضها قيدُ CHECK.
alter table public.qr_links add constraint qr_links_spec_size
  check (octet_length(spec::text) <= 1600000);

-- ═══ (٤) سجلُّ ما جرى على الباركود ════════════════════════════════════════════
-- **محفّزٌ لا سطرٌ في التطبيق**: الكتابةُ ممكنةٌ من المتصفّح مباشرةً (امتيازُ `authenticated`
-- قائمٌ بالأعمدة أعلاه)، فسجلٌّ يكتبه الخادمُ وحدَه يُتجاوَز بطلبٍ واحد. والمحفّزُ لا يُتجاوَز.
create table if not exists public.qr_link_events (
  id         bigint generated always as identity primary key,
  link_id    uuid not null,
  -- لا مفتاحَ إسنادٍ إلى `qr_links`: الحذفُ نفسُه واقعةٌ تُقيَّد، ولو أُسند لذهب السجلُّ معه.
  actor_id   uuid,
  kind       text not null check (kind in ('target', 'title', 'active', 'spec', 'delete')),
  old_value  text,
  new_value  text,
  at         timestamptz not null default now()
);

create index if not exists qr_link_events_link_idx on public.qr_link_events (link_id, at desc);

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
  -- الوصفةُ تُقيَّد وقوعًا لا محتوًى: تخزينُ نسختين من `jsonb` بشعارٍ مضمَّنٍ يُضخّم السجلَّ
  -- أضعافَ الجدول نفسِه، والسؤالُ المطلوب «متى تغيّر الشكل ومن غيّره» لا «أيُّ لونٍ كان».
  if new.spec is distinct from old.spec then
    insert into public.qr_link_events (link_id, actor_id, kind, old_value, new_value)
    values (new.id, auth.uid(), 'spec', null, null);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_qr_log_event on public.qr_links;
create trigger trg_qr_log_event
  after update or delete on public.qr_links
  for each row execute function public.qr_log_event();

alter table public.qr_link_events enable row level security;

-- ═══ (٥) «أَدِيب»: دورٌ يملك المفاتيحَ كلَّها ═══════════════════════════════════
-- الدورُ يُنشأ هنا، والحسابُ يُربَط به بعد تنفيذ الترحيل. ولا يملك هذا الدورُ شيئًا
-- بذاته: السياساتُ تقرأ **قدرةً** (`check_user_permission`) لا اسمَ دور، فالمفاتيحُ
-- هي التي تفتح — ودورُ أَدِيب يحملها كلَّها.
-- أعمدةُ الجدول كما هي في القاعدة: `role_name_ar` لا `display_name`. و`role_level` عمودٌ
-- موروثٌ لا يُقرَأ في سياسةٍ ولا في كود V2 (أُعدم كعتبةِ صلاحيةٍ في ٢٠٢٦-٠٧-١٦)، ويُملأ
-- هنا بأدنى قيمةٍ لأنّه NOT NULL في صفوفٍ قديمة — **ولا يُشتقّ منه إذنٌ أبدًا**.
-- أعمدةُ `roles` كما هي في القاعدة (فُحصت قبل الكتابة): لا `role_category` فيها، و`role_level`
-- و`membership_kind` و`vote_weight` و`holder_uniqueness` NOT NULL.
-- · `membership_kind = 'subordinate'`: حسابُ النادي **ليس عضوًا** فلا يدخل كشوفَ الأعضاء
--   ولا عددَ النشطين ولا الانتخابات.
-- · `holder_uniqueness = 'global'`: أَدِيبٌ واحدٌ لا اثنان.
-- · `vote_weight = 1`: القيدُ يوجب قيمةً موجبة، و`votes_in_all_elections = false` فلا يصوّت.
-- · `role_level = 1`: العمودُ موروثٌ لا يُقرأ في سياسةٍ ولا في كود V2 (أُعدم كعتبةِ صلاحيةٍ
--   ٢٠٢٦-٠٧-١٦)، ويُملأ بأدنى قيمةٍ صريحًا كي لا يُشتقّ منه إذنٌ أبدًا. المفاتيحُ في
--   `role_permissions` وحدها.
insert into roles (role_name, role_name_ar, role_level, membership_kind, vote_weight,
                   votes_in_all_elections, holder_uniqueness, description)
select 'adeeb_admin', 'أَدِيب', 1, 'subordinate', 1, false, 'global',
       'حسابُ النادي: يملك كلَّ القدرات، ويُشرف على ما يخصّ النادي كلَّه'
where not exists (select 1 from roles where role_name = 'adeeb_admin');

-- قدرةُ الإشراف على الباركود — تُقرأ في السياسات وفي قفل الشاشة (`SECTION_CAP`).
insert into permissions (permission_key, permission_name_ar, description, category)
select 'oversee_qr', 'الإشراف على الباركود',
       'قراءةُ باركودات النادي كلِّها ووجهاتِها وسجلِّ تغييرها', 'tools'
where not exists (select 1 from permissions where permission_key = 'oversee_qr');

-- **كلُّ المفاتيح** لدور أَدِيب، وما يُضاف بعد اليوم يُلحَق بإعادة تشغيل هذا السطر.
-- أعمدةُ `role_permissions` كما هي في القاعدة (فُحصت ٢٠٢٦-٠٩-٠٥): `role_name` و`permission_id`
-- وحدهما — و`role_id` سقط من الجدول في ترحيلٍ سابق وبقي في نصوصٍ قديمة تُقلَّد.
insert into role_permissions (role_name, permission_id)
select 'adeeb_admin', p.id
from permissions p
where not exists (
  select 1 from role_permissions rp
  where rp.role_name = 'adeeb_admin' and rp.permission_id = p.id
);

-- ═══ (٦) وعينُه تقرأ ولا تكتب ════════════════════════════════════════════════
-- **قراءةٌ محضة**: الإشرافُ رؤيةٌ لا سلطةٌ على صفّ غيرِه. فمن أراد تعطيلَ باركودٍ مشبوهٍ
-- يفعلها بقدرةٍ أخرى تُضاف يومَ تُطلَب، لا بثغرةٍ في سياسة قراءة.
drop policy if exists qr_links_oversight_read on public.qr_links;
create policy qr_links_oversight_read on public.qr_links
  for select to authenticated
  using (public.check_user_permission(auth.uid(), 'oversee_qr'));

drop policy if exists qr_scans_oversight_read on public.qr_scans;
create policy qr_scans_oversight_read on public.qr_scans
  for select to authenticated
  using (public.check_user_permission(auth.uid(), 'oversee_qr'));

-- والسجلُّ يقرؤه صاحبُ الصفّ (ليعرف ما جرى على باركوده) والمشرفُ (ليعرف ما جرى على الكلّ).
drop policy if exists qr_events_read on public.qr_link_events;
create policy qr_events_read on public.qr_link_events
  for select to authenticated
  using (
    public.check_user_permission(auth.uid(), 'oversee_qr')
    or exists (
      select 1 from public.qr_links l
      where l.id = qr_link_events.link_id and l.owner_id = auth.uid()
    )
  );

-- ولا امتيازَ كتابةٍ لأحدٍ على السجلّ: المحفّزُ وحدَه يكتبه (`security definer`).
grant select on public.qr_link_events to authenticated;

commit;
