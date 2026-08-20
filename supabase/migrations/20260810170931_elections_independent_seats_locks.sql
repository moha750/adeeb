-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810170931   الاسم: elections_independent_seats_locks


-- أ١: قفل اللجنة يصير على (الدور، اللجنة) بدل (اللجنة) وحدها، فيُفتح القائد والنائب معًا،
--     ويبقى انتخابٌ نشطٌ واحدٌ لكلّ مقعد. (يطابق منطق قفل القسم فيزول التباين.)
DROP INDEX IF EXISTS public.elections_active_committee_uniq;
CREATE UNIQUE INDEX elections_active_committee_uniq
  ON public.elections USING btree (target_role_name, target_committee_id)
  WHERE ((target_committee_id IS NOT NULL) AND (archived_at IS NULL)
         AND (status <> ALL (ARRAY['completed'::text, 'cancelled'::text])));

-- أ٢: إسقاط حارس التنافي منسّق↔لجنة («المهرجان» بمستوى القسم الذي رفضه المالك).
--     يبقى: منسّقٌ واحدٌ نشطٌ للقسم (فهرس القسم)، وانتخابٌ واحدٌ لكلّ مقعد (فهرس اللجنة).
DROP TRIGGER IF EXISTS trg_enforce_election_scope_exclusivity ON public.elections;
DROP FUNCTION IF EXISTS public.enforce_election_scope_exclusivity();

