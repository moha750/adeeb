-- «آخرُ مشاركة» تسمّي الفعاليّةَ نفسَها (قرار المالك ٢٠٢٦-١٠-١٠)
--
-- كلمةُ «الفعاليّات» وحدَها مبهمة: هي اسمُ قسمٍ أيضًا، ولا تقول ماذا فعل الصديق. فصار كرتُه يقول
-- «حضر: <اسم الفعاليّة>، <التاريخ>» أو «حجز: …».
--
-- دالّةٌ مرافقة لـ`friends_overview()` لا تعديلٌ لها: تغييرُ أعمدة ناتجها يوجب إسقاطَها، والإسقاطُ
-- لا يمرّ من أداة الوكيل. صفٌّ لكلّ صديقٍ له حجزٌ غيرُ ملغًى أو حضور: اسمُ آخر فعاليّة، وتاريخُها، وهل حضرها.
-- تُنادى بمفتاح الخدمة وحده، ومع `friends_overview()` في الطلب نفسه.

create or replace function public.friends_last_event()
 returns table (user_id uuid, title text, at timestamptz, was_attended boolean)
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select distinct on (r.user_id)
         r.user_id, a.name, greatest(r.reserved_at, r.attended_at), (r.attendance_status = 'attended')
  from activity_reservations r
  left join activities a on a.id = r.activity_id
  where (r.status <> 'cancelled' or r.attendance_status = 'attended')
    and adeeb_standing(r.user_id) = 'visitor'
  order by r.user_id, greatest(r.reserved_at, r.attended_at) desc nulls last;
$function$;

revoke all on function public.friends_last_event() from public, anon, authenticated;
grant execute on function public.friends_last_event() to service_role;
