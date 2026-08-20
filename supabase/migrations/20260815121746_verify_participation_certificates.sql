-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815121746   الاسم: verify_participation_certificates

-- **مُحقِّقٌ واحدٌ وقالبان**: من بيده ورقةٌ من أديب لا يُسأل عن نوعها ولا يُدَلّ على صفحتين.
-- فالدالّةُ تسأل السجلّين بالرقم نفسه، وتردّ الشكلَ نفسه (فالشاشةُ لا تتبدّل).
create or replace function public.verify_certificate(p_serial text)
returns jsonb
language sql stable security definer
set search_path to 'public', 'pg_temp'
as $function$
  select coalesce(
    (select jsonb_build_object(
       'found', true, 'kind', 'experience',
       'valid', c.status = 'valid',
       'serial', c.serial,
       'holder_name', c.holder_name,
       'position_title', c.position_title,
       'period_from', c.period_from,
       'period_to', c.period_to,
       'issued_on', c.created_at::date,
       'revoked_on', c.revoked_at::date
     )
     from experience_certificates c
     where upper(btrim(c.serial)) = upper(btrim(p_serial))),
    -- شهادةُ المشاركة: عنوانُ الفرصة يقوم مقام المسمّى، ويومُها الواحد مبتدأً ومنتهًى
    (select jsonb_build_object(
       'found', true, 'kind', 'participation',
       'valid', p.status = 'active',
       'serial', p.serial,
       'holder_name', p.holder_name,
       'position_title', 'متطوّعٌ في ' || p.opportunity_title,
       'period_from', p.served_from,
       'period_to', coalesce(p.served_to, p.served_from),
       'issued_on', p.issued_at::date,
       'revoked_on', p.revoked_at::date
     )
     from participation_certificates p
     where upper(btrim(p.serial)) = upper(btrim(p_serial))),
    jsonb_build_object('found', false)
  );
$function$;
