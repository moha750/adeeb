-- =============================================
-- نظام الانتخابات — 19: لا أكثر من انتخاب نشط لكل لجنة
-- =============================================
-- التغيير:
--   القيد القديم سمح بفتح انتخاب لقائد لجنة ونائب لجنة نفسها
--   في نفس الوقت. القرار الحوكمي: لجنة واحدة = انتخاب نشط واحد
--   (أيّاً كان الدور المستهدف).
--
--   نسقط القيد القديم على (target_role_name, target_committee_id)
--   ونستبدله بـ (target_committee_id) فقط مع نفس شروط التصفية.
-- =============================================

DROP INDEX IF EXISTS elections_active_committee_uniq;

CREATE UNIQUE INDEX elections_active_committee_uniq
    ON elections (target_committee_id)
    WHERE target_committee_id IS NOT NULL
      AND archived_at IS NULL
      AND status NOT IN ('completed','cancelled');
