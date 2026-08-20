-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260420012631   الاسم: declare_winner_guard

CREATE OR REPLACE FUNCTION enforce_winner_declaration()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF (OLD.winner_user_id IS NOT DISTINCT FROM NEW.winner_user_id) THEN
        RETURN NEW;
    END IF;

    IF NEW.winner_user_id IS NULL THEN
        IF NEW.status <> 'cancelled' THEN
            RAISE EXCEPTION 'لا يمكن إزالة الفائز إلا عند إلغاء الانتخاب'
                USING ERRCODE = 'P0001';
        END IF;
        RETURN NEW;
    END IF;

    IF OLD.winner_user_id IS NOT NULL THEN
        RAISE EXCEPTION 'لا يمكن تغيير الفائز بعد تعيينه'
            USING ERRCODE = 'P0001';
    END IF;

    IF NEW.status NOT IN ('voting_closed','completed') THEN
        RAISE EXCEPTION 'لا يمكن إعلان الفائز إلا عند إغلاق التصويت'
            USING ERRCODE = 'P0001';
    END IF;

    SELECT COUNT(*) INTO v_count
      FROM election_candidates
     WHERE election_id = NEW.id
       AND user_id     = NEW.winner_user_id
       AND status      = 'approved';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'الفائز المختار ليس مرشّحاً مقبولاً في هذا الانتخاب'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_winner_declaration ON elections;
CREATE TRIGGER trg_enforce_winner_declaration
    BEFORE UPDATE OF winner_user_id ON elections
    FOR EACH ROW
    EXECUTE FUNCTION enforce_winner_declaration();
