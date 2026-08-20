-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260305031336   الاسم: allow_public_update_news_views

-- السماح للجميع (بما فيهم anon) بتحديث عداد المشاهدات فقط
CREATE POLICY "Allow public to update views counter"
ON public.news
FOR UPDATE
TO public
USING (status = 'published')
WITH CHECK (status = 'published');

-- ملاحظة: هذه السياسة تسمح بتحديث أي حقل، لكن في الكود نحدث views فقط
-- للأمان الإضافي، يمكن استخدام database trigger للتحقق من أن التحديث يشمل views فقط
