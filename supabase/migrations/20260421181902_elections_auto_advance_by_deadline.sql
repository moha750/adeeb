-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260421181902   الاسم: elections_auto_advance_by_deadline

-- تحويل تلقائي لحالة الانتخاب عند انتهاء المواعيد
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.auto_advance_elections_by_deadline()
RETURNS TABLE(candidacy_closed_count INT, voting_closed_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidacy_closed INT := 0;
    v_voting_closed    INT := 0;
BEGIN
    WITH updated AS (
        UPDATE elections
        SET status = 'candidacy_closed',
            updated_at = now()
        WHERE status = 'candidacy_open'
          AND candidacy_end IS NOT NULL
          AND candidacy_end <= now()
        RETURNING id
    )
    SELECT COUNT(*)::INT INTO v_candidacy_closed FROM updated;

    WITH updated AS (
        UPDATE elections
        SET status = 'voting_closed',
            updated_at = now()
        WHERE status = 'voting_open'
          AND voting_end IS NOT NULL
          AND voting_end <= now()
        RETURNING id
    )
    SELECT COUNT(*)::INT INTO v_voting_closed FROM updated;

    candidacy_closed_count := v_candidacy_closed;
    voting_closed_count    := v_voting_closed;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_advance_elections_by_deadline() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_advance_elections_by_deadline() TO authenticated;

DO $$
BEGIN
    PERFORM cron.unschedule('auto_advance_elections_by_deadline');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
    'auto_advance_elections_by_deadline',
    '* * * * *',
    $cron$ SELECT public.auto_advance_elections_by_deadline(); $cron$
);
