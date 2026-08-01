-- موت V1 — تسديد البندين ٧ و٨ من `V1-DEATH-CHECKLIST.md`
--
-- ═══ لماذا الآن ═══
--
-- V1 مات في 2026-08-01: adeeb.club يشير إلى Vercel، وV2 يخدمه، وGitHub Pages عُطِّل
-- وملفّ `CNAME` أُزيل. فلم يبقَ قارئٌ حيٌّ لهذين البندين — وقد كان يمنعهما
-- `news/news-detail.html` و`admin/dashboard.js`، وكلاهما لم يعد يُخدَم.
--
-- ═══ التحقّق قبل الإسقاط (لا تُسقِط بلا إثبات) ═══
--
-- جُرد المستودع كلّه (V2 + دوالّ الحافّة) في 2026-08-01 بحثًا عن كلّ عمودٍ وجدولٍ أدناه:
--
--   grep -rn "author_name|news_field_permissions|news_comments\b|available_fields|assigned_writers" \
--        v2/apps/web/src supabase/functions
--   → صفر مطابقة (عدا تعليقٍ توثيقيّ في `dashboard/news/vocab.ts` يسمّيها «مهجورة»).
--
-- و`news.status` بلا قارئ كذلك: القراءات كلّها على `workflow_status` — وآخر مستهلكٍ
-- له كان قسم «آخر الأخبار» في الهبوط، ونُقل في نفس اليوم إلى `workflow_status`
-- و`authors` (`_components/LatestNews.tsx`).
--
-- ═══ البند ٧ — ازدواج الأخبار ═══
--
-- `news.status` (ثلاثيّ) مرآةُ `news.workflow_status` (سداسيّ)، يزامنهما تريغر في
-- **اتّجاهين** فأيّهما كُتب اشتُقّ منه الآخر. و`news.author_name` مرآةُ `authors[1]`.
-- مصدران لمعنًى واحد، والمزامنة تُخفي التناقض بدل أن تكشفه.
--
-- ═══ البند ٨ — المهجور الذي لم يُستعمل قطّ ═══
--
-- ثلاثة مصادر لمعنى «أيّ الحقول يملك الكاتب؟» — قصرتها منصّة V2 على مصدرٍ واحد
-- (`news_writer_assignments.assigned_fields`). وجدولُ تعليقاتٍ كرّره
-- `news_public_comments`. كلّها **صفر صفوف** ولم تُقرأ ولم تُكتب قطّ.
--
-- ═══ ملاحظة على أسلوب الإسقاط ═══
--
-- **بلا `cascade` عمدًا.** لو بقي في القاعدة تابعٌ خفيّ (سياسة RLS · فهرس · عرض)
-- يشير إلى عمودٍ من هذه، فليَفشل الترحيل صارخًا لا أن يحذف التابع صامتًا.
-- الفشل هنا معلومةٌ نريدها، لا عقبة نلتفّ عليها.

begin;

/* ══ البند ٧: العمودان المرآتان وتريغراهما ═══════════════════════════ */

drop trigger if exists news_sync_status on public.news;
drop trigger if exists news_sync_author_name on public.news;

drop function if exists public.news_sync_status();
drop function if exists public.news_sync_author_name();

alter table public.news
  drop column if exists status,
  drop column if exists author_name;

/* ══ البند ٨: الجداول والأعمدة المهجورة ══════════════════════════════ */

drop table if exists public.news_field_permissions;
drop table if exists public.news_comments;

alter table public.news
  drop column if exists available_fields,
  drop column if exists assigned_writers,
  drop column if exists assigned_by,
  drop column if exists assigned_at;

commit;

-- ═══ التحقّق بعد التنفيذ ═══
--
-- ١) لم يبقَ عمودٌ من الستّة:
--
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'news'
--      and column_name in ('status','author_name','available_fields',
--                          'assigned_writers','assigned_by','assigned_at');
--   → صفر صفوف.
--
-- ٢) لم يبقَ جدولٌ من الاثنين:
--
--   select tablename from pg_tables
--    where schemaname = 'public' and tablename in ('news_field_permissions','news_comments');
--   → صفر صفوف.
--
-- ٣) الأخبار المنشورة كما هي (البصمة قبل/بعد يجب أن تتطابق):
--
--   select count(*) from public.news where workflow_status = 'published';
--   → ١٤ (بصمة 2026-08-01).
