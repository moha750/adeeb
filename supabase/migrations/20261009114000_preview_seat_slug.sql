-- رابطُ دُمية المعاينة (`preview@adeeb.local`) كان يحمل اسمَ منصبٍ أُزيل في
-- `20261009112814_no_president_advisor`، فيُعاد توليدُه من اسمها وحده كما يولِّده `fill_public_slug`.
update public.profiles
set public_slug = public.generate_public_slug(full_name, id)
where email = 'preview@adeeb.local';
