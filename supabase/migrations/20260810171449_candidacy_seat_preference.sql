-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810171449   الاسم: candidacy_seat_preference


-- ب١: ترتيبُ أفضليّة المرشّح بين مقاعد لجنته إن ترشّح لأكثر من مقعد. الأدنى أوثَر، والافتراض ١
--     (فإن لم يُعلن أفضليّةً، يحسم الحسمُ بأولويّة القيادة على النيابة).
ALTER TABLE public.election_candidates
  ADD COLUMN IF NOT EXISTS preference_rank smallint NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.election_candidates.preference_rank IS
  'أفضليّة المرشّح بين مقاعد لجنته إن ترشّح لأكثر من مقعد: الأدنى أوثَر (1)؛ يحسمها عند الفوز بمقعدين.';

-- المرشّح يرتّب أفضليّته: المقعدُ المفضّل ١، والآخر ٢. لا يمسّ إلّا ترشّحاته الحيّة في لجنةٍ واحدة.
CREATE OR REPLACE FUNCTION public.set_seat_preference(p_committee integer, p_preferred_election uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    UPDATE election_candidates ec
    SET preference_rank = CASE WHEN e.id = p_preferred_election THEN 1 ELSE 2 END
    FROM elections e
    WHERE e.id = ec.election_id
      AND ec.user_id = auth.uid()
      AND e.target_committee_id = p_committee
      AND e.archived_at IS NULL
      AND e.status IN ('candidacy_open','candidacy_closed','voting_open','voting_closed')
      AND ec.status IN ('pending','approved','needs_edit');
END;
$function$

