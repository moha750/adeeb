-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260412124408   الاسم: fix_check_member_details_completion


CREATE OR REPLACE FUNCTION public.check_member_details_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_full_name TEXT;
    v_phone TEXT;
    v_email TEXT;
BEGIN
    -- جلب البيانات من جدول profiles
    SELECT full_name, phone, email
    INTO v_full_name, v_phone, v_email
    FROM profiles
    WHERE id = NEW.user_id;

    -- التحقق من اكتمال البيانات الإلزامية
    IF v_full_name IS NOT NULL 
       AND v_phone IS NOT NULL 
       AND NEW.national_id IS NOT NULL 
       AND NEW.academic_record_number IS NOT NULL 
       AND v_email IS NOT NULL 
       AND NEW.birth_date IS NOT NULL 
       AND NEW.academic_degree IS NOT NULL 
       AND NEW.committee_id IS NOT NULL
       AND (
           NEW.academic_degree = 'high_school' 
           OR (NEW.college IS NOT NULL AND NEW.major IS NOT NULL)
       )
    THEN
        NEW.is_complete = true;
        IF NEW.completed_at IS NULL THEN
            NEW.completed_at = now();
        END IF;
    ELSE
        NEW.is_complete = false;
        NEW.completed_at = NULL;
    END IF;
    
    RETURN NEW;
END;
$function$;

