-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260311165500   الاسم: drop_and_recreate_toggle_news_like_function

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS toggle_news_like(UUID, UUID, TEXT);

-- Create a PostgreSQL function to atomically toggle news likes
-- This prevents all race conditions and conflicts
CREATE OR REPLACE FUNCTION toggle_news_like(
  p_news_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_guest_identifier TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_like_exists BOOLEAN;
  v_like_id UUID;
  v_total_likes INTEGER;
  v_action TEXT;
BEGIN
  -- Validate input: either user_id or guest_identifier must be provided
  IF (p_user_id IS NULL AND p_guest_identifier IS NULL) THEN
    RAISE EXCEPTION 'Either user_id or guest_identifier must be provided';
  END IF;

  IF (p_user_id IS NOT NULL AND p_guest_identifier IS NOT NULL) THEN
    RAISE EXCEPTION 'Only one of user_id or guest_identifier should be provided';
  END IF;

  -- Check if like exists
  IF p_user_id IS NOT NULL THEN
    SELECT id INTO v_like_id
    FROM news_likes
    WHERE news_id = p_news_id AND user_id = p_user_id;
  ELSE
    SELECT id INTO v_like_id
    FROM news_likes
    WHERE news_id = p_news_id AND guest_identifier = p_guest_identifier;
  END IF;

  v_like_exists := v_like_id IS NOT NULL;

  -- Toggle the like
  IF v_like_exists THEN
    -- Remove the like
    DELETE FROM news_likes WHERE id = v_like_id;
    v_action := 'removed';
  ELSE
    -- Add the like
    INSERT INTO news_likes (news_id, user_id, guest_identifier)
    VALUES (p_news_id, p_user_id, p_guest_identifier)
    ON CONFLICT DO NOTHING; -- Safety net
    v_action := 'added';
  END IF;

  -- Get total likes count
  SELECT COUNT(*) INTO v_total_likes
  FROM news_likes
  WHERE news_id = p_news_id;

  -- Return result
  RETURN json_build_object(
    'action', v_action,
    'liked', NOT v_like_exists,
    'total_likes', v_total_likes
  );
END;
$$;
