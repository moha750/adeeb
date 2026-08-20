-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260622164503   الاسم: temp_export_pending_applicants


CREATE OR REPLACE FUNCTION public.tmp_export_pending_full()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
WITH base AS (
  SELECT
    a.full_name, a.phone, a.email, a.degree, a.college, a.major,
    a.preferred_committee, a.skills, a.about,
    a.portfolio_url, a.social_twitter, a.social_instagram, a.social_linkedin,
    CASE
      WHEN a.status='new' THEN 'جديد - لم يُراجَع'
      WHEN a.status='approved_for_interview' AND i.id IS NULL THEN 'مقبول للمقابلة - لم تُجدوَل'
      WHEN i.status='scheduled' THEN 'مقابلة مجدولة - لم تُجرَ'
      WHEN i.result='accepted' THEN 'نجح بالمقابلة - لم يُضَف كعضو'
      ELSE a.status
    END AS detailed_status,
    a.admin_notes, a.review_notes, i.interviewer_notes, i.result_notes,
    to_char(i.interview_date,'YYYY-MM-DD HH24:MI') AS interview_date,
    to_char(a.created_at,'YYYY-MM-DD HH24:MI') AS applied_at,
    a.created_at AS sort_key
  FROM public.membership_applications a
  LEFT JOIN public.membership_interviews i ON i.application_id = a.id
  LEFT JOIN public.membership_accepted_members am ON am.application_id = a.id
  WHERE am.id IS NULL AND (i.result IS DISTINCT FROM 'rejected')
),
lines AS (
  SELECT '"'||replace(coalesce(full_name,''),'"','""')||'","'
    ||replace(coalesce(phone,''),'"','""')||'","'
    ||replace(coalesce(email,''),'"','""')||'","'
    ||replace(coalesce(degree,''),'"','""')||'","'
    ||replace(coalesce(college,''),'"','""')||'","'
    ||replace(coalesce(major,''),'"','""')||'","'
    ||replace(coalesce(preferred_committee,''),'"','""')||'","'
    ||replace(coalesce(skills,''),'"','""')||'","'
    ||replace(coalesce(about,''),'"','""')||'","'
    ||replace(coalesce(portfolio_url,''),'"','""')||'","'
    ||replace(coalesce(social_twitter,''),'"','""')||'","'
    ||replace(coalesce(social_instagram,''),'"','""')||'","'
    ||replace(coalesce(social_linkedin,''),'"','""')||'","'
    ||replace(coalesce(detailed_status,''),'"','""')||'","'
    ||replace(coalesce(admin_notes,''),'"','""')||'","'
    ||replace(coalesce(review_notes,''),'"','""')||'","'
    ||replace(coalesce(interviewer_notes,''),'"','""')||'","'
    ||replace(coalesce(result_notes,''),'"','""')||'","'
    ||replace(coalesce(interview_date,''),'"','""')||'","'
    ||replace(coalesce(applied_at,''),'"','""')||'"' AS line,
    sort_key
  FROM base
)
SELECT encode(convert_to(
  '"الاسم الكامل","الجوال","البريد الإلكتروني","الدرجة العلمية","الكلية","التخصص","اللجنة المفضلة","المهارات","نبذة عن المتقدم","رابط الأعمال","تويتر/إكس","إنستقرام","لينكدإن","الحالة التفصيلية","ملاحظات الإدارة","ملاحظات المراجعة","ملاحظات المُقابِل","ملاحظات نتيجة المقابلة","تاريخ المقابلة","تاريخ التقديم"'
  || E'\r\n' || string_agg(line, E'\r\n' ORDER BY sort_key), 'UTF8'), 'base64')
FROM lines;
$$;
GRANT EXECUTE ON FUNCTION public.tmp_export_pending_full() TO anon;

