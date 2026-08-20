-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260804060259   الاسم: my_sessions_reader

-- **جلساتُك أنت** — قارئٌ واحدٌ لتبويب الإعدادات (٢٠٢٦-٠٨-٠٤).
--
-- `auth.sessions` خارج مخطّطات واجهة البيانات، فلا يبلغه عميلٌ عاديّ. وهذه الدالّة بابُه
-- **الوحيد والمقيَّد**: `SECURITY DEFINER` تقرأ صفوفَ `auth.uid()` لا غير — فلا معاملَ يُمرَّر
-- ولا مدًى يتّسع بتبديل وسيط. ومن ناداها بمفتاح الخدمة (حيث `auth.uid()` فارغة) خرج بلا صفوف،
-- فهي تُنادى بجلسة صاحبها لا بمفتاحٍ يتجاوز الحراسة.
--
-- ولا تُعيد شيئًا يُستعمَل في مصادقة: لا رموزَ ولا مفاتيح تحديث — وصفُ جهازٍ وزمنُه وعنوانُه.
create or replace function public.my_sessions()
returns table (
  id uuid,
  created_at timestamptz,
  last_seen timestamptz,
  user_agent text,
  ip text
)
language sql
stable
security definer
set search_path to 'auth', 'public'
as $$
  select
    s.id,
    s.created_at,
    -- `refreshed_at` بلا منطقةٍ زمنيّة في GoTrue؛ يُقرأ UTC كسائر أعمدة الزمن عندنا
    coalesce(s.refreshed_at at time zone 'UTC', s.created_at) as last_seen,
    s.user_agent,
    host(s.ip) as ip
  from auth.sessions s
  where s.user_id = auth.uid()
  order by coalesce(s.refreshed_at at time zone 'UTC', s.created_at) desc
$$;

revoke all on function public.my_sessions() from public, anon;
grant execute on function public.my_sessions() to authenticated;

comment on function public.my_sessions() is
  'جلسات صاحب الجلسة نفسه (auth.sessions) — لتبويب الإعدادات. لا تُعيد رموزًا، ولا تقرأ لغير auth.uid().';
