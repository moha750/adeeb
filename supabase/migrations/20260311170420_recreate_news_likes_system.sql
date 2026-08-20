-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260311170420   الاسم: recreate_news_likes_system

-- إنشاء جدول news_likes جديد بتصميم محسّن
CREATE TABLE IF NOT EXISTS public.news_likes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id uuid NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_identifier text,
  created_at timestamptz DEFAULT now(),
  
  -- التأكد من أن كل مستخدم/زائر يمكنه الإعجاب مرة واحدة فقط
  CONSTRAINT news_likes_unique_user UNIQUE (news_id, user_id),
  CONSTRAINT news_likes_unique_guest UNIQUE (news_id, guest_identifier),
  
  -- التأكد من وجود إما user_id أو guest_identifier
  CONSTRAINT news_likes_user_or_guest CHECK (
    (user_id IS NOT NULL AND guest_identifier IS NULL) OR
    (user_id IS NULL AND guest_identifier IS NOT NULL)
  )
);

-- إنشاء فهرس لتسريع الاستعلامات
CREATE INDEX IF NOT EXISTS idx_news_likes_news_id ON public.news_likes(news_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_user_id ON public.news_likes(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_news_likes_guest_identifier ON public.news_likes(guest_identifier) WHERE guest_identifier IS NOT NULL;

-- تفعيل RLS
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;

-- سياسة القراءة: الجميع يمكنهم قراءة الإعجابات
CREATE POLICY "Anyone can view news likes"
  ON public.news_likes
  FOR SELECT
  USING (true);

-- سياسة الإضافة: الجميع يمكنهم إضافة إعجاب
CREATE POLICY "Anyone can add news like"
  ON public.news_likes
  FOR INSERT
  WITH CHECK (true);

-- سياسة الحذف: المستخدمون المسجلون يمكنهم حذف إعجاباتهم فقط
CREATE POLICY "Users can delete their own likes"
  ON public.news_likes
  FOR DELETE
  USING (
    (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
    (auth.uid() IS NULL)
  );

-- إضافة تعليق على الجدول
COMMENT ON TABLE public.news_likes IS 'جدول إعجابات الأخبار - نظام محسّن يمنع التكرار';
COMMENT ON COLUMN public.news_likes.user_id IS 'معرف المستخدم المسجل';
COMMENT ON COLUMN public.news_likes.guest_identifier IS 'معرف فريد للزائر غير المسجل';
