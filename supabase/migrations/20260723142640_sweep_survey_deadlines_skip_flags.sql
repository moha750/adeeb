-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260723142640   الاسم: sweep_survey_deadlines_skip_flags

CREATE OR REPLACE FUNCTION public.sweep_survey_deadlines()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_closed integer := 0;
BEGIN
    UPDATE surveys
       SET status    = 'closed',
           closed_at = end_date
     WHERE status = 'active'
       AND end_date IS NOT NULL
       AND end_date < now()
       AND archived_at IS NULL
       AND deleted_at IS NULL;
    GET DIAGNOSTICS v_closed = ROW_COUNT;
    RETURN v_closed;
END;
$function$;
