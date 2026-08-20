-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260728053000   الاسم: radio_sweep_schedule

-- كنسُ مواعيد الإذاعة — على نمط `sweep_election_deadlines` و`sweep_survey_deadlines` حرفيًّا.
--
-- لماذا كنسٌ لا شرطٌ في سياسة القراءة: لو قرأنا «مجدولةً حان وقتها» على أنّها منشورة،
-- لصار للحقيقة مصدران يجب أن يتّفقا (الحالة، والوقت) — وتقرأ اللوحة «مجدولة» بينما
-- العالم يسمعها. الكنس يجعل الحالة **صادقةً بذاتها**: حان الوقت ⟺ صارت منشورة.

create or replace function public.sweep_radio_schedule()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_count integer;
begin
  update public.radio_episodes
     set status       = 'published',
         published_at = coalesce(published_at, publish_at, now()),
         publish_at   = null,
         updated_at   = now()
   where status = 'scheduled'
     and publish_at is not null
     and publish_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.sweep_radio_schedule() is
  'ينشر الحلقات المجدولة التي حان موعدها — يعمل كلّ دقيقة عبر pg_cron (radio-sweep-schedule)';

select cron.schedule(
  'radio-sweep-schedule',
  '* * * * *',
  $$SELECT public.sweep_radio_schedule();$$
);
