-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717195214   الاسم: fix_cancel_interview_booking_table_ref

-- إصلاح جذريّ: cancel_interview_booking كانت تحذف من جدولٍ غير موجود `interviews`
-- (بأعمدة slot_id/application_id لا وجود لها في المخطّط الحاليّ)، فكانت تُخفق دائمًا —
-- إلغاء المقابلة مكسورٌ في كلّ من v1 وV2. الصحيح: الحذف من membership_interviews عبر
-- interview_id المخزَّن في الفترة (تربطه book_interview_slot)، مع تفريغ الرابط قبل الحذف.
CREATE OR REPLACE FUNCTION public.cancel_interview_booking(p_slot_id uuid, p_application_id uuid)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    slot_record RECORD;
BEGIN
    SELECT * INTO slot_record
    FROM interview_slots
    WHERE id = p_slot_id
    AND booked_by = p_application_id
    AND is_booked = true
    AND cancelled_at IS NULL
    FOR UPDATE;

    IF slot_record IS NULL THEN
        RETURN QUERY SELECT false, 'الحجز غير موجود أو تم إلغاؤه مسبقاً'::TEXT;
        RETURN;
    END IF;

    UPDATE interview_slots
    SET
        is_booked = false,
        booked_by = NULL,
        booked_at = NULL,
        cancelled_at = NOW(),
        interview_id = NULL
    WHERE id = p_slot_id;

    DELETE FROM membership_interviews
    WHERE id = slot_record.interview_id
    AND application_id = p_application_id;

    RETURN QUERY SELECT true, 'تم إلغاء الحجز بنجاح'::TEXT;
END;
$function$;
