-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810200916   الاسم: elections_department_state_readable

-- تُقرأ بمفتاح الخدمة من صفحةٍ محروسةٍ سلفًا بـmanage_elections، فحارسُ auth.uid()
-- فيها يمنع صاحبَ الحقّ نفسه (الخدمةُ بلا هويّة). وما تُرجعه عدادان لا أسماء.
create or replace function public.department_resolution_state(p_election uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
DECLARE
    v_dept     integer;
    v_blocking integer;
    v_pending  integer;
BEGIN
    v_dept := election_department(p_election);

    SELECT count(*) FILTER (WHERE e.status IN ('candidacy_open','candidacy_closed','voting_open')),
           count(*) FILTER (WHERE e.status = 'voting_closed' AND e.winner_candidate_id IS NULL)
      INTO v_blocking, v_pending
    FROM elections e
    WHERE e.id <> p_election
      AND e.archived_at IS NULL
      AND election_department(e.id) = v_dept
      AND EXISTS (
          SELECT 1 FROM election_candidates a
          JOIN election_candidates b ON b.user_id = a.user_id AND b.election_id = e.id
          WHERE a.election_id = p_election AND a.status = 'approved'
            AND b.status IN ('pending','approved','needs_edit')
      );

    RETURN jsonb_build_object('department', v_dept,
                              'blocking', COALESCE(v_blocking, 0),
                              'pending',  COALESCE(v_pending, 0));
END;
$function$;
