-- العضوُ السابقُ زائر (قرار المالك ٢٠٢٦-١٠-٠٣)
--
-- من انتهت عضويّتُه — بطلبه أو بقرار الإدارة، أيًّا كان السبب — يعود صاحبَ حساب: يتطوّع
-- كغيره، وتُهدى إليه العضويّةُ من جديد إن رأت الإدارةُ عملَه.
--
-- وكان حدُّ العضويّة `joined_date` وحدَه، والتاريخُ لا يُمحى عند الإنهاء، فبقي المُنهاةُ
-- عضويّتُه «عضوًا» في عين القاعدة: يُردّ عن التطوّع بـ ALREADY_MEMBER، ويقرأ سجلّاتِ الناس
-- كلَّها عبر is_adeeb_staff وهو خارج النادي.
--
-- الحدُّ الجديد: `joined_date` قائمٌ **والعضويّةُ لم تُنهَ** (account_status <> 'suspended').
-- و`joined_date` و`terminated_at` و`termination_reason` تبقى أرشيفًا للعضويّة المنتهية كما كانت.

-- ١) حدُّ العضويّة
create or replace function public.is_adeeb_member(p_user uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and p.joined_date is not null
      and p.account_status is distinct from 'suspended'
  );
$function$;

comment on function public.is_adeeb_member(uuid) is
  'حدُّ العضويّة: انضمّ ولم تُنهَ عضويّتُه. العضوُ السابق (suspended) زائرٌ يتطوّع كغيره (٢٠٢٦-١٠-٠٣). نظيرُه في الكود isLiveMembership في lib/memberRecord.ts.';

-- ٢) إهداءُ العضويّة لمتطوّعٍ كان عضوًا: يعود عضوًا كاملًا بعضويّةٍ جديدةٍ تاريخُها يومُ الإهداء
create or replace function public.grant_membership_to_volunteer(p_user uuid, p_committee_id integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  v_actor uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_role  text;
  v_committee text;
  v_assign jsonb;
  v_prev  profiles%rowtype;
  v_returning boolean;
begin
  if v_actor is null or not check_user_permission(v_actor, 'manage_membership_applications') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN', 'message', 'صلاحيتك لا تبلغ منحَ العضويّة.');
  end if;
  if not exists (select 1 from volunteers where user_id = p_user and status = 'active') then
    return jsonb_build_object('ok', false, 'code', 'NOT_VOLUNTEER', 'message', 'العضويّةُ تُهدى لمتطوّعٍ نشط.');
  end if;
  if is_adeeb_member(p_user) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_MEMBER', 'message', 'هو عضوٌ أصلًا.');
  end if;

  select member_role_name, committee_name_ar into v_role, v_committee
  from committees where id = p_committee_id and is_active;
  if v_role is null then
    return jsonb_build_object('ok', false, 'code', 'NO_COMMITTEE', 'message', 'لا لجنةَ نشطةً بهذا المعرّف.');
  end if;

  select * into v_prev from profiles where id = p_user;
  v_returning := v_prev.account_status = 'suspended';

  -- الإسنادُ أوّلًا: لو ردّته سلطةُ الهيكلة لم يُكتب شيءٌ بعدُ
  v_assign := assign_position(v_actor, p_user, v_role, p_committee_id, null, false,
                              'إهداءُ عضويّةٍ لمتطوّع');
  if not coalesce((v_assign->>'ok')::boolean, false) then
    return v_assign;
  end if;

  if v_returning then
    -- عضوٌ سابقٌ يعود: الحالُ والتاريخُ في كتابةٍ واحدة (حارسُ المنتهية يردّ تعديلَ التاريخ وحده)،
    -- والعضويّةُ السابقةُ تُحفظ في السجلّ أدناه
    perform set_config('app.membership_gate', 'open', true);
    update profiles
    set account_status = 'active', termination_reason = null, joined_date = v_today, updated_at = now()
    where id = p_user;
    perform set_config('app.membership_gate', '', true);

    -- سجلُّ التفاصيل جُمّد على اسم يوم الخروج، فيلحق اسمَه الحاليّ
    update member_details md
    set full_name_triple = p.full_name, updated_at = now()
    from profiles p
    where p.id = p_user and md.user_id = p_user
      and coalesce(btrim(p.full_name), '') <> ''
      and md.full_name_triple is distinct from p.full_name;
  else
    update profiles set joined_date = coalesce(joined_date, v_today) where id = p_user;
  end if;

  update volunteers
  set status = 'former', ended_at = now(), ended_by = v_actor, end_reason = 'نال العضويّة'
  where user_id = p_user;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (v_actor, 'grant_membership', 'profile', p_user::text,
          jsonb_build_object('committee_id', p_committee_id, 'role', v_role, 'joined_date', v_today)
          || case when v_returning then jsonb_build_object(
               'returning', true,
               'previous_joined_date', v_prev.joined_date,
               'previous_terminated_at', v_prev.terminated_at,
               'previous_termination_reason', v_prev.termination_reason)
             else '{}'::jsonb end);

  return jsonb_build_object('ok', true, 'message',
    format('صار عضوًا في %s، وانتهى تطوّعُه.', v_committee));
end;
$function$;

-- ٣) صفُّ العضو السابق في profiles حسابُ زائرٍ حيّ: يحرّر اسمَه وجوّالَه ومدينتَه من /me.
--    أمّا أرشيفُ العضويّة المنتهية (member_details) فيبقى مجمّدًا بحارسه كما هو.
create or replace function public.guard_terminated_membership_profile()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
declare
    allowed constant text[] := array[
      'account_status', 'terminated_at', 'termination_reason', 'updated_at',
      'deletion_requested_at', 'deletion_reason', 'deleted_at', 'accepts_marketing',
      -- ما يحرّره الزائرُ عن نفسه (saveMyData) — العضوُ السابقُ زائر (٢٠٢٦-١٠-٠٣)
      'full_name', 'phone', 'city'
    ];
begin
    if old.account_status is distinct from 'suspended'
       or new.account_status is distinct from 'suspended' then
        return new;
    end if;

    if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
        raise exception 'عضويّة منتهية لا تُحرَّر بياناتها (العضو %). أعِد العضوية أوّلًا ثمّ عدّلها.', old.id
            using errcode = '42501';
    end if;

    return new;
end;
$function$;

-- ٤) ومزامنةُ الاسم لا تمسّ أرشيفَ العضويّة المنتهية (وإلّا ردّها حارسُه فسقط تعديلُ الاسم كلُّه)
create or replace function public.sync_full_name_from_profiles()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
BEGIN
    IF NEW.full_name IS NULL OR NEW.full_name = '' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.full_name IS NOT DISTINCT FROM OLD.full_name THEN
        RETURN NEW;
    END IF;

    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{full_name}',
        to_jsonb(NEW.full_name)
    )
    WHERE id = NEW.id
      AND (raw_user_meta_data->>'full_name') IS DISTINCT FROM NEW.full_name;

    IF NEW.account_status IS DISTINCT FROM 'suspended' THEN
        UPDATE public.member_details
        SET full_name_triple = NEW.full_name,
            updated_at       = now()
        WHERE user_id = NEW.id
          AND full_name_triple IS DISTINCT FROM NEW.full_name;
    END IF;

    RETURN NEW;
END;
$function$;
