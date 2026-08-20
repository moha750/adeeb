-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260130234445   الاسم: add_search_path_archive_functions_corrected

-- Migration: إضافة search_path لـ archive functions (مصححة)

-- Function: archive_single_invitation - RETURNS jsonb
CREATE OR REPLACE FUNCTION archive_single_invitation(p_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invitation RECORD;
    v_usage_count INT;
    v_usages JSONB;
    v_archived_id UUID;
BEGIN
    SELECT * INTO v_invitation
    FROM membership_invitations
    WHERE id = p_invitation_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'الدعوة غير موجودة');
    END IF;
    
    IF v_invitation.archived_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الدعوة مؤرشفة مسبقاً');
    END IF;
    
    SELECT COUNT(*), jsonb_agg(jsonb_build_object(
        'used_at', used_at,
        'email', applicant_email,
        'name', applicant_name,
        'committee_id', selected_committee_id
    )) INTO v_usage_count, v_usages
    FROM invitation_usages
    WHERE invitation_id = p_invitation_id;
    
    INSERT INTO archived_membership_invitations (
        original_invitation_id, invitation_code, committee_mode,
        selected_committee_id, selected_committee_ids,
        max_uses, total_uses, created_at, expires_at,
        final_status, notes, usage_stats, archived_by
    ) VALUES (
        v_invitation.id, v_invitation.invitation_code, v_invitation.committee_mode,
        v_invitation.selected_committee_id, v_invitation.selected_committee_ids,
        v_invitation.max_uses, COALESCE(v_usage_count, 0),
        v_invitation.created_at, v_invitation.expires_at,
        v_invitation.status, v_invitation.notes, v_usages,
        auth.uid()
    ) RETURNING id INTO v_archived_id;
    
    UPDATE membership_invitations
    SET archived_at = NOW(),
        status = 'expired'
    WHERE id = p_invitation_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم أرشفة الدعوة بنجاح',
        'archived_id', v_archived_id,
        'total_uses', COALESCE(v_usage_count, 0)
    );
END;
$$;

COMMENT ON FUNCTION archive_single_invitation(uuid) IS 'أرشفة دعوة واحدة - محمي من SQL Injection';
