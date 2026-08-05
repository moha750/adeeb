-- ══════════════════════════════════════════════════════════════════════════════
-- م١ — **هويّةٌ واحدة**: `profiles` بيتُ كلِّ صاحبِ حساب، والعضويّةُ علاقةٌ لا هويّة
--
-- كان في القاعدة جدولا هويّةٍ متوازيان على مفتاحٍ واحد (`auth.users.id`): `profiles`
-- للأعضاء و`visitors` للزوّار. فانشقّ كلُّ ما بُني فوقهما: `activity_reservations`
-- تحمل عمودين لمعنًى واحد، وستُّ دوالَّ تتفرّع `COALESCE(v.…, p.…)`، وكلُّ ميزةٍ قادمة
-- (شهادات · تعليقات · إذاعة) كانت ستُبنى مرّتين وتُصان مرّتين.
--
-- والدواءُ ليس جسرًا بين الجدولين — بل **أن يكون الجدولُ واحدًا**: `profiles` هو
-- الشخصُ صاحبُ الحساب، والعضويّةُ **واقعةٌ تُقرأ فيه**: `joined_date`. من له تاريخُ
-- انضمامٍ فهو عضو، ومن لا فهو صاحبُ حسابٍ لم ينضمّ بعد. ولا عمودَ حالةٍ جديد يُكتب
-- ويُنسى — التاريخُ نفسُه هو الشهادة، وهو موجودٌ في الجدول منذ يومه الأوّل.
--
-- ولمَ `joined_date` لا `member_details`؟ لأنّ نقصَ السجلّ حالةٌ يعالجها `/complete`،
-- وليس نفيًا للعضويّة — فالعضوُ الذي لم يُكمل بياناتِه عضوٌ، وثمانيةٌ وعشرون عضوًا
-- عندنا كذلك. ولأنّ الأعضاءَ المئةَ والسبعةَ والثمانين **كلَّهم** لهم تاريخُ انضمام
-- (فُحص: صفرُ استثناء)، فالحدُّ قاطعٌ لا يُخطئ أحدًا.
-- ══════════════════════════════════════════════════════════════════════════════


-- ═══ ١) الجدولُ يتّسع لمن ليس عضوًا ═══════════════════════════════════════════

-- المدينةُ ورضا التسويق كانا في `visitors` — وهما صفةُ شخصٍ لا صفةُ زائر، فينتقلان.
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists accepts_marketing boolean not null default false;

-- وتاريخُ الانضمام يصير قابلًا للفراغ: **فراغُه هو معنى «ليس عضوًا»**.
alter table public.profiles alter column joined_date drop not null;

comment on column public.profiles.joined_date is
  'تاريخُ الانضمام للعضويّة — وفراغُه يعني: صاحبُ حسابٍ لم ينضمّ. هو حدُّ العضويّة في القاعدة كلِّها (is_adeeb_member).';


-- ═══ ٢) ترحيلُ الزوّار إلى بيتهم الجديد ═══════════════════════════════════════
--
-- `on conflict do nothing` لأجل واحدٍ كان زائرًا ثمّ صار عضوًا — صفُّه العضويّ أَولى.
-- والجوّالُ يُنقّى من المحارف الدخيلة ثمّ يُقتصر على عشرة: صفٌّ واحدٌ من ١٤٩ كان
-- مكرَّرَ الرقم (٣١ محرفًا) ففُحص أنّ تنقيتَه تُخرج رقمًا صحيحًا.
insert into public.profiles
  (id, full_name, email, phone, gender, city, accepts_marketing, account_status, joined_date, created_at, updated_at)
select
  v.id,
  v.full_name,
  v.email,
  left(regexp_replace(v.phone, '\D', '', 'g'), 10),
  v.gender,
  v.city,
  coalesce(v.accepts_marketing, false),
  'active',      -- حسابُه يعمل
  null,          -- ولم ينضمّ
  v.created_at,
  v.updated_at
from public.visitors v
on conflict (id) do nothing;


-- ═══ ٣) حدُّ العضويّة — مصدرٌ واحدٌ يُقرأ من كلّ مكان ══════════════════════════

-- وُلدت في م٠ تسأل «أله صفٌّ في profiles؟» لأنّ الجدولَ كان للأعضاء وحدهم. وقد
-- اتّسع الجدولُ الآن، فيتغيّر **جسدُها وحدَه** — ولا تُمسّ سياسةٌ ولا دالّةٌ تناديها.
create or replace function public.is_adeeb_member(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user and p.joined_date is not null
  );
$$;

-- و«عضوٌ نشط» = العضويّة + حالُ الحساب. كانت تقيس الحالَ وحدَه فتَعُدّ الزائرَ عضوًا.
create or replace function public.survey_is_active_member(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.joined_date is not null
      and p.account_status = 'active'
  );
$$;


-- ═══ ٤) `members` — الكشفُ الذي لا يخطئ ═══════════════════════════════════════
--
-- بعد اتّساع `profiles` صار كلُّ من يقرأ الجدولَ كشفًا يقرأ الزوّارَ معه. وبدل أن
-- يُنثر شرطُ «العضويّة» في كلّ شاشةٍ واستعلام (فيُنسى في واحدٍ يومًا) — عرضٌ واحدٌ
-- اسمُه ما يعنيه. والأعمدةُ مسمّاةٌ صراحةً: هذا **عقدُ** ما يُعرض عن العضو، ومن زاد
-- عمودًا في `profiles` يقرّر بنفسه أيدخل العقدَ أم لا.
--
-- و`security_invoker` مرفوعٌ لئلّا يصير العرضُ بابًا خلفيًّا يتخطّى سياسات `profiles`.
create or replace view public.members
with (security_invoker = on) as
select
  id, full_name, email, phone, avatar_url, bio, username, gender,
  account_status, joined_date, termination_reason, terminated_at,
  city, created_at, updated_at
from public.profiles
where joined_date is not null;

comment on view public.members is
  'الأعضاءُ وحدهم من `profiles` (له تاريخُ انضمام). كلُّ كشفِ أعضاءٍ يقرأ من ههنا لا من الجدول.';

grant select on public.members to authenticated;


-- ═══ ٥) بابُ الزائر إلى صفِّه — يُنشئ حسابًا ولا يُنشئ عضويّة ═════════════════
--
-- أُغلق الإدراجُ المباشر في `profiles` على القدرة (م٠) لئلّا يُعلن أحدٌ عضويّةَ نفسه.
-- والزائرُ يحتاج صفًّا. فهذه الدالّةُ هي البابُ الوحيد: تكتب صفَّه بـ`joined_date`
-- فارغًا — **فيملك حسابًا ولا يملك أن يجعل نفسه عضوًا**.
create or replace function public.create_my_account_profile(
  p_full_name         text,
  p_phone             text,
  p_gender            text,
  p_city              text    default null,
  p_accepts_marketing boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name  text := btrim(coalesce(p_full_name, ''));
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.profiles where id = v_user) then raise exception 'PROFILE_EXISTS'; end if;
  if v_name = ''                              then raise exception 'NAME_REQUIRED';  end if;
  if p_gender not in ('male', 'female')       then raise exception 'GENDER_REQUIRED'; end if;
  if v_phone !~ '^05[0-9]{8}$'                then raise exception 'PHONE_INVALID';  end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.profiles
    (id, full_name, email, phone, gender, city, accepts_marketing, account_status, joined_date)
  values
    (v_user, v_name, v_email, v_phone, p_gender,
     nullif(btrim(coalesce(p_city, '')), ''), coalesce(p_accepts_marketing, false),
     'active', null);
end;
$$;

grant execute on function public.create_my_account_profile(text, text, text, text, boolean) to authenticated;


-- ═══ ٦) الحجزُ يعرف صاحبًا واحدًا ═════════════════════════════════════════════

alter table public.activity_reservations add column if not exists user_id uuid;

update public.activity_reservations
set user_id = coalesce(visitor_id, member_user_id)
where user_id is null;

alter table public.activity_reservations alter column user_id set not null;

alter table public.activity_reservations
  add constraint activity_reservations_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- ومقعدٌ واحدٌ للشخص في الفعاليّة — كان الشرطُ في الدالّة وحدها، فصار في القاعدة.
create unique index if not exists activity_reservations_one_confirmed_seat
  on public.activity_reservations (activity_id, user_id)
  where status = 'confirmed';

drop policy if exists reservations_select_own on public.activity_reservations;
create policy reservations_select_own on public.activity_reservations
  for select to authenticated
  using (
    user_id = auth.uid()
    or check_user_permission(auth.uid(), 'manage_activities')
  );


-- ═══ ٧) الدوالُّ الستُّ تُشطب فيها الشوكة ═════════════════════════════════════

create or replace function public.book_activity_seat(p_activity_id uuid)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_user_id      uuid := auth.uid();
    v_activity     activities%rowtype;
    v_gender       text;
    v_booked_count integer;
    v_capacity     integer;
    v_existing_id  uuid;
    v_new_id       uuid;
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;

    select * into v_activity from activities where id = p_activity_id for update;
    if not found                            then raise exception 'ACTIVITY_NOT_FOUND';     end if;
    if v_activity.is_published = false      then raise exception 'ACTIVITY_NOT_PUBLISHED'; end if;
    if v_activity.is_cancelled = true       then raise exception 'ACTIVITY_CANCELLED';     end if;
    if v_activity.activity_date < current_date then raise exception 'ACTIVITY_PAST';       end if;

    -- بيتٌ واحدٌ يُسأل — لا زائرٌ ثمّ عضو
    select gender into v_gender from profiles where id = v_user_id;
    if v_gender is null then raise exception 'GENDER_REQUIRED'; end if;

    if v_activity.target_gender is not null and v_activity.target_gender <> v_gender then
        raise exception 'WRONG_GENDER';
    end if;

    select id into v_existing_id from activity_reservations
    where activity_id = p_activity_id and user_id = v_user_id and status = 'confirmed';
    if v_existing_id is not null then raise exception 'ALREADY_BOOKED'; end if;

    if v_activity.total_seats is not null then
        if v_activity.male_seats is null then
            select count(*) into v_booked_count from activity_reservations
            where activity_id = p_activity_id and status = 'confirmed';
            if v_booked_count >= v_activity.total_seats then raise exception 'NO_SEATS_AVAILABLE'; end if;
        else
            select count(*) into v_booked_count from activity_reservations
            where activity_id = p_activity_id and gender_at_booking = v_gender and status = 'confirmed';
            v_capacity := case when v_gender = 'male' then v_activity.male_seats else v_activity.female_seats end;
            if v_booked_count >= v_capacity then raise exception 'NO_SEATS_AVAILABLE_FOR_GENDER'; end if;
        end if;
    end if;

    insert into activity_reservations (activity_id, user_id, gender_at_booking)
    values (p_activity_id, v_user_id, v_gender)
    returning id into v_new_id;

    return v_new_id;
end;
$$;


create or replace function public.cancel_activity_reservation(p_reservation_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_user_id       uuid := auth.uid();
    v_reservation   activity_reservations%rowtype;
    v_activity_date date;
    v_reason        text := nullif(btrim(p_reason), '');
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
    if v_reason  is null then raise exception 'REASON_REQUIRED';   end if;

    select * into v_reservation from activity_reservations where id = p_reservation_id for update;
    if not found then raise exception 'RESERVATION_NOT_FOUND'; end if;

    if v_reservation.user_id is distinct from v_user_id then raise exception 'NOT_OWNER'; end if;

    if v_reservation.status = 'cancelled' then return true; end if;

    select activity_date into v_activity_date from activities where id = v_reservation.activity_id;
    if v_activity_date < current_date then raise exception 'ACTIVITY_PAST'; end if;

    update activity_reservations
    set status = 'cancelled', cancelled_at = now(), cancellation_reason = v_reason
    where id = p_reservation_id;

    return true;
end;
$$;


-- ملحوظةٌ في الثلاث التالية: `account_type` كان يُقرأ من **كيفيّة الحجز** (أيُّ عمودٍ
-- امتلأ)، وصار يُقرأ من **حال الشخص اليوم**. فمن حجز زائرًا ثمّ نال العضويّة يظهر
-- عضوًا — وهذا أصدقُ: الكشفُ يصف الناس لا يصف تاريخَ الصفوف.
create or replace function public.get_activity_attendance_list(p_activity_id uuid)
returns table(reservation_id uuid, full_name text, phone text, gender text, account_type text,
              attendance_status text, attended_at timestamp with time zone,
              whatsapp_confirmed_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_user_id uuid := auth.uid();
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
    if not check_user_permission(v_user_id, 'manage_activities') then raise exception 'NOT_AUTHORIZED'; end if;

    return query
    select r.id, p.full_name, p.phone, r.gender_at_booking,
           case when p.joined_date is not null then 'member' else 'visitor' end,
           r.attendance_status, r.attended_at, r.whatsapp_confirmed_at
    from activity_reservations r
    join profiles p on p.id = r.user_id
    where r.activity_id = p_activity_id and r.status = 'confirmed'
    order by p.full_name;
end;
$$;


create or replace function public.get_activity_full_details(p_activity_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_user_id       uuid := auth.uid();
    v_is_admin      boolean;
    v_activity      activities%rowtype;
    v_window_close  timestamptz;
    v_activity_json jsonb;
    v_stats         jsonb;
    v_reservations  jsonb;
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    if not v_is_admin then raise exception 'NOT_AUTHORIZED'; end if;

    select * into v_activity from activities where id = p_activity_id;
    if v_activity.id is null then raise exception 'ACTIVITY_NOT_FOUND'; end if;

    v_window_close := (v_activity.activity_date
                       + coalesce(v_activity.end_time, v_activity.start_time + interval '1 hour')
                      )::timestamptz + interval '1 hour';

    select to_jsonb(a) into v_activity_json from activities a where a.id = p_activity_id;

    select jsonb_build_object(
        'registered_count',          count(*) filter (where r.status = 'confirmed'),
        'whatsapp_confirmed_count',  count(*) filter (where r.status = 'confirmed' and r.whatsapp_confirmed_at is not null),
        'attended_count',            count(*) filter (where r.attendance_status = 'attended'),
        'no_show_count',             count(*) filter (
            where r.status = 'confirmed' and r.attendance_status = 'registered'
              and not v_activity.is_cancelled and now() > v_window_close),
        'pending_attendance_count',  count(*) filter (
            where r.status = 'confirmed' and r.attendance_status = 'registered'
              and (v_activity.is_cancelled or now() <= v_window_close)),
        'certificates_issued_count', count(*) filter (where r.certificate_serial is not null),
        'certificates_sent_count',   count(*) filter (where r.certificate_sent_at is not null),
        'cancelled_count',           count(*) filter (where r.status = 'cancelled'),
        'attendance_rate',           case
            when count(*) filter (where r.status = 'confirmed') = 0 then 0
            else round(count(*) filter (where r.attendance_status = 'attended')::numeric
                 / count(*) filter (where r.status = 'confirmed')::numeric, 4) end
    ) into v_stats from activity_reservations r where r.activity_id = p_activity_id;

    select coalesce(jsonb_agg(row_data order by row_data->>'reserved_at' desc), '[]'::jsonb)
    into v_reservations from (
        select jsonb_build_object(
            'id', r.id,
            'full_name', p.full_name,
            'phone', p.phone,
            'email', p.email,
            'gender_at_booking', r.gender_at_booking,
            'account_type', case when p.joined_date is not null then 'member' else 'visitor' end,
            'status', r.status,
            'reserved_at', r.reserved_at,
            'cancelled_at', r.cancelled_at,
            'whatsapp_confirmed_at', r.whatsapp_confirmed_at,
            'attendance_status', case
                when r.attendance_status = 'attended' then 'attended'
                when r.status = 'confirmed' and not v_activity.is_cancelled and now() > v_window_close then 'no_show'
                else 'registered' end,
            'attended_at', r.attended_at,
            'certificate_serial', r.certificate_serial,
            'certificate_sent_at', r.certificate_sent_at
        ) as row_data
        from activity_reservations r
        join profiles p on p.id = r.user_id
        where r.activity_id = p_activity_id
    ) t;

    return jsonb_build_object('activity', v_activity_json, 'stats', v_stats, 'reservations', v_reservations);
end;
$$;


create or replace function public.get_certificate_data(p_serial text)
returns table(holder_name text, holder_gender text, activity_name text,
              activity_date date, activity_type text, issued_at timestamp with time zone)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
    if p_serial is null or p_serial = '' then return; end if;

    return query
    select p.full_name, r.gender_at_booking, a.name, a.activity_date, a.activity_type, r.attended_at
    from activity_reservations r
    join activities a on a.id = r.activity_id
    join profiles   p on p.id = r.user_id
    where r.certificate_serial = p_serial
      and r.attendance_status  = 'attended';
end;
$$;


create or replace function public.list_certificates_for_send()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_user_id  uuid := auth.uid();
    v_is_admin boolean;
    v_rows     jsonb;
begin
    if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
    v_is_admin := check_user_permission(v_user_id, 'manage_activities');
    if not v_is_admin then raise exception 'NOT_AUTHORIZED'; end if;

    select coalesce(jsonb_agg(row_data order by row_data->>'attended_at' desc nulls last), '[]'::jsonb)
    into v_rows from (
        select jsonb_build_object(
            'id', r.id,
            'full_name', p.full_name,
            'phone', p.phone,
            'gender_at_booking', r.gender_at_booking,
            'account_type', case when p.joined_date is not null then 'member' else 'visitor' end,
            'certificate_serial', r.certificate_serial,
            'attended_at', r.attended_at,
            'certificate_sent_at', r.certificate_sent_at,
            'activity_id', a.id,
            'activity_name', a.name,
            'activity_date', a.activity_date,
            'activity_type', a.activity_type
        ) as row_data
        from activity_reservations r
        join activities a on a.id = r.activity_id
        join profiles   p on p.id = r.user_id
        where r.certificate_serial is not null and r.attendance_status = 'attended'
    ) t;

    return v_rows;
end;
$$;


-- ═══ ٨) الكشفان اللذان كانا يمسحان `profiles` كلَّه ══════════════════════════
--
-- كانا يمرّان على الجدول ويحكّمان دالّةَ سلطة. وقد اتّسع الجدول، فصارا يمرّان على
-- الزوّار أيضًا — والزائرُ ليس ممّن يُشهَد له أو تُنهى عضويّتُه. فيقرآن من `members`.
create or replace function public.members_i_may_certify(p_actor uuid)
returns table(user_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select m.id from members m where can_issue_certificate(p_actor, m.id);
$$;

create or replace function public.members_in_my_reach(p_actor uuid)
returns table(user_id uuid, may_end boolean, may_edit boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select m.id, can_end_membership(p_actor, m.id), can_edit_member_data(p_actor, m.id)
  from members m
  where can_edit_member_data(p_actor, m.id) or can_end_membership(p_actor, m.id);
$$;


-- ═══ ٩) الشوكةُ تُنزع من الجدول ═══════════════════════════════════════════════
alter table public.activity_reservations drop column visitor_id;
alter table public.activity_reservations drop column member_user_id;

comment on column public.activity_reservations.user_id is
  'صاحبُ الحجز — عضوًا كان أو صاحبَ حساب. خلَفُ العمودين المنشقّين (visitor_id/member_user_id).';


-- ═══ ١٠) `visitors` يُحنَّط ولا يُدفن هذه الجولة ══════════════════════════════
--
-- نُقل ما فيه ولم يعد يُقرأ ولا يُكتب. ويبقى نسخةً محفوظةً حتّى يُتحقَّق من الحجز
-- والشهادات في الحيّ، ثمّ يُسقَط بأمرٍ صريح. وتُنزع صلاحيّاتُه من الواجهة الآن
-- لئلّا يبقى بابًا مفتوحًا على بياناتٍ صار لها بيتٌ آخر.
revoke all on public.visitors from anon, authenticated;

comment on table public.visitors is
  'محنَّطٌ (٢٠٢٦-٠٨-٠٥): رُحّل أهلُه إلى `profiles` بـ`joined_date` فارغ. لا يُقرأ ولا يُكتب — ويُسقَط بأمرٍ بعد التحقّق.';
