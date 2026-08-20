-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260718195128   الاسم: auto_close_expired_surveys

-- كنسٌ دوريّ يُغلق الاستبيان الحيّ الذي انقضت مدّته (نظير sweep_election_deadlines للانتخابات).
-- closed_at = end_date لا now(): لحظة الإغلاق الحقيقيّة هي انقضاء المدّة (حيث تُقفل بوّابة 'ended'
-- في submit_survey_response)، فيبقى الختم دقيقًا ولو تأخّر الكنس. النطاق: active وحده — المتوقّف
-- (paused) حجْزٌ متعمَّد من المدير فلا يُغلَق تلقائيًّا.
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
       AND end_date < now();
    GET DIAGNOSTICS v_closed = ROW_COUNT;
    RETURN v_closed;
END;
$function$;

SELECT cron.schedule('surveys-sweep-deadlines', '* * * * *', 'SELECT public.sweep_survey_deadlines();');
