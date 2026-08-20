-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260814144643   الاسم: election_audit_log_reader_unambiguous

-- سجلُّ الانتخاب لم يُقرأ قطّ: `get_election_audit_log` تُعرِّف مخرَجًا اسمُه `id`، ثمّ تقرأ
-- `FROM elections WHERE id = p_election` — فيلتبس الاسمُ على plpgsql ويرتفع 42702 في كلّ نداء.
-- والدالّةُ مكتوبةٌ منذ تأسيس النظام ولم تُستدعَ من واجهةٍ قطّ، فبقي العطبُ صامتًا.
--
-- والعلاجُ من الجذر لا بترقيع: لا حاجةَ لقراءة صفّ الانتخاب كاملًا أصلًا — المطلوبُ وجودُه
-- فقط، فيُسأل عنه بـ`EXISTS` باسمٍ مؤهَّل (`e.id`)، فلا يبقى في الدالّة اسمٌ يلتبس.
-- والتوقيعُ والحارسُ والترتيبُ كما هي: مديرٌ أو مطّلِع، والأحدثُ أوّلًا.
CREATE OR REPLACE FUNCTION public.get_election_audit_log(p_election uuid)
 RETURNS TABLE(id bigint, created_at timestamp with time zone, event_type text, actor_id uuid, actor_name text, payload jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM elections e WHERE e.id = p_election) THEN
        RAISE EXCEPTION 'الانتخاب غير موجود';
    END IF;

    IF NOT has_election_admin_permission(auth.uid())
       AND NOT has_election_view_permission(auth.uid(), p_election) THEN
        RAISE EXCEPTION 'غير مصرح بعرض سجل التدقيق';
    END IF;

    RETURN QUERY
    SELECT
        al.id,
        al.created_at,
        al.event_type,
        al.actor_id,
        p.full_name,
        al.payload
    FROM election_audit_log al
    LEFT JOIN profiles p ON p.id = al.actor_id
    WHERE al.election_id = p_election
    ORDER BY al.created_at DESC, al.id DESC;
END;
$function$;
