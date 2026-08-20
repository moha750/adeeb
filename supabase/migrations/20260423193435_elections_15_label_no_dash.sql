-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260423193435   الاسم: elections_15_label_no_dash

CREATE OR REPLACE FUNCTION public._election_target_label(p_election_id UUID)
RETURNS TEXT
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
    v_role_ar TEXT;
    v_scope   TEXT;
BEGIN
    SELECT
        CASE e.target_role_name
            WHEN 'department_head'          THEN 'رئيس قسم'
            WHEN 'committee_leader'         THEN 'قائد لجنة'
            WHEN 'deputy_committee_leader'  THEN 'نائب قائد لجنة'
            ELSE e.target_role_name
        END,
        COALESCE(c.committee_name_ar, d.name_ar, '')
      INTO v_role_ar, v_scope
      FROM elections e
      LEFT JOIN committees  c ON c.id = e.target_committee_id
      LEFT JOIN departments d ON d.id = e.target_department_id
     WHERE e.id = p_election_id;

    RETURN TRIM(BOTH ' ' FROM COALESCE(v_role_ar || ' ' || v_scope, ''));
END;
$$;
