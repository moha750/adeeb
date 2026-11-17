-- **أعدادُ الفعاليّة للزائر** (٢٠٢٦-١١-١٥): المسجَّلون والحاضرون عددًا وحده بلا اسم — الحجوزاتُ محميّة (صاحبُها ومن يدير الفعاليّات)،
-- فالعددُ يمرّ من هذا الباب. للمنشورة وحدها. ومفتوحةٌ للزائر لأنّ صفحةَ الفعاليّة العامّة تقرؤها بمفتاح anon.
create or replace function public.get_activity_public_counts(p_activity_id uuid)
returns table(booked integer, attended integer)
language sql stable security definer set search_path = public, pg_temp
as $$
  select
    count(*) filter (where r.status = 'confirmed')::integer,
    count(*) filter (where r.status = 'confirmed' and r.attended_at is not null)::integer
  from public.activities a
  left join public.activity_reservations r on r.activity_id = a.id
  where a.id = p_activity_id and a.is_published
  group by a.id;
$$;
-- الصفحةُ العامّة تقرؤها بمفتاح anon، ولا تُخرج إلّا عددين
grant execute on function public.get_activity_public_counts(uuid) to anon, authenticated;
