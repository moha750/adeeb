-- اللجانُ التي يملك الفاعلُ مهامَّها — تقرؤها شاشةُ اللوحة لترسم غرفتَه.
--
-- **ولمَ دالّةٌ ولا يُحسَب في الشاشة؟** لأنّ الحكمَ واحدٌ: هي نفسُها `can_manage_tasks_of` التي
-- تحرس الكتابة. ولو نُسخ الشرطُ في TypeScript لَافترق يومًا عن حارسه، فرأى القائدُ في الشاشة
-- ما تردّه القاعدةُ عند الضغط.
--
-- وتأخذ الفاعلَ مُدخَلًا لأنّ الشاشة تقرأ بمفتاح الخدمة (لا جلسةَ في ذلك النداء) — **ولذلك
-- يُنزَع عنها حقُّ النداء من الخارج فورًا**، على القاعدة التي أرستها ثغرةُ `p_actor` في اليوم
-- نفسه: مُدخَلُ فاعلٍ + بابٌ مفتوح = انتحال.
create or replace function public.task_committees_of(p_actor uuid)
returns setof integer
language sql stable security definer set search_path to 'public'
as $$
  select c.id from committees c
  where can_manage_tasks_of(p_actor, c.id);
$$;

comment on function public.task_committees_of(uuid) is
  'اللجانُ التي يملك هذا الفاعلُ مهامَّها — قراءةٌ لشاشة اللوحة. تأخذ الفاعلَ مُدخَلًا فلا تُنادى إلّا بمفتاح الخدمة.';

revoke execute on function public.task_committees_of(uuid) from public, anon, authenticated;
