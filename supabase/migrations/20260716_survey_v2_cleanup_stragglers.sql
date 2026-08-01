-- ============================================================
-- نظام الاستبيانات V2 — تنظيف خيطين معلّقين فاتا هجرة التقليم
-- كشفتهما مراجعةٌ لاحقة على القاعدة الحيّة.
-- ============================================================

-- ١) calculate_completion_rate() — دالّة مشغّل يتيمة (غير مربوطة بأيّ
--    مشغّل) ومكسورة: تكتب في surveys.completion_rate وهو عمود لا وجود له.
--    أُسقط توقيع (uuid) في التقليم وبقي توقيع المشغّل صفريّ المعامل.
drop function if exists calculate_completion_rate();

-- ٢) impersonate_read — قارئ تنكّر عامّ بقائمة سماح، فيها 'survey_sharing'
--    (سقط الجدول) و'shared_with' (عموده الوحيد). نداؤه لهذا الجدول يردّ خطأ
--    «العلاقة غير موجودة». نُعيد إنشاءها بلا الاسمين الميّتين، ونثبّت
--    search_path (كانت SECURITY DEFINER بلا تثبيت — فجوة تقوية موثّقة).
create or replace function public.impersonate_read(
  p_target_user_id uuid,
  p_table_name text,
  p_user_column text default 'user_id'::text
) returns json
language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare
    v_result json;
    v_query text;
    v_allowed_tables text[] := array[
        'survey_responses',
        'notifications',
        'activity_reservations',
        'user_roles'
    ];
    v_allowed_columns text[] := array[
        'user_id',
        'recipient_id'
    ];
begin
    -- التحقق من صلاحية التنكر
    if not verify_impersonation_access(p_target_user_id) then
        raise exception 'غير مصرح لك بهذه العملية أو لا توجد جلسة تنكر نشطة';
    end if;

    -- التحقق من أن الجدول مسموح
    if not (p_table_name = any(v_allowed_tables)) then
        raise exception 'الجدول "%" غير مسموح للتنكر', p_table_name;
    end if;

    -- التحقق من أن العمود مسموح (منع حقن SQL)
    if not (p_user_column = any(v_allowed_columns)) then
        raise exception 'العمود "%" غير مسموح', p_user_column;
    end if;

    -- بناء وتنفيذ الاستعلام
    v_query := format(
        'SELECT json_agg(row_to_json(t)) FROM (SELECT * FROM %I WHERE %I = $1 ORDER BY created_at DESC LIMIT 200) t',
        p_table_name,
        p_user_column
    );

    execute v_query into v_result using p_target_user_id;

    return coalesce(v_result, '[]'::json);
end;
$function$;
