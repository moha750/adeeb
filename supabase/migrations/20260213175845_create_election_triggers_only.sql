-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260213175845   الاسم: create_election_triggers_only


-- Trigger لتحديث عدد الأصوات تلقائياً
CREATE OR REPLACE FUNCTION update_candidate_votes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE election_candidates 
        SET votes_count = votes_count + 1,
            updated_at = now()
        WHERE id = NEW.candidate_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE election_candidates 
        SET votes_count = votes_count - 1,
            updated_at = now()
        WHERE id = OLD.candidate_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- إنشاء الـ Trigger
DROP TRIGGER IF EXISTS trigger_update_votes_count ON election_votes;
CREATE TRIGGER trigger_update_votes_count
AFTER INSERT OR DELETE ON election_votes
FOR EACH ROW EXECUTE FUNCTION update_candidate_votes_count();

-- Trigger لتحديث updated_at في election_candidates
CREATE OR REPLACE FUNCTION update_election_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_election_candidates_updated_at ON election_candidates;
CREATE TRIGGER trigger_election_candidates_updated_at
BEFORE UPDATE ON election_candidates
FOR EACH ROW EXECUTE FUNCTION update_election_candidates_updated_at();

