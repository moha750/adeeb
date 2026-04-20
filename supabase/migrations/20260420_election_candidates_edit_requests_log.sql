-- سجل كامل لطلبات التعديل (لا يُفقَد عند طلب تعديل جديد)
-- كل عنصر: { at: timestamptz, by: uuid, note: text }

ALTER TABLE election_candidates
    ADD COLUMN IF NOT EXISTS edit_requests_log JSONB NOT NULL DEFAULT '[]'::jsonb;
