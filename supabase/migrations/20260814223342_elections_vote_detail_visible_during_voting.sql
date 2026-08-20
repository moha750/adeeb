-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814223342   الاسم: elections_vote_detail_visible_during_voting

-- تفصيلُ الأصوات يُكشف لإدارة الانتخابات **أثناء التصويت** لا بعد الأرشفة فقط (قرار المالك
-- ٢٠٢٦-٠٨-١٥، بعد تنبيهه إلى أنّ قراءة الأصوات والبابُ مفتوحٌ تفتح باب الضغط على من لم يصوّت).
--
-- ما يبقى حارسًا: **القدرة وحدها** (`manage_elections` عبر has_election_admin_permission)،
-- وهي ثلاثةُ مناصب. وما سقط: شرطُ `archived_at IS NOT NULL AND status IN (completed, cancelled)`.
--
-- والوعدُ في الواجهة صُحّح معها: بطاقةُ الاقتراع لم تعد تقول «لا أحد يطلع عليه».
CREATE OR REPLACE FUNCTION public.get_election_vote_detail(p_election uuid)
 RETURNS TABLE(voter_id uuid, voter_name text, voter_role text, candidate_id uuid, candidate_number integer, candidate_name text, vote_weight numeric, vote_choice text, voted_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM elections e WHERE e.id = p_election) INTO v_exists;
    IF NOT v_exists THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'تفصيل الأصوات متاح لإدارة الانتخابات فقط';
    END IF;

    RETURN QUERY
    SELECT
        v.voter_id,
        vp.full_name,
        v.voter_role_snapshot,
        v.candidate_id,
        ec.candidate_number,
        cp.full_name,
        v.vote_weight,
        v.vote_choice,
        v.created_at
    FROM election_votes v
    LEFT JOIN election_candidates ec ON ec.id = v.candidate_id
    LEFT JOIN profiles vp ON vp.id = v.voter_id
    LEFT JOIN profiles cp ON cp.id = ec.user_id
    WHERE v.election_id = p_election
    ORDER BY v.created_at;
END;
$function$;
