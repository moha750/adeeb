-- ════════════════════════════════════════════════════════════════════════
-- الشهادةُ تتبع اسمَ صاحبها، والتحقّقُ يعرف تاريخَه (قرارُ المالك ٢٠٢٦-١٠-٠١)
--
-- كانت الشهادةُ تحفظ الاسمَ يومَ صدرت وتُرسَم به أبدًا («ورقةٌ سُلّمت فلا تتغيّر»). فمن صحّح اسمَه
-- (اسماعيل ← إسماعيل) بقيت ورقتُه تُنزَّل بالخطأ. والآن:
--   ١) الورقةُ تُرسَم بالاسم الحاليّ متى تغيّر الاسمُ بعد الإصدار (`paper_name`)، والرقمُ هو هو.
--   ٢) صفحةُ التحقّق تقول الاسمَ الحاليّ وكلَّ اسمٍ حملته الشهادةُ قبله وإلى متى (`former_names`)،
--      فالنسخةُ القديمةُ التي بيد جهةٍ ما تُطابَق ولا تبدو مزوّرة.
--   ٣) `holder_name` يبقى اسمَ يوم الإصدار لا يُمسّ: هو أوّلُ التاريخ لا نسخةٌ تُحدَّث.
-- وما سوى الاسم ثابت: الفرصةُ واللجنةُ والمدّةُ تصف الحدثَ يومَ وقع.
--
-- والتاريخُ لا يُبنى على سجلٍّ يكتبه صاحبُه: كان `profile_name_changes` يقبل الإدراجَ من صاحب الصفّ
-- ولا يكتبه شيءٌ آليًّا (صفٌّ واحدٌ يدويٌّ منذ مايو). فلو بُني عليه لأمكن لمتطوّعٍ أن يُدرج «تغييرًا»
-- فتُطبع شهادتُه باسمٍ يختاره. فصار **المحفّزُ كاتبَه الوحيد**، ونُزع الإدراجُ عن الأدوار العامّة.
-- ════════════════════════════════════════════════════════════════════════

-- ١) سجلُّ تغيّر الاسم: يكتبه المحفّزُ وحدَه
drop policy if exists "Users can insert their own name changes" on public.profile_name_changes;
revoke insert, update, delete, truncate on public.profile_name_changes from anon, authenticated;

create or replace function public.log_profile_name_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if coalesce(btrim(old.full_name), '') <> ''
     and coalesce(btrim(new.full_name), '') <> ''
     and btrim(old.full_name) is distinct from btrim(new.full_name) then
    -- الفاعلُ إن كان صاحبَ صفٍّ في `profiles` (المفتاحُ الأجنبيّ يردّ غيرَه فيسقط تعديلُ الاسم كلُّه)
    insert into profile_name_changes (user_id, old_name, new_name, changed_by, approved, reason)
    values (new.id, btrim(old.full_name), btrim(new.full_name),
            (select id from profiles where id = auth.uid()), true, 'تعديل الاسم');
  end if;
  return null;
end;
$function$;

drop trigger if exists trg_log_profile_name_change on public.profiles;
create trigger trg_log_profile_name_change
  after update of full_name on public.profiles
  for each row execute function public.log_profile_name_change();

-- ٢) الأسماءُ التي حملتها الشهادةُ: الحاليُّ، وما قبله بتاريخ انتهائه
create or replace function public.certificate_names(p_kind text, p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user   uuid;
  v_issued timestamptz;
  v_prev   text;
  v_former jsonb := '[]'::jsonb;
  r        record;
begin
  if p_kind = 'participation' then
    select user_id, issued_at, btrim(holder_name) into v_user, v_issued, v_prev
    from participation_certificates where id = p_id;
  elsif p_kind = 'experience' then
    select user_id, created_at, btrim(holder_name) into v_user, v_issued, v_prev
    from experience_certificates where id = p_id;
  end if;
  if v_user is null then return null; end if;

  -- كلُّ تغييرٍ بعد الإصدار يختم اسمًا سابقًا بيومه ويفتح اسمًا جديدًا
  for r in
    select btrim(new_name) as nm, changed_at
    from profile_name_changes
    where user_id = v_user and changed_at > v_issued
    order by changed_at
  loop
    if r.nm <> '' and r.nm is distinct from v_prev then
      v_former := v_former || jsonb_build_array(jsonb_build_object(
        'name', v_prev, 'until', (r.changed_at at time zone 'Asia/Riyadh')::date));
      v_prev := r.nm;
    end if;
  end loop;

  -- الاسمُ الذي عاد إليه صاحبُه ليس سابقًا، والمكرَّرُ يُذكر مرّةً بآخر يومه
  select coalesce(jsonb_agg(e order by e->>'until'), '[]'::jsonb) into v_former
  from (
    select distinct on (e->>'name') e
    from jsonb_array_elements(v_former) e
    where e->>'name' is distinct from v_prev
    order by e->>'name', e->>'until' desc
  ) d;

  return jsonb_build_object('current', v_prev, 'former', v_former);
end;
$function$;

revoke all on function public.certificate_names(text, uuid) from public, anon, authenticated;
grant execute on function public.certificate_names(text, uuid) to service_role;

-- ٣) اسمُ الورقة عمودًا محسوبًا يُطلب في القراءة كسائر الأعمدة (`select=..., paper_name`)
create or replace function public.paper_name(c public.participation_certificates)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$ select certificate_names('participation', c.id) ->> 'current' $function$;

create or replace function public.paper_name(c public.experience_certificates)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$ select certificate_names('experience', c.id) ->> 'current' $function$;

revoke all on function public.paper_name(public.participation_certificates) from public, anon;
revoke all on function public.paper_name(public.experience_certificates) from public, anon;
grant execute on function public.paper_name(public.participation_certificates) to authenticated, service_role;
grant execute on function public.paper_name(public.experience_certificates) to authenticated, service_role;

-- ٤) بابُ التحقّق: الاسمُ الحاليّ، وما حملته الشهادةُ قبله
create or replace function public.verify_certificate(p_serial text)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
    -- شهادةُ المشاركة: عنوانُ الفرصة يقوم مقام المسمّى، ويومُها الواحد مبتدأً ومنتهًى
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
       'revoked_on', p.revoked_at::date
     )
     from participation_certificates p
     cross join lateral (select certificate_names('participation', p.id) as n) x
     where upper(btrim(p.serial)) = upper(btrim(p_serial))),
    jsonb_build_object('found', false)
  );
$function$;

notify pgrst, 'reload schema';
