-- **لا يزيل صاحبُ المنصب نفسَه** — قرارُ المالك ٢٠ أغسطس ٢٠٢٦.
--
-- كان الرئيسان يملكان مقعدَ نفسيهما، وزيد المستشارُ إليهما بالأمس ليُخلي مقعدَه بيده. فقضى
-- المالكُ بأنّ **صاحبَ المنصب لا يزيله عن نفسه، وإنّما يزيل ما دونه**. فيسقط بذلك بابٌ كامل:
-- `vacate_seat` لم يعد له أهل، وصار الخروجُ من المقاعد القياديّة كلِّها **طلبًا يُقرّه من فوقه**.
--
-- **وثغرةٌ صرّح بها لا يسدّها**: رئيسُ النادي لا يزيله أحدٌ ولا يزيل نفسَه، فلا مخرجَ لمقعده
-- من الشاشات ألبتّة (وحارسُ `revoke_position` يمنعه أصلًا منذ نشأته). فاختار المالكُ أن
-- **يُقال له ذلك صراحةً** لا أن يُفتَح له باب: بابٌ رابعٌ اسمُه `sealed` يقول الحقيقة ولا يَعِد.
--
-- **ومدى القاعدة محصورٌ بأمره**: النزعُ يبقى عند الأربعة (الرئيسان وقائدا الإدارتين)، ولا
-- ينزل على المنسّق وقائد اللجنة — فقرارُ نزعِ الإسناد عن قائد اللجنة قائمٌ لم يُنقَض.
--
-- **وإنهاءُ العضويّة ليس من هذا الباب**: عضوُ اللجنة يُنهي عضويّتَه بزرٍّ فتُطفأ مقاعدُه معها،
-- وذلك فعلُ خروجٍ من النادي لا نزعُ منصبٍ من الهيكل. القاعدةُ ههنا في `position_authority`
-- وحدها: من يزيل من **غيرِه**.

begin;

-- ── ١. تُنزَع النفسُ من مقاعد الرئيسين، ويُعدَم صفُّ المستشار ──────────────────
update public.position_authority
   set target_roles = array_remove(target_roles, 'club_president'),
       note = 'رئيس النادي — كلّ منصبٍ في كلّ وحدة، إلّا مقعدَه هو (2026-08-20: لا يزيل صاحبُ المنصب نفسَه).'
 where role_name = 'club_president';

update public.position_authority
   set target_roles = array_remove(target_roles, 'executive_council_president'),
       note = 'رئيس المجلس التنفيذيّ — كلّ منصبٍ إلّا رئاسةَ النادي ومقعدَه هو (2026-08-20).'
 where role_name = 'executive_council_president';

-- والمستشارُ لا يزيل أحدًا: صفُّه أُنشئ أمس ليُخلي مقعدَه بنفسه، وقد سقطت علّتُه
delete from public.position_authority where role_name = 'president_advisor';

-- ── ٢. البابُ الرابع: مقعدٌ لا مخرجَ منه ───────────────────────────────────────
-- `sealed` لرئيس النادي وحدَه: لا يزيله أحدٌ ولا يزيل نفسَه. والصدقُ أن يُقال، لا أن يُعرَض
-- زرٌّ يردّه الحارسُ بعد الضغط.
create or replace function public.membership_exit_door(p_user uuid)
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'club_president')
      then 'sealed'
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name <> 'committee_member')
      then 'request'
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active)
      or exists (select 1 from profiles p where p.id = p_user
                   and p.joined_date is not null and p.account_status = 'active')
      then 'end_now'
    else 'delete'
  end;
$$;

comment on function public.membership_exit_door(uuid) is
  'أيُّ بابِ خروجٍ يرى صاحبُ الحساب: sealed | request | end_now | delete (2026-08-20). مصدرٌ واحدٌ للشاشات وللدوالّ.';

-- ── ٣. والقاضي يتبع المقعد، ولا يقضي أحدٌ في طلب نفسه ─────────────────────────
-- زيد سطران: رئيسُ المجلس يقضي في طلبه رئيسُ النادي وحدَه (فمن فوقه واحد)، والمستشارُ
-- يقضي في طلبه الرئيسان.
create or replace function public.exit_decider_roles(p_user uuid)
returns text[]
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'executive_council_president')
      then array['club_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'president_advisor')
      then array['club_president', 'executive_council_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name in ('hr_committee_leader', 'qa_committee_leader'))
      then array['club_president', 'executive_council_president']
    when exists (select 1 from user_roles ur where ur.user_id = p_user and ur.is_active
                   and ur.role_name = 'qa_admin_member')
      then array['club_president', 'executive_council_president', 'qa_committee_leader']
    else array['club_president', 'executive_council_president', 'hr_committee_leader']
  end;
$$;

-- ── ٤. وبابُ الحذف يقول للمختوم مقعدُه ما يقوله للشاشة ────────────────────────
create or replace function public.request_my_account_deletion(p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid  uuid := auth.uid();
  v_door text;
  v_at   timestamptz;
  v_gone timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  select p.deletion_requested_at, p.deleted_at into v_at, v_gone
  from public.profiles p where p.id = v_uid;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'no_profile', 'message', 'لا سجلَّ لحسابك.');
  end if;

  if v_gone is not null then
    return jsonb_build_object('ok', false, 'code', 'already_deleted', 'message', 'هذا الحسابُ محذوفٌ أصلًا.');
  end if;

  v_door := membership_exit_door(v_uid);
  if v_door = 'sealed' then
    return jsonb_build_object('ok', false, 'code', 'sealed', 'door', v_door,
      'message', 'مقعدُ رئيس النادي محميٌّ في القاعدة: لا يُخليه أحدٌ ولا تُخليه أنت، فلا سبيل إلى حذف الحساب من هنا.');
  elsif v_door = 'request' then
    return jsonb_build_object('ok', false, 'code', 'needs_request', 'door', v_door,
      'message', 'منصبُك يسبق حسابَك: اطلب إنهاء عضويّتك أوّلًا، فإذا أُقرّ صرتَ صاحبَ حسابٍ ولك الحذف.');
  elsif v_door = 'end_now' then
    return jsonb_build_object('ok', false, 'code', 'needs_end', 'door', v_door,
      'message', 'أنهِ عضويّتَك أوّلًا، ثمّ احذف حسابَك إن شئت.');
  end if;

  if v_at is not null then
    return jsonb_build_object('ok', true, 'code', 'already_requested', 'at', v_at,
                              'dueAt', v_at + interval '30 days', 'message', 'طلبُك قائمٌ من قبل.');
  end if;

  update public.profiles
     set deletion_requested_at = now(),
         deletion_reason       = nullif(btrim(coalesce(p_reason, '')), ''),
         accepts_marketing     = false,
         updated_at            = now()
   where id = v_uid
  returning deletion_requested_at into v_at;

  insert into public.activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'request_account_deletion', 'profile', v_uid::text,
          jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), ''),
                             'dueAt', v_at + interval '30 days'));

  return jsonb_build_object('ok', true, 'code', 'requested', 'at', v_at, 'dueAt', v_at + interval '30 days');
end;
$$;

commit;
