-- حفظُ فريق الرؤية دفعةً واحدة (2026-11-22): نافذةُ «فريق الرؤية» تحفظ المقاعد كلَّها معًا، فإمّا أن تُحفظ كلُّها أو لا يتغيّر شيء
-- (كانت تُكتب مقعدًا مقعدًا، فخطأٌ في الرابع يترك الثلاثة الأولى محفوظةً والرسالةُ تقول «تعذّر»). تُستدعى بمفتاح الخدمة بعد قفل `manage_vision`.
create or replace function public.save_vision_team(p_vision_id bigint, p_actor uuid, p_seats jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  delete from public.vision_team where vision_id = p_vision_id;
  insert into public.vision_team (vision_id, role, track_id, profile_id, name, gender, updated_by)
  select p_vision_id,
         s->>'role',
         nullif(s->>'track_id', '')::bigint,
         nullif(s->>'profile_id', '')::uuid,
         nullif(btrim(s->>'name'), ''),
         nullif(s->>'gender', ''),
         p_actor
  from jsonb_array_elements(coalesce(p_seats, '[]'::jsonb)) s;
end;
$function$;

revoke all on function public.save_vision_team(bigint, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_vision_team(bigint, uuid, jsonb) to service_role;
