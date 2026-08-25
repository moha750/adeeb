-- ديبو — طبعُه يصير له تاريخٌ ورجعة (م٩)
--
-- ✅ طُبِّق على الإنتاج ٢٠٢٦-٠٨-٢٥ بإذن المالك.
--
-- ## العلّة
-- م٨ أنزل الطبعَ إلى صفٍّ واحدٍ (`id = 1`) تحرّره اللوحة، وما يُكتب فيه يقوله ديبو
-- للناس في اللحظة: لا نشرَ بعده ولا مراجعة. والصفُّ الواحد يُدهَس: تعديلٌ سيّئٌ يمحو
-- سابقَه بلا أثر، فلا تُردّ نبرةُ أمسِ إلّا بأن تُكتب من الذاكرة أربعةَ آلاف حرف.
-- فهذا سجلُّه: **لقطةٌ للقديم عند كلّ تعديل**، والرجعةُ تحديثٌ عاديٌّ من لقطة.
--
-- ## ولمَ في القاعدة لا في التطبيق
-- لو كانت اللقطةُ سطرًا في `savePersona` لَنسيها أوّلُ بابٍ يُفتح بعده (سطرُ أوامر،
-- استعادةٌ، ترحيلٌ آخر). والمُطلِقُ `before update` لا يُنسى: من غيّر الصفَّ بأيّ باب
-- تُؤخَذ لقطتُه.
--
-- ## وحدُّ الاحتفاظ خمسون
-- الطبعُ يُحرَّر بيدٍ لا بآلة، فخمسون تعديلًا تسبق أوّلَ حاجةٍ إلى الأقدم. والقصُّ في
-- المُطلِق نفسِه فلا مهمّةَ دوريّةً تُنسى.

begin;

-- ═══ (١) السجلّ ════════════════════════════════════════════════════════════
create table if not exists public.deebo_persona_history (
  id                  bigserial primary key,
  -- لحظةُ اللقطة: **وقتُ آخرِ تعديلٍ للنسخة المحفوظة** لا وقتُ الاستبدال، فالسطرُ
  -- يقول «هذا ما كان قائمًا منذ ذلك الحين».
  at                  timestamptz not null default now(),
  changed_by          uuid references auth.users(id) on delete set null,
  identity            text not null,
  tone                text not null,
  boundaries          text not null,
  prohibitions        text[] not null default '{}',
  unknown_answer      text not null,
  suggested_questions text[] not null default '{}',
  shown_questions     smallint not null default 4
);

comment on table public.deebo_persona_history is
  'لقطاتُ طبع ديبو قبل كلّ تعديل — بابُ الرجعة حين يخيب تعديل.';

create index if not exists deebo_persona_history_at on public.deebo_persona_history (at desc);

-- ═══ (٢) الحراسة — من يملك الطبعَ يملك تاريخَه ═════════════════════════════
-- ولا قراءةَ للعموم ههنا (بخلاف الصفّ الحيّ): النسخُ المتروكةُ ليست ما يقوله ديبو اليوم،
-- وعرضُها للزائر يخلط ما كان بما هو كائن.
alter table public.deebo_persona_history enable row level security;

drop policy if exists deebo_persona_history_read on public.deebo_persona_history;
create policy deebo_persona_history_read on public.deebo_persona_history
  for select to authenticated
  using (check_user_permission((select auth.uid()), 'manage_deebo'));

grant select on public.deebo_persona_history to authenticated;
-- ولا إدراجَ ولا حذفَ من متصفّح: المُطلِقُ وحدَه يكتب، والقصُّ بيده.

-- ═══ (٣) اللقطةُ عند كلّ تعديل ══════════════════════════════════════════════
create or replace function public.deebo_persona_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deebo_persona_history
    (at, changed_by, identity, tone, boundaries, prohibitions, unknown_answer, suggested_questions, shown_questions)
  values
    (old.updated_at, old.updated_by, old.identity, old.tone, old.boundaries,
     old.prohibitions, old.unknown_answer, old.suggested_questions, old.shown_questions);

  -- القصُّ إلى خمسين: أقدمُ ما زاد يذهب في المعاملة نفسِها.
  delete from public.deebo_persona_history
  where id in (
    select id from public.deebo_persona_history order by at desc, id desc offset 50
  );

  return new;
end;
$$;

comment on function public.deebo_persona_snapshot() is
  'يحفظ الطبعَ القديمَ قبل استبداله، ويُبقي آخرَ خمسين لقطة.';

-- ولا تُنادى الدالّةُ من واجهة الويب: المُطلِقُ يشغّلها بصلاحيّة مالك الجدول، وبقاؤها
-- مأذونةً للعموم يفتح `/rest/v1/rpc` على دالّة `security definer` بلا داعٍ (أمسكه مدقّقُ
-- Supabase بعد التطبيق، ونزل في `deebo_09b`).
revoke execute on function public.deebo_persona_snapshot() from public, anon, authenticated;

drop trigger if exists deebo_persona_snapshot on public.deebo_persona;
create trigger deebo_persona_snapshot
  before update on public.deebo_persona
  for each row execute function public.deebo_persona_snapshot();

commit;
