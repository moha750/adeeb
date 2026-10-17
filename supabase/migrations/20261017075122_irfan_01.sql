-- ═══════════════════════════════════════════════════════════════════════════
-- «عِرفان» (٢٠٢٦-١٠-١٧) — رسالةُ شكرٍ من عضو أدِيب إلى قائدٍ في المجلسين.
--
-- قراراتُ المالك:
--  · الاسمُ ظاهرٌ لا مجهول: قيمةُ الشكر في معرفة قائله، والمجهولُ بابٌ لنقدٍ تحت غطاء الشكر.
--  · يرسل **العضوُ وحده** (`is_adeeb_member`): لا متطوّعَ ولا صديق.
--  · المستلمون **قادةُ المجلسين**: كلُّ مقعدٍ حيٍّ `membership_kind = 'member'` — الرئيسان، وقادةُ
--    الإدارات، والمنسّقون، وقادةُ اللجان ونوّابُهم. (`adeeb_admin` حسابُ النادي لا قائد.)
--  · مواسمُ تُفتح وتُغلق، وأوّلُها اليومُ العالميّ للمدير. ورسالةٌ واحدةٌ لكلّ مستلمٍ في الموسم.
--  · لا عدّادَ ظاهرٌ لأحد. والرئيسان وحدهما يريان **من لم تصله رسالة** (لا كم وصل غيرَه)،
--    ليكتبا له فلا يخرج أحدٌ بصفر.
--  · الرسالةُ لا يقرؤها إلّا مرسلُها ومستلمُها. وزرُّ بلاغٍ للمستلم، وما بُلِّغ عنه يراه الرئيسان.
--  · الأرشيفُ باقٍ: الرسالةُ تبقى في بوّابة المستلم بعد خروجه من المقعد أو من أدِيب.
--  · **تصميمان للبطاقة يختار المرسلُ أحدَهما** («رسالة» و«شفق»، المالك: «لماذا أعتمد تصميمًا
--    واحدًا، وليكن تصميمين»). فيُحفظ اختيارُه مع الرسالة، ويراها المستلمُ كما اختارها مرسلُها.
--
-- واللقطةُ تُحفظ يومَ الإرسال (الاسمان، والمقعدُ، ووحدتُه) كما تُحفظ في الشهادات: تغيّرُ المقعد
-- غدًا لا يغيّر ما كُتب إليه اليوم.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.irfan_seasons (
  id         integer generated always as identity primary key,
  title      text not null check (char_length(btrim(title)) between 2 and 80),
  opens_at   timestamptz not null,
  closes_at  timestamptz not null,
  created_at timestamptz not null default now(),
  constraint irfan_seasons_window check (closes_at > opens_at)
);
comment on table public.irfan_seasons is
  'مواسمُ «عِرفان»: نافذةٌ تُفتح فيها الكتابة ثمّ تُغلق. الرسائلُ باقيةٌ بعد الإغلاق.';

create table public.irfan_messages (
  id             bigint generated always as identity primary key,
  season_id      integer not null references public.irfan_seasons(id),
  sender_id      uuid not null references public.profiles(id) on delete cascade,
  recipient_id   uuid not null references public.profiles(id) on delete cascade,
  -- اللقطة: كما كانت لحظةَ الإرسال
  sender_name    text not null,
  recipient_name text not null,
  recipient_gender text,
  role_name      text not null,
  unit_name      text,
  council_type   text,
  body           text not null,
  -- تصميمُ البطاقة كما اختاره المرسل — توأمُ `IrfanLook` في `lib/irfan/card.ts`
  look           text not null default 'letter',
  created_at     timestamptz not null default now(),
  read_at        timestamptz,
  reported_at    timestamptz,
  report_note    text,
  constraint irfan_messages_once unique (season_id, sender_id, recipient_id),
  constraint irfan_messages_not_self check (sender_id <> recipient_id),
  -- الحدُّ الأدنى للرسالة كلِّها؛ والتطبيقُ يقيس ما بعد الافتتاحيّة (`lib/irfan/vocab.ts`)
  constraint irfan_messages_body_len check (char_length(btrim(body)) between 40 and 500),
  constraint irfan_messages_look check (look in ('letter', 'aurora')),
  constraint irfan_messages_note_len check (report_note is null or char_length(report_note) <= 300)
);
create index irfan_messages_recipient on public.irfan_messages (recipient_id, created_at desc);
create index irfan_messages_sender on public.irfan_messages (sender_id, created_at desc);
comment on table public.irfan_messages is
  'رسائلُ «عِرفان». يقرؤها مرسلُها ومستلمُها وحدهما، والمُبلَّغُ عنها يراها الرئيسان. لا كتابةَ من المتصفّح: الإرسالُ بـ`send_irfan`.';

alter table public.irfan_seasons enable row level security;
alter table public.irfan_messages enable row level security;

-- ── من هو رئيس؟ (الرئيسان: رئيسُ أدِيب والرئيسُ التنفيذيّ) ──────────────────
create or replace function public.irfan_is_president(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user and ur.is_active
      and ur.role_name in ('club_president', 'executive_council_president')
  );
$$;
-- تُقرأ داخل سياسة القراءة أدناه، فتحتاج المنحَ لكلّ دورٍ تنطبق عليه السياسة
grant execute on function public.irfan_is_president(uuid) to authenticated;

create policy irfan_seasons_read on public.irfan_seasons
  for select to authenticated using (true);

create policy irfan_messages_read on public.irfan_messages
  for select to authenticated
  using (
    auth.uid() in (sender_id, recipient_id)
    or (reported_at is not null and public.irfan_is_president(auth.uid()))
  );

grant select on public.irfan_seasons, public.irfan_messages to authenticated;
revoke insert, update, delete on public.irfan_seasons, public.irfan_messages from anon, authenticated;

-- ── الموسمُ المفتوح الآن (أو لا شيء) ────────────────────────────────────────
create or replace function public.irfan_open_season()
returns table (id integer, title text, opens_at timestamptz, closes_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id, s.title, s.opens_at, s.closes_at
  from public.irfan_seasons s
  where now() >= s.opens_at and now() < s.closes_at
  order by s.opens_at desc
  limit 1;
$$;
-- تقرؤه البوّابةُ لتعرف أتعرض بابَ الكتابة أم لا
grant execute on function public.irfan_open_season() to authenticated;

-- ── قادةُ المجلسين الآن: مقعدٌ واحدٌ لكلّ شخص، أرفعُ ما يشغل ────────────────
create or replace function public.irfan_leaders()
returns table (
  user_id uuid, full_name text, gender text, avatar_url text,
  role_name text, unit_name text, council_type text, role_level integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select distinct on (ur.user_id)
    ur.user_id, p.full_name, p.gender, p.avatar_url,
    r.role_name, coalesce(c.committee_name_ar, d.name_ar), r.council_type, r.role_level
  from public.user_roles ur
  join public.roles r on r.role_name = ur.role_name
  join public.profiles p on p.id = ur.user_id
  left join public.committees c on c.id = ur.committee_id
  left join public.departments d on d.id = ur.department_id
  where ur.is_active
    and r.membership_kind = 'member'
    and r.role_name <> 'adeeb_admin'
    and p.deleted_at is null
  order by ur.user_id, r.role_level desc nulls last;
$$;
-- داخليّة: تقرؤها دوالُّ عِرفان وحدها (لا منح)

-- ── من أستطيع أن أكتب له (للعضو وحده)، ومن كتبتُ له في هذا الموسم ─────────
create or replace function public.irfan_recipients()
returns table (
  user_id uuid, full_name text, gender text, avatar_url text,
  role_name text, unit_name text, council_type text, already_sent boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_self uuid := auth.uid();
  v_season integer;
begin
  if v_self is null or not public.is_adeeb_member(v_self) then
    raise exception 'عِرفان لأعضاء أدِيب.' using errcode = '42501';
  end if;
  select s.id into v_season from public.irfan_open_season() s;

  return query
  select l.user_id, l.full_name, l.gender, l.avatar_url, l.role_name, l.unit_name, l.council_type,
         exists (
           select 1 from public.irfan_messages m
           where m.season_id = v_season and m.sender_id = v_self and m.recipient_id = l.user_id
         )
  from public.irfan_leaders() l
  where l.user_id <> v_self
  order by l.role_level desc nulls last, l.full_name;
end;
$$;
grant execute on function public.irfan_recipients() to authenticated;

-- ── الإرسال ────────────────────────────────────────────────────────────────
create or replace function public.send_irfan(p_recipient uuid, p_body text, p_look text default 'letter')
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_self uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
  v_season record;
  v_leader record;
  v_sender_name text;
  v_id bigint;
begin
  if v_self is null or not public.is_adeeb_member(v_self) then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  select * into v_season from public.irfan_open_season();
  if v_season.id is null then
    return jsonb_build_object('ok', false, 'code', 'CLOSED');
  end if;
  if p_recipient = v_self then
    return jsonb_build_object('ok', false, 'code', 'SELF');
  end if;
  select * into v_leader from public.irfan_leaders() l where l.user_id = p_recipient;
  if v_leader.user_id is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_LEADER');
  end if;
  if char_length(v_body) < 40 or char_length(v_body) > 500 then
    return jsonb_build_object('ok', false, 'code', 'LENGTH');
  end if;
  if coalesce(p_look, '') not in ('letter', 'aurora') then
    return jsonb_build_object('ok', false, 'code', 'LOOK');
  end if;
  if exists (
    select 1 from public.irfan_messages m
    where m.season_id = v_season.id and m.sender_id = v_self and m.recipient_id = p_recipient
  ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY');
  end if;

  select p.full_name into v_sender_name from public.profiles p where p.id = v_self;

  insert into public.irfan_messages (
    season_id, sender_id, recipient_id, sender_name, recipient_name, recipient_gender,
    role_name, unit_name, council_type, body, look
  ) values (
    v_season.id, v_self, p_recipient, coalesce(v_sender_name, ''), coalesce(v_leader.full_name, ''),
    v_leader.gender, v_leader.role_name, v_leader.unit_name, v_leader.council_type, v_body, p_look
  ) returning id into v_id;

  -- الإشعارُ والرسالةُ ينجحان معًا أو يسقطان معًا (NOTIFICATIONS-SYSTEM §٣أ)
  perform public.notify_event(
    'irfan.received',
    jsonb_build_object('messageId', v_id, 'recipientId', p_recipient, 'senderName', v_sender_name, 'season', v_season.title),
    v_self
  );
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;
-- يناديه الإجراءُ الخادميّ بجلسة صاحبه، والفاعلُ من `auth.uid()` لا من مُدخَل
grant execute on function public.send_irfan(uuid, text, text) to authenticated;

-- ── «قُرئت» — للمستلم وحده ──────────────────────────────────────────────────
create or replace function public.mark_irfan_read(p_id bigint)
returns void
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  update public.irfan_messages
  set read_at = now()
  where id = p_id and recipient_id = auth.uid() and read_at is null;
$$;
grant execute on function public.mark_irfan_read(bigint) to authenticated;

-- ── البلاغ — للمستلم وحده، مرّةً، ويصل الرئيسين ─────────────────────────────
create or replace function public.report_irfan(p_id bigint, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_self uuid := auth.uid();
  v_hit bigint;
begin
  update public.irfan_messages
  set reported_at = now(), report_note = nullif(left(btrim(coalesce(p_note, '')), 300), '')
  where id = p_id and recipient_id = v_self and reported_at is null
  returning id into v_hit;
  if v_hit is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_YOURS');
  end if;
  perform public.notify_event('irfan.reported', jsonb_build_object('messageId', v_hit), v_self);
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.report_irfan(bigint, text) to authenticated;

-- ── من لم تصله رسالةٌ بعد في الموسم — للرئيسين وحدهما، بلا أعداد ──────────
create or replace function public.irfan_uncovered(p_season integer)
returns table (user_id uuid, full_name text, gender text, avatar_url text, role_name text, unit_name text, council_type text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.irfan_is_president(auth.uid()) then
    raise exception 'هذه للرئيسين.' using errcode = '42501';
  end if;
  return query
  select l.user_id, l.full_name, l.gender, l.avatar_url, l.role_name, l.unit_name, l.council_type
  from public.irfan_leaders() l
  where not exists (
    select 1 from public.irfan_messages m where m.season_id = p_season and m.recipient_id = l.user_id
  )
  order by l.role_level desc nulls last, l.full_name;
end;
$$;
grant execute on function public.irfan_uncovered(integer) to authenticated;

-- ── الموسمُ الأوّل: اليومُ العالميّ للمدير ──────────────────────────────────
-- أسبوعٌ بكلمة المالك: يُفتح ساعةَ تطبيق الترحيل ويُغلق نهايةَ الجمعة ٢٣ أكتوبر بتوقيت الرياض
insert into public.irfan_seasons (title, opens_at, closes_at)
values ('اليوم العالمي للمدير', now(), '2026-10-24 00:00:00+03');
