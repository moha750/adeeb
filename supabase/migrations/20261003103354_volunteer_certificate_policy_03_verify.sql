-- ٨ ── صفحةُ التحقّق تقرأ الساعاتِ والتميّز (حقلان مضافان، وما سواهما كما هو)
create or replace function public.verify_certificate(p_serial text)
returns jsonb language sql stable security definer set search_path to 'public', 'pg_temp' as $$
  select coalesce(
    (select jsonb_build_object(
       'found', true, 'kind', 'experience',
       'valid', c.status = 'valid',
       'serial', c.serial,
       'holder_name', coalesce(n ->> 'current', c.holder_name),
       'former_names', coalesce(n -> 'former', '[]'::jsonb),
       'position_title', c.position_title,
       'period_from', c.period_from,
       'period_to', c.period_to,
       'issued_on', c.created_at::date,
       'revoked_on', c.revoked_at::date
     )
     from experience_certificates c
     cross join lateral (select certificate_names('experience', c.id) as n) x
     where upper(btrim(c.serial)) = upper(btrim(p_serial))),
    (select jsonb_build_object(
       'found', true, 'kind', 'participation',
       'valid', p.status = 'active',
       'serial', p.serial,
       'holder_name', coalesce(n ->> 'current', p.holder_name),
       'former_names', coalesce(n -> 'former', '[]'::jsonb),
       'position_title', 'متطوّعٌ في ' || p.opportunity_title,
       'period_from', p.served_from,
       'period_to', coalesce(p.served_to, p.served_from),
       'issued_on', p.issued_at::date,
       'revoked_on', p.revoked_at::date,
       'hours', p.hours,
       'distinction', p.distinction_note
     )
     from participation_certificates p
     cross join lateral (select certificate_names('participation', p.id) as n) x
     where upper(btrim(p.serial)) = upper(btrim(p_serial))),
    jsonb_build_object('found', false)
  );
$$;
