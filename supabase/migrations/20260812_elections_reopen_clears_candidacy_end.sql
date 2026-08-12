-- =========================================================
-- الانتخابات : إعادةُ فتح الترشّح ترفع موعدَ الإغلاق معها
--
-- العلّة : `transition_election` كانت تغيّر الحالة وحدها، فإن أُعيد فتحُ بابٍ
-- أغلقه موعدُه بقي `candidacy_end` ماضيًا، والكنّاسةُ (كلّ دقيقة) تلتقطه فتُغلقه
-- ثانيةً أو تُلغي الانتخاب. فصار الفتحُ يُنقض من تحت يد المشرف.
-- الحكم : من أعاد الفتح أراد بابًا مفتوحًا، فيُرفع الموعد ويصير الإغلاق بيده،
-- وله أن يضرب موعدًا جديدًا من «ضبط موعد الإغلاق».
--
-- ومعها : تُنزع الازدواجيّة. كان للدالّة حملان (uuid,text) و(uuid,text,timestamptz)
-- بحارسَي إغلاقٍ مختلفَين (المرشّحون الفاعلون مقابل المعتمَدين)، فيُنفَّذ أحدُهما
-- بحسب ما يرسله العميل. يبقى حملٌ واحد بحارسٍ واحد : الفاعلون ≥ ٢، وهو ما كان
-- يجري فعلًا على زرّ الإغلاق، وهو نفسُ حارس الكنّاسة.
-- =========================================================

DROP FUNCTION IF EXISTS public.transition_election(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.transition_election(
    p_election    UUID,
    p_new_status  TEXT,
    p_voting_end  TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_status TEXT;
    v_active_count   INT;
    v_reopened       BOOLEAN := FALSE;
BEGIN
    IF NOT has_election_admin_permission(auth.uid()) THEN
        RAISE EXCEPTION 'غير مصرح بتغيير حالة الانتخاب';
    END IF;

    SELECT status INTO v_current_status FROM elections WHERE id = p_election;
    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    -- الإغلاق اليدويّ للترشّح : لا يصحّ بأقلّ من متنافسَين
    IF p_new_status = 'candidacy_closed' AND v_current_status = 'candidacy_open' THEN
        v_active_count := public._count_active_candidates(p_election);
        IF v_active_count < 2 THEN
            RAISE EXCEPTION
                'لا يمكن إغلاق باب الترشح قبل وجود مرشحَين على الأقل لضمان المنافسة (الحالي: %).',
                v_active_count
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    IF p_new_status = 'voting_open' THEN
        IF p_voting_end IS NOT NULL AND p_voting_end <= now() THEN
            RAISE EXCEPTION 'نهاية التصويت يجب أن تكون في المستقبل';
        END IF;
        UPDATE elections
           SET status     = p_new_status,
               voting_end = p_voting_end
         WHERE id = p_election;

    ELSIF p_new_status = 'candidacy_open' AND v_current_status = 'candidacy_closed' THEN
        -- إعادةُ فتحٍ : يُرفع الموعدُ الماضي فلا تُغلقه الكنّاسة بعد لحظة
        v_reopened := TRUE;
        UPDATE elections
           SET status        = p_new_status,
               candidacy_end = NULL
         WHERE id = p_election;

    ELSE
        UPDATE elections SET status = p_new_status WHERE id = p_election;
    END IF;

    INSERT INTO election_audit_log (election_id, actor_id, event_type, payload)
    VALUES (p_election, auth.uid(), 'status_transition',
            jsonb_build_object('new_status', p_new_status,
                               'voting_end', p_voting_end,
                               'candidacy_end_cleared', v_reopened));
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_election(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

NOTIFY pgrst, 'reload schema';
