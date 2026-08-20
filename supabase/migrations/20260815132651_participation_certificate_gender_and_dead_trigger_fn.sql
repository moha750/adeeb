-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815132651   الاسم: participation_certificate_gender_and_dead_trigger_fn

-- (١) جنسُ صاحبها لقطةً: القالبُ يتبع صاحبَه (ذكر/أنثى)، فلو قُرئ وقتَ الرسم لَتبدّلت ورقةٌ
-- سُلّمت. واللقطةُ تُخزَّن ولا تُشتقّ — كما في سائر حقول الشهادة.
alter table public.participation_certificates
  add column if not exists holder_gender text check (holder_gender in ('male','female'));

create or replace function public.issue_participation_certificate(p_application_id uuid)
returns jsonb
language plpgsql security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_app   volunteer_applications%rowtype;
  v_opp   volunteer_opportunities%rowtype;
  v_name  text;
  v_gender text;
  v_committee text;
  v_serial text;
  v_id uuid;
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_volunteering') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ إدارة التطوّع.');
  end if;

  select * into v_app from volunteer_applications where id = p_application_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا التقديم.');
  end if;
  if v_app.status <> 'accepted' or v_app.attendance is distinct from 'attended' then
    return jsonb_build_object('ok', false, 'code', 'NOT_ATTENDED', 'message', 'الشهادةُ لمن حضر من المقبولين.');
  end if;
  if v_app.deserves_certificate is not true then
    return jsonb_build_object('ok', false, 'code', 'NOT_DESERVING', 'message', 'لم يُسجَّل استحقاقُه للشهادة.');
  end if;
  if exists (select 1 from participation_certificates where application_id = p_application_id and status = 'active') then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_ISSUED', 'message', 'صدرت شهادتُه من قبل.');
  end if;

  select * into v_opp from volunteer_opportunities where id = v_app.opportunity_id;
  select btrim(full_name), gender into v_name, v_gender from profiles where id = v_app.user_id;
  if v_name is null or char_length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'code', 'NO_NAME', 'message', 'اسمُ المتطوّع ناقص.');
  end if;
  select committee_name_ar into v_committee from committees where id = v_opp.committee_id;

  v_serial := 'ADEEB-VOL-' || extract(year from v_today)::text || '-'
              || lpad(nextval('participation_certificate_serial_seq')::text, 4, '0') || '-'
              || upper(encode(gen_random_bytes(3), 'hex'));

  delete from participation_certificates where application_id = p_application_id and status = 'revoked';

  insert into participation_certificates
    (application_id, user_id, serial, holder_name, holder_gender, opportunity_title, committee_name,
     served_from, served_to, issued_by)
  values
    (p_application_id, v_app.user_id, v_serial, v_name, v_gender, v_opp.title, v_committee,
     v_opp.starts_on, v_opp.ends_on, v_actor)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'issue_participation_certificate', 'profile', v_app.user_id::text,
          jsonb_build_object('certificate_id', v_id, 'serial', v_serial, 'opportunity', v_opp.title));

  return jsonb_build_object('ok', true, 'id', v_id, 'serial', v_serial,
    'message', format('صدرت شهادةُ المشاركة برقم %s.', v_serial));
end;
$$;

-- (٢) **حذفُ `handle_new_user`** بإذن المالك (١٥ أغسطس ٢٠٢٦): دالّةٌ بلا مُطلِق تُنشئ صفَّ
-- `profiles` بلا جوّال، ولو أحياها أحدٌ لَسقط كلُّ تسجيلٍ جديدٍ على `phone NOT NULL`.
-- وخلَفُها الحيّ `create_my_account_profile` (تكتب بجوّالٍ مصدَّق وبلا `joined_date`).
drop function if exists public.handle_new_user();
