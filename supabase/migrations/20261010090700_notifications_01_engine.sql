-- نظامُ الإشعارات (١): المحرّك. الواقعةُ والصندوقُ والعناوين (v2/NOTIFICATIONS-SYSTEM.md، اعتمده محمد 2026-10-10).
--
-- يُبنى من الصفر ولا يمسّ نظامَ النسخة الأولى (`notifications` و`notification_reads`)، فذاك يُحذف بإذن
-- محمد بعد نقل إشعارات الانتخابات. والأسماءُ الجديدة لا تشبه القديمة ولا `notification_deliveries`
-- (ترحيلُ واتساب الإنذارات الذي لم يُطبَّق)، فلا يلتبس جدولان.
--
-- الطبقاتُ ثلاث، والقاعدةُ تحمل اثنتين منها:
--   • الواقعة (`notification_events`): ما حدث فقط — نوعُه وحقائقُه ومن فعله. لا نصَّ فيها ولا مستلمين.
--     وهي سجلٌّ بكلّ ما خرج من النظام، وطابورٌ للموزِّع في آنٍ واحد.
--   • الصندوق (`notification_inbox`): صفٌّ لكلّ مستلم، يُكتب لحظةَ التوزيع. **ولا نصَّ فيه**: النصُّ
--     يُرسَم من الدليل (`lib/notifications/catalog.ts`) عند العرض، فتصحيحُ كلمةٍ يصحّحها في كلّ ما أُرسل.
--   • الدليلُ نفسُه في الكود لا هنا، ومعه الموزِّع (`lib/notifications/dispatch.ts`).
--
-- والإشعارُ باقٍ لا يُحذف (قرار محمد): لا كنّاسَ للصندوق. و`expires_at` لنوعٍ يقول دليلُه إنّه يغيب
-- بأجل (التصويتُ مفتوح، فإذا أُغلق لم يبقَ للإشعار معنى)، لا حذفٌ عامّ.

-- ══ (١) الواقعة ══════════════════════════════════════════════════════════════════════════════════

create table public.notification_events (
  id            bigint generated always as identity primary key,
  kind          text        not null,
  facts         jsonb       not null default '{}'::jsonb,
  actor_id      uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  attempts      smallint    not null default 0,
  dispatched_at timestamptz,
  recipients    integer,
  error         text,
  fallback      text,
  -- «قسمٌ.حدث» بحروفٍ لاتينيّةٍ صغيرة: مفتاحُ الدليل، فلا يُكتب بغير صيغته.
  constraint notification_events_kind_shape check (kind ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  constraint notification_events_facts_object check (jsonb_typeof(facts) = 'object')
);

comment on table public.notification_events is
  'الواقعة: ما حدث فقط (نوعٌ من الدليل + حقائق + فاعل). سجلٌّ بكلّ ما خرج من النظام وطابورٌ للموزِّع. v2/NOTIFICATIONS-SYSTEM.md';
comment on column public.notification_events.facts is
  'حقائقُ الواقعة لحظتَها (معرّفاتٌ وأسماءٌ كما كانت)، يرسم منها الدليلُ النصَّ ويحسب المستلمين.';
comment on column public.notification_events.fallback is
  'عنوانٌ احتياطيّ يُكتب ساعةَ التوزيع، يُعرَض إن حُذف نوعُ الواقعة من الدليل يومًا.';
comment on column public.notification_events.recipients is
  'عددُ من كُتب لهم صفٌّ في الصندوق ساعةَ التوزيع.';

-- الطابور: ما لم يوزَّع بعد. والفهرسُ جزئيٌّ فيبقى صغيرًا مهما كبر السجلّ.
create index notification_events_pending_idx on public.notification_events (id) where dispatched_at is null;
create index notification_events_actor_idx   on public.notification_events (actor_id) where actor_id is not null;

-- ══ (٢) الصندوق ═════════════════════════════════════════════════════════════════════════════════

create table public.notification_inbox (
  id         bigint generated always as identity primary key,
  event_id   bigint      not null references public.notification_events(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  audience   text        not null,
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  expires_at timestamptz,
  pushed_at  timestamptz,
  -- إشعارٌ واحدٌ للشخص من الواقعة الواحدة، ولو طابقه مخاطَبان، ولو أُعيد التوزيع بعد عطب.
  constraint notification_inbox_once unique (event_id, user_id)
);

comment on table public.notification_inbox is
  'الصندوق: صفٌّ لكلّ مستلم يُكتب لحظةَ التوزيع. لا نصَّ فيه: النصُّ يُرسَم من الدليل عند العرض بجنس قارئه.';
comment on column public.notification_inbox.audience is
  'مفتاحُ المخاطَب في مدخل الدليل: يختار النصَّ والرابطَ والدرجة لهذا المستلم.';
comment on column public.notification_inbox.expires_at is
  'أجلٌ يقوله الدليلُ لنوعٍ يغيب بانقضاء سببه. فارغٌ = باقٍ أبدًا (قرار محمد: الإشعارُ لا يُحذف).';

create index notification_inbox_user_idx   on public.notification_inbox (user_id, id desc);
create index notification_inbox_unread_idx on public.notification_inbox (user_id) where read_at is null;

-- ══ (٣) الحراسة: لا يكتب أحدٌ من المتصفّح، ولا يقرأ أحدٌ إلّا صفوفَه ══════════════════════════

alter table public.notification_events enable row level security;
alter table public.notification_inbox  enable row level security;

revoke all on public.notification_events from anon, authenticated;
revoke all on public.notification_inbox  from anon, authenticated;

-- القراءةُ لصاحب الصفّ وحده، ولأجل Realtime: الجرسُ يسمع وصولَ صفّه فيُحدّث عدَّه. والكتابةُ كلُّها
-- بمفتاح الخدمة (الموزِّع، و«قُرئ»): فلا سياسةَ إدراجٍ ولا تحديث.
grant select on public.notification_inbox to authenticated;
create policy notification_inbox_own_read on public.notification_inbox
  for select to authenticated using (user_id = (select auth.uid()));

alter publication supabase_realtime add table public.notification_inbox;

-- ══ (٤) الإطلاق: سطرٌ واحدٌ عند مصدر الواقعة ═════════════════════════════════════════════════════
-- من دالّة قاعدةٍ (فتنجح الواقعةُ وإشعارُها معًا أو يسقطان معًا)، أو من إجراءٍ خادميّ بمفتاح الخدمة.
-- ولا يناديها المتصفّح أبدًا: لو نُوديت منه لَأرسل أيُّ أحدٍ إلى أيّ أحد.

create or replace function public.notify_event(p_kind text, p_facts jsonb default '{}'::jsonb, p_actor uuid default null)
returns bigint
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notification_events (kind, facts, actor_id)
  values (p_kind, coalesce(p_facts, '{}'::jsonb), p_actor)
  returning id;
$$;

comment on function public.notify_event(text, jsonb, uuid) is
  'إطلاقُ واقعة: نوعٌ من الدليل وحقائقُها وفاعلُها. الموزِّعُ يقرؤها بعدُ. لمفتاح الخدمة ودوالّ القاعدة وحدها.';

-- ══ (٥) المطالبة: الموزِّعُ يأخذ دفعةً لا يأخذها غيرُه ═══════════════════════════════════════════
-- عبارةٌ واحدةٌ ذرّيّة (`for update skip locked`): موزِّعان متزامنان لا يظفران بالواقعة نفسها.
-- ومن ماتت مطالبتُه (خمسُ دقائق) تُطالَب من جديد، وبعد خمس محاولاتٍ تبقى بخطئها للنظر لا للدوران.

create or replace function public.claim_notification_events(p_limit integer default 20)
returns setof public.notification_events
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.notification_events e
     set claimed_at = now(),
         attempts   = e.attempts + 1
   where e.id in (
     select q.id
       from public.notification_events q
      where q.dispatched_at is null
        and q.attempts < 5
        and (q.claimed_at is null or q.claimed_at < now() - interval '5 minutes')
      order by q.id
      limit greatest(1, least(coalesce(p_limit, 20), 100))
      for update skip locked
   )
  returning e.*;
$$;

-- ══ (٦) العناوين: من يُخاطَب، يُحسب لحظةَ التوزيع ═══════════════════════════════════════════════
-- العنوانُ وصفٌ لا اسم، فتغيّرُ الهيكلة لا يمسّ الدليل:
--   {"user": uuid}                                   شخصٌ بعينه
--   {"seat": role_name, "committee"?: n, "department"?: n}   شاغلُ المقعد الآن، أصيلًا أو مكلَّفًا
--   {"capability": key}                              كلُّ من يملك القدرة (بحسب get_user_permissions)
--   {"committee": n}                                 كلُّ مقاعد اللجنة الحيّة
--   {"standing": "member" | "volunteer"}             المنزلة
-- والمجمَّدُ لا يصله شيء: صفُّه غيرُ حيّ (`user_roles_frozen_shape`). وعنوانٌ لا يُعرف يُسقط التوزيعَ
-- بخطئه ولا يُبتلَع: خطأٌ في الدليل يُرى في السجلّ لا يمرّ صامتًا.

create or replace function public.notification_capability_holders(p_key text)
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_perm integer;
begin
  select id into v_perm from public.permissions where permission_key = p_key;
  if v_perm is null then
    raise exception 'notification address: unknown capability %', p_key;
  end if;
  -- منطقُ `get_user_permissions` نفسُه مقلوبًا: من الدور، ومن المنح الفرديّ، إلّا المحجوبَ صراحةً.
  return query
    select ur.user_id
      from public.user_roles ur
      join public.role_permissions rp on rp.role_name = ur.role_name
     where ur.is_active and rp.permission_id = v_perm
    union
    select usp.user_id
      from public.user_specific_permissions usp
     where usp.permission_id = v_perm and usp.is_granted
       and (usp.expires_at is null or usp.expires_at > now())
    except
    select usp.user_id
      from public.user_specific_permissions usp
     where usp.permission_id = v_perm and not usp.is_granted
       and (usp.expires_at is null or usp.expires_at > now());
end;
$$;

create or replace function public.notification_recipients(p_to jsonb)
returns setof uuid
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  a jsonb;
begin
  if p_to is null or jsonb_typeof(p_to) <> 'array' then
    raise exception 'notification_recipients: expected an array of addresses';
  end if;

  for a in select value from jsonb_array_elements(p_to) loop
    if jsonb_typeof(a) <> 'object' then
      raise exception 'notification address: not an object: %', a;
    elsif a ? 'user' then
      return query select u.id from auth.users u where u.id = (a->>'user')::uuid;
    elsif a ? 'seat' then
      return query
        select ur.user_id
          from public.user_roles ur
         where ur.is_active
           and ur.role_name = a->>'seat'
           and (not a ? 'committee'  or ur.committee_id  = (a->>'committee')::integer)
           and (not a ? 'department' or ur.department_id = (a->>'department')::integer);
    elsif a ? 'capability' then
      return query select h from public.notification_capability_holders(a->>'capability') h;
    elsif a ? 'committee' then
      return query
        select ur.user_id from public.user_roles ur
         where ur.is_active and ur.committee_id = (a->>'committee')::integer;
    elsif a ? 'standing' then
      if a->>'standing' = 'member' then
        return query select p.id from public.profiles p where public.is_adeeb_member(p.id);
      elsif a->>'standing' = 'volunteer' then
        return query select v.user_id from public.volunteers v where v.status = 'active';
      else
        raise exception 'notification address: unknown standing %', a->>'standing';
      end if;
    else
      raise exception 'notification address: unknown shape %', a;
    end if;
  end loop;
end;
$$;

-- ══ (٧) الأقفال: الدوالُّ كلُّها لمفتاح الخدمة وحده ═══════════════════════════════════════════════

revoke execute on function public.notify_event(text, jsonb, uuid)              from public, anon, authenticated;
revoke execute on function public.claim_notification_events(integer)           from public, anon, authenticated;
revoke execute on function public.notification_capability_holders(text)        from public, anon, authenticated;
revoke execute on function public.notification_recipients(jsonb)               from public, anon, authenticated;
grant  execute on function public.notify_event(text, jsonb, uuid)              to service_role;
grant  execute on function public.claim_notification_events(integer)           to service_role;
grant  execute on function public.notification_capability_holders(text)        to service_role;
grant  execute on function public.notification_recipients(jsonb)               to service_role;
