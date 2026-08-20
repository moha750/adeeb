-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260318063507   الاسم: fix_today_stats_timezone


CREATE OR REPLACE FUNCTION public.get_today_visits_stats()
 RETURNS TABLE(total_visits bigint, unique_visitors bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    today_start TIMESTAMPTZ;
BEGIN
    -- استخدام توقيت السعودية (UTC+3) لتحديد بداية اليوم بدقة
    today_start := date_trunc('day', NOW() AT TIME ZONE 'Asia/Riyadh') AT TIME ZONE 'Asia/Riyadh';
    
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_visits,
        COUNT(DISTINCT visitor_id)::BIGINT as unique_visitors
    FROM public.site_visits
    WHERE visited_at >= today_start;
END;
$function$;

