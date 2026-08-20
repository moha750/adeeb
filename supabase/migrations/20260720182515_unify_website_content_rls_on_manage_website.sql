-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260720182515   الاسم: unify_website_content_rls_on_manage_website


-- توحيد حَوكمة محتوى الموقع (works/achievements/sponsors/faq) على قدرة manage_website.
-- الجذر: قراءةٌ عامّة واحدة + كتابةٌ واحدة محروسة بالقدرة لكلّ جدول. تُسقَط سياسات الإرث
-- المفتوحة (any authenticated = true) التي كانت تُبطل حارس القدرة بالـOR، والمكرّرة.

/* ── works ── */
ALTER TABLE public.works ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS works_modify_authorized ON public.works;
DROP POLICY IF EXISTS works_select_public ON public.works;
DROP POLICY IF EXISTS works_select_all ON public.works;
DROP POLICY IF EXISTS "Allow public to read works" ON public.works;
DROP POLICY IF EXISTS "Allow authenticated users to insert works" ON public.works;
DROP POLICY IF EXISTS "Allow authenticated users to update works" ON public.works;
DROP POLICY IF EXISTS "Allow authenticated users to delete works" ON public.works;
CREATE POLICY works_select_public ON public.works FOR SELECT TO public USING (true);
CREATE POLICY works_write_website ON public.works FOR ALL TO authenticated
  USING (check_user_permission(auth.uid(), 'manage_website'))
  WITH CHECK (check_user_permission(auth.uid(), 'manage_website'));

/* ── achievements (كانت بلا سياسة كتابة أصلًا) ── */
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS achievements_select_all ON public.achievements;
DROP POLICY IF EXISTS achievements_select_public ON public.achievements;
DROP POLICY IF EXISTS achievements_write_website ON public.achievements;
CREATE POLICY achievements_select_public ON public.achievements FOR SELECT TO public USING (true);
CREATE POLICY achievements_write_website ON public.achievements FOR ALL TO authenticated
  USING (check_user_permission(auth.uid(), 'manage_website'))
  WITH CHECK (check_user_permission(auth.uid(), 'manage_website'));

/* ── sponsors ── */
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sponsors_modify_authorized ON public.sponsors;
DROP POLICY IF EXISTS sponsors_select_all ON public.sponsors;
DROP POLICY IF EXISTS sponsors_select_public ON public.sponsors;
DROP POLICY IF EXISTS "Allow public to read sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow authenticated users to insert sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow authenticated users to update sponsors" ON public.sponsors;
DROP POLICY IF EXISTS "Allow authenticated users to delete sponsors" ON public.sponsors;
CREATE POLICY sponsors_select_public ON public.sponsors FOR SELECT TO public USING (true);
CREATE POLICY sponsors_write_website ON public.sponsors FOR ALL TO authenticated
  USING (check_user_permission(auth.uid(), 'manage_website'))
  WITH CHECK (check_user_permission(auth.uid(), 'manage_website'));

/* ── faq ── */
ALTER TABLE public.faq ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS faq_modify_authorized ON public.faq;
DROP POLICY IF EXISTS faq_select_all ON public.faq;
DROP POLICY IF EXISTS faq_select_public ON public.faq;
CREATE POLICY faq_select_public ON public.faq FOR SELECT TO public USING (true);
CREATE POLICY faq_write_website ON public.faq FOR ALL TO authenticated
  USING (check_user_permission(auth.uid(), 'manage_website'))
  WITH CHECK (check_user_permission(auth.uid(), 'manage_website'));

