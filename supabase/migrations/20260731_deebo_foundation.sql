-- ديبو — أساس المساعد (م٠)
-- مبادئ مفروضة بالمخطّط لا بالاتّفاق:
--   ١) لا مفتاح خدمة في مسار ديبو — كلّ كتابةٍ نظاميّة عبر دالّة SECURITY DEFINER ضيّقة
--      يستدعيها الخادم بعميل الطلب نفسه (زائرٌ بلا جلسة = anon). لا سياسة INSERT لأحد.
--   ٢) جدول المعرفة للهويّة الثابتة فقط — لا رقمٍ متغيّر (أعضاء · فعاليّات · لجان).
--      المتغيّر يُشتق من القاعدة لحظة السؤال. لا نسخة ⟵ لا تعفّن.
--   ٣) المعرفة المنتهية تُخرَس ولا تُسمّم: منظور الطزاجة يُسقطها من السياق آليًّا.
--   ٤) سجلّ الفشل منظورٌ لا جدول — لا نسخة ثانية لحقيقةٍ موجودة.

-- ═══════════════════════════ ١ · الإعدادات ومفتاح الإطفاء ═══════════════════════════

create table if not exists public.deebo_settings (
  id                smallint primary key default 1 check (id = 1),
  is_enabled        boolean  not null default true,
  daily_cap         integer  not null default 800,   -- سقف الطلبات العامّ/يوم (حماية الحصّة المجانيّة)
  per_key_daily     integer  not null default 40,
  per_key_minute    integer  not null default 6,
  max_output_tokens integer  not null default 600,   -- يحمي الحصّة وحدَّ مدّة التنفيذ معًا
  offline_notice    text     not null default 'ديبو يرتاح قليلًا الآن — عُد بعد حين، أو تصفّح الأسئلة الشائعة.',
  suggestions       text[]   not null default '{}',
  updated_at        timestamptz not null default now()
);

insert into public.deebo_settings (id) values (1) on conflict (id) do nothing;

alter table public.deebo_settings enable row level security;

create policy deebo_settings_read on public.deebo_settings
  for select using (true);
create policy deebo_settings_write on public.deebo_settings
  for update using (check_user_permission(auth.uid(), 'manage_website'))
           with check (check_user_permission(auth.uid(), 'manage_website'));

-- ═══════════════════════════ ٢ · المعرفة (الهويّة الثابتة) ═══════════════════════════

create table if not exists public.deebo_knowledge (
  id           bigserial primary key,
  slug         text not null unique,                  -- معرّفٌ مستقرّ يُستشهد به في الجواب
  title        text not null,
  body         text not null check (char_length(body) <= 1200),
  scopes       text[] not null default '{public,deebo,dashboard}',
  source_url   text,
  sort         integer not null default 0,
  is_active    boolean not null default true,
  -- أجل المراجعة: تجاوزُه يُخرِس المقطع تلقائيًّا (لا يُسمّم الجواب)
  verified_at  timestamptz not null default now(),
  review_every interval    not null default '180 days',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.deebo_knowledge.body is
  'هويّةٌ ثابتة فقط. أيّ رقمٍ متغيّر (عدد أعضاء · تاريخ فعاليّة) ممنوع هنا — يُشتق من القاعدة.';
comment on column public.deebo_knowledge.verified_at is
  'لا يُحدَّث مع كلّ تحرير — يُحدَّث بفعل «تمّت المراجعة» وحده، وإلّا فقد الأجلُ معناه.';

create index if not exists deebo_knowledge_active_idx
  on public.deebo_knowledge (sort, id) where is_active;

-- منظور الطزاجة: المصدر الوحيد الذي يقرؤه بناء السياق.
-- (عمودٌ محسوب مستحيلٌ هنا: now() ليست IMMUTABLE.)
create or replace view public.deebo_knowledge_fresh
  with (security_invoker = on) as
select id, slug, title, body, scopes, source_url, sort
from public.deebo_knowledge
where is_active
  and verified_at + review_every > now();

alter table public.deebo_knowledge enable row level security;

create policy deebo_knowledge_read on public.deebo_knowledge
  for select using (is_active or check_user_permission(auth.uid(), 'manage_website'));
create policy deebo_knowledge_insert on public.deebo_knowledge
  for insert with check (check_user_permission(auth.uid(), 'manage_website'));
create policy deebo_knowledge_update on public.deebo_knowledge
  for update using (check_user_permission(auth.uid(), 'manage_website'))
           with check (check_user_permission(auth.uid(), 'manage_website'));
create policy deebo_knowledge_delete on public.deebo_knowledge
  for delete using (check_user_permission(auth.uid(), 'manage_website'));

create or replace function public.deebo_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists deebo_knowledge_touch on public.deebo_knowledge;
create trigger deebo_knowledge_touch before update on public.deebo_knowledge
  for each row execute function public.deebo_touch();

-- ═══════════════════════════ ٣ · السجلّ ═══════════════════════════

create table if not exists public.deebo_chats (
  id         uuid primary key default gen_random_uuid(),
  mode       text not null check (mode in ('deebo','widget','dashboard')),
  user_id    uuid references auth.users on delete set null,
  key_hash   text not null,                -- sha256(ip + ملح خادميّ) — لا IP خامًا أبدًا
  started_at timestamptz not null default now()
);

create index if not exists deebo_chats_started_idx on public.deebo_chats (started_at desc);

create table if not exists public.deebo_messages (
  id             bigserial primary key,
  chat_id        uuid not null references public.deebo_chats on delete cascade,
  role           text not null check (role in ('user','assistant')),
  content        text not null,
  cited_slugs    text[] not null default '{}',
  -- 'unsourced_number' حجَبه الحارس · 'no_knowledge' قال لا أعلم · 'off_topic' خارج النطاق
  blocked_reason text,
  provider_id    text,
  feedback       smallint not null default 0 check (feedback between -1 and 1),
  created_at     timestamptz not null default now()
);

create index if not exists deebo_messages_chat_idx on public.deebo_messages (chat_id, id);
create index if not exists deebo_messages_gaps_idx on public.deebo_messages (created_at desc)
  where role = 'assistant' and (blocked_reason is not null or feedback = -1);

alter table public.deebo_chats    enable row level security;
alter table public.deebo_messages enable row level security;

-- لا سياسة INSERT/UPDATE/DELETE لأحد: الكتابة عبر الدوالّ أدناه حصرًا.
create policy deebo_chats_read on public.deebo_chats
  for select using (check_user_permission(auth.uid(), 'manage_website'));
create policy deebo_messages_read on public.deebo_messages
  for select using (check_user_permission(auth.uid(), 'manage_website'));

-- سجلّ الفشل: منظورٌ فوق السجلّ، لا جدولٌ يُصانُ على حدة.
create or replace view public.deebo_gaps
  with (security_invoker = on) as
select m.id,
       m.created_at,
       m.blocked_reason,
       m.feedback,
       c.mode,
       (select q.content from public.deebo_messages q
         where q.chat_id = m.chat_id and q.role = 'user' and q.id < m.id
         order by q.id desc limit 1) as question,
       m.content as answer
from public.deebo_messages m
join public.deebo_chats c on c.id = m.chat_id
where m.role = 'assistant'
  and (m.blocked_reason is not null or m.feedback = -1);

-- ═══════════════════════════ ٤ · حدّ المعدّل (ذرّيّ) ═══════════════════════════

create table if not exists public.deebo_rate (
  key_hash     text not null,
  window_start timestamptz not null,
  count        integer not null default 0,
  primary key (key_hash, window_start)
);

-- يأخذ رمزًا من الدلو أو يعيد false. ذرّيّةٌ بـon conflict — لا سباق.
create or replace function public.deebo_take_token(
  p_key text, p_window interval, p_limit integer
) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_secs  double precision := extract(epoch from p_window);
  v_start timestamptz := to_timestamp(floor(extract(epoch from now()) / v_secs) * v_secs);
  v_count integer;
begin
  insert into public.deebo_rate (key_hash, window_start, count)
  values (p_key, v_start, 1)
  on conflict (key_hash, window_start)
    do update set count = public.deebo_rate.count + 1
  returning count into v_count;

  -- كنسٌ كسولٌ للنوافذ الميّتة (١٪ من النداءات)
  if random() < 0.01 then
    delete from public.deebo_rate where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_limit;
end;
$$;

-- ═══════════════════════════ ٥ · دوالّ الكتابة (الطريق الوحيد) ═══════════════════════════

create or replace function public.deebo_start_chat(p_mode text, p_key_hash text)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if p_mode not in ('deebo','widget','dashboard') then
    raise exception 'وضعٌ غير معروف';
  end if;
  if p_key_hash is null or char_length(p_key_hash) <> 64 then
    raise exception 'بصمةٌ غير صالحة';
  end if;

  insert into public.deebo_chats (mode, user_id, key_hash)
  values (p_mode, auth.uid(), p_key_hash)
  returning id into v_id;

  -- تنظيفٌ كسول: ٩٠ يومًا حدّ الاحتفاظ
  if random() < 0.01 then
    delete from public.deebo_chats where started_at < now() - interval '90 days';
  end if;

  return v_id;
end;
$$;

create or replace function public.deebo_log(
  p_chat     uuid,
  p_role     text,
  p_content  text,
  p_slugs    text[]   default '{}',
  p_blocked  text     default null,
  p_provider text     default null
) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id bigint;
begin
  if p_role not in ('user','assistant') then
    raise exception 'دورٌ غير معروف';
  end if;
  if not exists (select 1 from public.deebo_chats where id = p_chat) then
    raise exception 'محادثةٌ غير معروفة';
  end if;

  insert into public.deebo_messages (chat_id, role, content, cited_slugs, blocked_reason, provider_id)
  values (p_chat, p_role, left(coalesce(p_content, ''), 8000),
          coalesce(p_slugs, '{}'), p_blocked, p_provider)
  returning id into v_id;

  return v_id;
end;
$$;

-- «هذا غير صحيح» — مقيَّدٌ ببصمة صاحب المحادثة كي لا يُعبَث بسجلّ غيره.
create or replace function public.deebo_feedback(
  p_message bigint, p_value smallint, p_key_hash text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_value not between -1 and 1 then
    raise exception 'قيمةٌ غير صالحة';
  end if;

  update public.deebo_messages m
     set feedback = p_value
   from public.deebo_chats c
  where m.id = p_message
    and c.id = m.chat_id
    and c.key_hash = p_key_hash
    and m.role = 'assistant';
end;
$$;

-- ═══════════════════════════ ٦ · الصلاحيّات ═══════════════════════════

grant select on public.deebo_settings, public.deebo_knowledge_fresh to anon, authenticated;
grant select on public.deebo_knowledge, public.deebo_chats, public.deebo_messages,
                public.deebo_gaps to authenticated;

grant execute on function public.deebo_take_token(text, interval, integer) to anon, authenticated;
grant execute on function public.deebo_start_chat(text, text)              to anon, authenticated;
grant execute on function public.deebo_log(uuid, text, text, text[], text, text) to anon, authenticated;
grant execute on function public.deebo_feedback(bigint, smallint, text)    to anon, authenticated;

-- جدول deebo_rate لا يُلمس مباشرةً من أحد — الدالّة وحدها (SECURITY DEFINER).
revoke all on public.deebo_rate from anon, authenticated;
alter table public.deebo_rate enable row level security;
