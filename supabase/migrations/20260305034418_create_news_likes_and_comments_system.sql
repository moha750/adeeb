-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260305034418   الاسم: create_news_likes_and_comments_system

-- جدول إعجابات الأخبار
CREATE TABLE IF NOT EXISTS public.news_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_identifier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT news_likes_unique_user UNIQUE NULLS NOT DISTINCT (news_id, user_id),
  CONSTRAINT news_likes_unique_guest UNIQUE NULLS NOT DISTINCT (news_id, guest_identifier),
  CONSTRAINT news_likes_check_identity CHECK (
    (user_id IS NOT NULL AND guest_identifier IS NULL) OR 
    (user_id IS NULL AND guest_identifier IS NOT NULL)
  )
);

COMMENT ON TABLE public.news_likes IS 'جدول إعجابات الأخبار - يدعم المستخدمين المسجلين والزوار';
COMMENT ON COLUMN public.news_likes.user_id IS 'معرف المستخدم المسجل (إذا كان لديه حساب)';
COMMENT ON COLUMN public.news_likes.guest_identifier IS 'معرف فريد للزائر (بدون حساب) - يتم توليده من المتصفح';

-- جدول تعليقات الأخبار (للزوار والأعضاء)
CREATE TABLE IF NOT EXISTS public.news_public_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id UUID NOT NULL REFERENCES public.news(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_name TEXT,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT news_public_comments_check_identity CHECK (
    (user_id IS NOT NULL AND guest_name IS NULL) OR 
    (user_id IS NULL AND guest_name IS NOT NULL)
  )
);

COMMENT ON TABLE public.news_public_comments IS 'تعليقات الأخبار العامة - يمكن للزوار والأعضاء التعليق';
COMMENT ON COLUMN public.news_public_comments.user_id IS 'معرف المستخدم المسجل (إذا كان لديه حساب)';
COMMENT ON COLUMN public.news_public_comments.guest_name IS 'اسم الزائر (إذا لم يكن لديه حساب)';
COMMENT ON COLUMN public.news_public_comments.is_approved IS 'هل التعليق معتمد للعرض (للتحكم بالمحتوى)';

-- جدول إعجابات التعليقات
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.news_public_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  guest_identifier TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT comment_likes_unique_user UNIQUE NULLS NOT DISTINCT (comment_id, user_id),
  CONSTRAINT comment_likes_unique_guest UNIQUE NULLS NOT DISTINCT (comment_id, guest_identifier),
  CONSTRAINT comment_likes_check_identity CHECK (
    (user_id IS NOT NULL AND guest_identifier IS NULL) OR 
    (user_id IS NULL AND guest_identifier IS NOT NULL)
  )
);

COMMENT ON TABLE public.comment_likes IS 'جدول إعجابات التعليقات - يدعم المستخدمين المسجلين والزوار';

-- إنشاء الفهارس لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_news_likes_news_id ON public.news_likes(news_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_user_id ON public.news_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_guest_identifier ON public.news_likes(guest_identifier);

CREATE INDEX IF NOT EXISTS idx_news_public_comments_news_id ON public.news_public_comments(news_id);
CREATE INDEX IF NOT EXISTS idx_news_public_comments_user_id ON public.news_public_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_news_public_comments_is_approved ON public.news_public_comments(is_approved);
CREATE INDEX IF NOT EXISTS idx_news_public_comments_created_at ON public.news_public_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_id ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_id ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_guest_identifier ON public.comment_likes(guest_identifier);

-- تفعيل RLS
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_public_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- سياسات RLS لجدول news_likes
CREATE POLICY "الجميع يمكنهم قراءة الإعجابات" ON public.news_likes
  FOR SELECT USING (true);

CREATE POLICY "المستخدمون المسجلون يمكنهم إضافة إعجاب" ON public.news_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id OR guest_identifier IS NOT NULL);

CREATE POLICY "المستخدمون يمكنهم حذف إعجاباتهم" ON public.news_likes
  FOR DELETE USING (auth.uid() = user_id);

-- سياسات RLS لجدول news_public_comments
CREATE POLICY "الجميع يمكنهم قراءة التعليقات المعتمدة" ON public.news_public_comments
  FOR SELECT USING (is_approved = true OR auth.uid() = user_id);

CREATE POLICY "الجميع يمكنهم إضافة تعليق" ON public.news_public_comments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "المستخدمون يمكنهم تحديث تعليقاتهم" ON public.news_public_comments
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم حذف تعليقاتهم" ON public.news_public_comments
  FOR DELETE USING (auth.uid() = user_id);

-- سياسات RLS لجدول comment_likes
CREATE POLICY "الجميع يمكنهم قراءة إعجابات التعليقات" ON public.comment_likes
  FOR SELECT USING (true);

CREATE POLICY "المستخدمون يمكنهم إضافة إعجاب للتعليق" ON public.comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id OR guest_identifier IS NOT NULL);

CREATE POLICY "المستخدمون يمكنهم حذف إعجاباتهم للتعليقات" ON public.comment_likes
  FOR DELETE USING (auth.uid() = user_id);

-- إضافة عمود likes_count لجدول news لتخزين عدد الإعجابات
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- دالة لتحديث عدد الإعجابات تلقائياً
CREATE OR REPLACE FUNCTION update_news_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.news 
    SET likes_count = likes_count + 1 
    WHERE id = NEW.news_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.news 
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.news_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث عدد الإعجابات
DROP TRIGGER IF EXISTS trigger_update_news_likes_count ON public.news_likes;
CREATE TRIGGER trigger_update_news_likes_count
AFTER INSERT OR DELETE ON public.news_likes
FOR EACH ROW EXECUTE FUNCTION update_news_likes_count();

-- دالة لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger لتحديث updated_at للتعليقات
DROP TRIGGER IF EXISTS trigger_update_comments_updated_at ON public.news_public_comments;
CREATE TRIGGER trigger_update_comments_updated_at
BEFORE UPDATE ON public.news_public_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
