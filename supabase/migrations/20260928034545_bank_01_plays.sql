-- «بنك أدِيب» — ركن بنك الأسئلة في معرض اليوم الوطني (٢٠٢٦-٠٩-٢٨)
-- صفٌّ لكلّ زائرٍ أدخل اسمه: لغتُه واسمُه والمستوى والسؤال وإجابتُه والنتيجة.
-- الصفحةُ تكتب عبر الدالّة وحدها (مفتاحُ النشر العامّ)، ولا يقرأ الجدولَ إلّا الخادم.
-- المعرّفُ يولَّد في الجهاز، فإعادةُ الإرسال بعد انقطاع الشبكة لا تُكرِّر الصفّ.
--
-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-٠٩-٢٨ فجرًا (باسم `bank_01_plays`).

begin;

create table if not exists public.bank_plays (
  id           uuid primary key,
  played_at    timestamptz not null,
  received_at  timestamptz not null default now(),
  lang         text not null check (lang in ('ar','en')),
  name         text not null check (char_length(name) between 1 and 40),
  level        text check (level in ('easy','medium','hard')),
  question     text check (char_length(question) <= 300),
  answer       text check (char_length(answer) <= 200),
  correct      text check (char_length(correct) <= 200),
  result       text not null check (result in ('correct','wrong','timeout','abandoned')),
  ref          text check (char_length(ref) <= 12)
);
alter table public.bank_plays enable row level security;
revoke all on table public.bank_plays from public, anon, authenticated;

create or replace function public.bank_log_play(p jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into bank_plays (id, played_at, lang, name, level, question, answer, correct, result, ref)
  values (
    (p->>'id')::uuid,
    coalesce((p->>'playedAt')::timestamptz, now()),
    p->>'lang',
    left(btrim(p->>'name'), 40),
    nullif(p->>'level', ''),
    left(p->>'question', 300),
    left(p->>'answer', 200),
    left(p->>'correct', 200),
    p->>'result',
    left(p->>'ref', 12)
  )
  on conflict (id) do nothing;
end;
$$;
revoke all on function public.bank_log_play(jsonb) from public;
grant execute on function public.bank_log_play(jsonb) to anon, authenticated;

commit;
