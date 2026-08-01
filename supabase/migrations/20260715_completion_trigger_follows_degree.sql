-- مُطلِق الاكتمال يتبع الدرجة — إصلاح خللٍ أحدثه ترحيل اليوم.
--
-- الخلل: 20260715_academic_degree_employee_and_conditional_fields.sql نقل الرقم الأكاديميّ من
-- «إلزاميّ للجميع» إلى «إلزاميّ لصاحب الدرجة الجامعيّة وحده»، ولم يُحدَّث هذا المُطلِق معه.
-- وكان يشترط academic_record_number IS NOT NULL لكلّ عضو، واستثناؤه الوحيد للكلّية والتخصّص
-- ولـ high_school وحدها (بلا employee أصلًا — فهي لم تكن موجودة).
--
-- الأثر: ترحيل اليوم حدّث الصفوف الستّة عشر فأطلقه، فصارت is_complete=false و completed_at=NULL.
-- منهم ٦ كانوا مكتملين فعلًا — ضاعت أختام إكمالهم بلا رجعة (لا مؤقّت تدقيق، ولا لقطات).
-- ولا شيء يقرأ العمودين اليوم (فُحص المستودع ودوالّ القاعدة وعروضها وسياسات RLS)، فالضرر محصور.
--
-- الإصلاح: شرطٌ واحد يطابق member_details_academic_fields_check — الثلاثة تلزم صاحب الدرجة
-- الجامعيّة وحده، ومن لا درجة له (high_school · employee) لا تلزمه ولا تُشترط عليه.

create or replace function public.check_member_details_completion()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
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
       AND v_email IS NOT NULL
       AND NEW.birth_date IS NOT NULL
       AND NEW.academic_degree IS NOT NULL
       AND NEW.committee_id IS NOT NULL
       -- الحقول الأكاديميّة تتبع الدرجة — نفس قاعدة member_details_academic_fields_check.
       -- الرقم الأكاديميّ انتقل إلى هنا: كان مشروطًا على الجميع فوق هذا الشرط، فأخرج من لا رقم له.
       AND (
           NEW.academic_degree IN ('high_school', 'employee')
           OR (NEW.college IS NOT NULL
               AND NEW.major IS NOT NULL
               AND NEW.academic_record_number IS NOT NULL)
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
