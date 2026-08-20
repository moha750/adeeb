-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260311143300   الاسم: create_toggle_like_function


-- إنشاء دالة PostgreSQL لتبديل الإعجاب بشكل آمن
CREATE OR REPLACE FUNCTION toggle_news_like(
  p_news_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_guest_identifier TEXT DEFAULT NULL
)
RETURNS TABLE(action TEXT, likes_count BIGINT) AS $$
DECLARE
  v_exists BOOLEAN;
  v_count BIGINT;
BEGIN
  -- التحقق من وجود الإعجاب
  IF p_user_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM news_likes 
      WHERE news_id = p_news_id AND user_id = p_user_id
    ) INTO v_exists;
  ELSE
    SELECT EXISTS(
      SELECT 1 FROM news_likes 
      WHERE news_id = p_news_id AND guest_identifier = p_guest_identifier
    ) INTO v_exists;
  END IF;

  -- تبديل الإعجاب
  IF v_exists THEN
    -- حذف الإعجاب
    IF p_user_id IS NOT NULL THEN
      DELETE FROM news_likes 
      WHERE news_id = p_news_id AND user_id = p_user_id;
    ELSE
      DELETE FROM news_likes 
      WHERE news_id = p_news_id AND guest_identifier = p_guest_identifier;
    END IF;
    action := 'removed';
  ELSE
    -- إضافة الإعجاب
    INSERT INTO news_likes (news_id, user_id, guest_identifier)
    VALUES (p_news_id, p_user_id, p_guest_identifier)
    ON CONFLICT DO NOTHING;
    action := 'added';
  END IF;

  -- جلب العدد الإجمالي
  SELECT COUNT(*) INTO v_count
  FROM news_likes
  WHERE news_id = p_news_id;

  likes_count := v_count;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION toggle_news_like TO authenticated, anon;

