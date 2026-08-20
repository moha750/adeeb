-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260420012648   الاسم: lock_election_targets

CREATE OR REPLACE FUNCTION lock_election_targets()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'draft' THEN
        RETURN NEW;
    END IF;

    IF OLD.target_role_id       IS DISTINCT FROM NEW.target_role_id
       OR OLD.target_committee_id  IS DISTINCT FROM NEW.target_committee_id
       OR OLD.target_department_id IS DISTINCT FROM NEW.target_department_id THEN
        RAISE EXCEPTION 'لا يمكن تعديل منصب/لجنة/قسم الانتخاب بعد فتح الترشح — ألغِ الانتخاب وأنشئ واحداً جديداً'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_election_targets ON elections;
CREATE TRIGGER trg_lock_election_targets
    BEFORE UPDATE OF target_role_id, target_committee_id, target_department_id ON elections
    FOR EACH ROW
    EXECUTE FUNCTION lock_election_targets();
