-- حسابٌ باسمٍ قريب من مقعدٍ مكتوب في فريق رؤية (محمد ٢٠٢٦-١١-٢٣): حين يسجّل عضوٌ (أو يتغيّر اسمه) ويقرب اسمُه — الأوّلُ والعائلة
-- بعد توحيد الإملاء — من اسمٍ مكتوبٍ بلا حساب في فريق رؤيةٍ سارية أو قيد الكتابة، يُشعَر من يُعدّ الرؤى ليتأكّد ويربط بنقرة.
-- اقتراحٌ لا ربط: لا يتغيّر المقعد هنا. ونظيرُ المفتاح في الكود `lib/vision/seatMatch.ts` — يتغيّران معًا.
-- يُطبَّق مع الرفع: الموقعُ المنشور لا يعرف نوع الإشعار `vision.seat_match` قبله.

create or replace function public.vision_name_key(p_name text)
returns text language plpgsql immutable set search_path to 'public', 'pg_temp' as $$
declare
  w text[]; names text[] := '{}'; i int := 1; n text; cnt int;
  glue constant text[] := array['عبد', 'عبدُ', 'بن', 'ابن', 'بنت', 'ابنة', 'أبو', 'أبا', 'أبي', 'آل', 'ذو', 'ذي'];
begin
  p_name := btrim(regexp_replace(coalesce(p_name, ''), '[​-‏‪-‮⁦-⁩ـ]', '', 'g'));
  if p_name = '' then return null; end if;
  w := regexp_split_to_array(p_name, '\s+');
  cnt := array_length(w, 1);
  while i <= cnt loop
    n := w[i];
    while w[i] = any(glue) and i < cnt loop n := n || w[i + 1]; i := i + 1; end loop;
    names := names || translate(regexp_replace(n, '[ً-ْٰ]', '', 'g'), 'أإآٱةىؤئ', 'ااااهيوي');
    i := i + 1;
  end loop;
  if array_length(names, 1) < 2 then return null; end if;
  return names[1] || '|' || names[array_length(names, 1)];
end;
$$;

create or replace function public.vision_seat_match_on_profile()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp' as $$
declare k text; r record; v_to jsonb;
begin
  if not (new.account_status = 'active' and new.joined_date is not null) then return new; end if;
  if tg_op = 'UPDATE' and old.account_status = 'active' and old.joined_date is not null and old.full_name is not distinct from new.full_name then return new; end if;
  k := public.vision_name_key(new.full_name);
  if k is null then return new; end if;
  for r in
    select m.role, m.name, t.name as track_name, v.id as vid, v.name as vname
      from public.vision_team m
      join public.visions v on v.id = m.vision_id
      left join public.vision_tracks t on t.id = m.track_id
     where m.profile_id is null and v.status in ('draft', 'review', 'active') and public.vision_name_key(m.name) = k
  loop
    select coalesce(jsonb_agg(distinct ur.user_id), '[]'::jsonb) into v_to
      from public.user_roles ur
      join public.role_permissions rp on rp.role_name = ur.role_name
      join public.permissions p on p.id = rp.permission_id
     where p.permission_key = 'draft_vision' and ur.is_active and ur.frozen_by is null and ur.user_id <> new.id
       -- مسوّدةٌ لم تُرسل لا تُذكر إلّا لجهتها (`vision_can_see`، ٢٠٢٦-١١-٢٤)
       and public.vision_can_see(ur.user_id, r.vid);
    if jsonb_array_length(v_to) > 0 then
      perform public.notify_event('vision.seat_match', jsonb_build_object(
        'planId', r.vid, 'vision', r.vname, 'seat', r.role, 'track', r.track_name, 'written', r.name, 'person', new.full_name, 'to', v_to), null);
    end if;
  end loop;
  return new;
exception when others then
  -- لا يمنع اقتراحٌ تسجيلَ عضو
  return new;
end;
$$;
revoke all on function public.vision_seat_match_on_profile() from public, anon, authenticated;

drop trigger if exists profiles_vision_seat_match on public.profiles;
create trigger profiles_vision_seat_match
  after insert or update of full_name, joined_date, account_status on public.profiles
  for each row execute function public.vision_seat_match_on_profile();
