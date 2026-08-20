-- **بابُ حذف الحساب** — الطلبُ والمهلةُ والإلغاءُ والتنفيذ.
--
-- يتلو `20260819_deletion_01_archive_independence.sql` ولا يقوم بدونه: التنفيذُ ههنا يحذف
-- صفَّ المصادقة، ولولا فكُّ القيدِ هناك لهدم الأرشيفَ معه.
--
-- **والقراراتُ الأربعةُ التي بُني عليها** (المالك، ١٩ أغسطس ٢٠٢٦):
--   ١. مهلةُ ثلاثين يومًا بين الطلب والتنفيذ، يُلغيها صاحبُها بضغطة.
--   ٢. العضوُ يمضي بنفسه، **إلّا حاملَ المنصب** فيُمنع حتى يُعفى منه — لئلّا يخلو مقعدٌ في
--      الهيكل صامتًا فلا يعلم به أحد.
--   ٣. الأرشيفُ يبقى كاملًا لا يُشطب منه شيء.
--   ٤. البابُ ثلاثةٌ: `/me` وإعداداتُ اللوحة وتبويبُ «أنا» في التطبيق.
--
-- **والحذفُ واقعةٌ تُقرأ لا حالةٌ تُكتب**: لم يُزَد في `account_status` قيمةٌ رابعة — قيدُه
-- ثلاثٌ وحارسُه يمنع الكتابةَ المباشرة حتى بمفتاح الخدمة — بل عمودانِ يحملان تاريخين، على
-- سنّةِ `terminated_at` و`volunteers.ended_at` في هذا المستودع.

begin;

-- ── ١. الواقعةُ في عمودين ونصف ─────────────────────────────────────────────────
alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_reason       text,
  add column if not exists deleted_at            timestamptz;

comment on column public.profiles.deletion_requested_at is
  'متى طلب صاحبُ الحساب حذفَه. المهلةُ ثلاثون يومًا منها، ويُلغى الطلبُ بتفريغ العمود.';
comment on column public.profiles.deletion_reason is
  'ما كتبه صاحبُه سببًا، إن كتب. يُقرأ للتحسين لا للمحاسبة.';
comment on column public.profiles.deleted_at is
  'متى نُفِّذ الحذفُ فعلًا: مات الدخولُ وبقي الأرشيف. الصفُّ بعده سجلٌّ لا حساب.';

-- ولا يُمنَح `authenticated` قراءةَ هذه الأعمدة: شاشاتُ «نفسي» تقرأ بمفتاح الخدمة أصلًا
-- (`lib/auth.ts`)، فلا حاجةَ إلى توسيع سطحٍ عامّ لأجل ثلاثةِ حقول.

-- ── ١٫٥. البريدُ يتحرّر بذهاب صاحبه ────────────────────────────────────────────
-- `profiles.email` فريدٌ منذ نشأته، وذلك صوابٌ ما دام الصفُّ حسابًا. فإذا صار الصفُّ
-- **أرشيفًا** انقلب الفريدُ سجنًا: من حذف حسابه ثمّ عاد بعد سنةٍ يريد الانضمام من جديد،
-- ردَّه بريدُه المحفوظُ في أرشيفه هو (`create_my_account_profile` يُدخِل بلا `on conflict`،
-- فيسقط بـ23505 ولا يفهم صاحبُه لماذا).
--
-- فيصير الفريدُ **على الأحياء وحدهم**: فهرسٌ جزئيٌّ بشرط `deleted_at is null`. لا حسابان
-- ببريدٍ واحد أبدًا، والأرشيفُ لا يزاحم الحيّ.
alter table public.profiles drop constraint profiles_email_key;

create unique index if not exists profiles_email_live_key
  on public.profiles (email) where deleted_at is null;

comment on index public.profiles_email_live_key is
  'البريدُ فريدٌ بين الحسابات الحيّة وحدها — فأرشيفُ من ذهب لا يمنعه أن يعود بحسابٍ جديد (2026-08-19).';

-- ── ٢. حارسُ العضويّة المنتهية يتّسع لثلاثةِ حقول ───────────────────────────────
-- الحارسُ يمنع تحريرَ بيانات عضويّةٍ منتهية، وهو صواب. لكنّ من انتهت عضويّتُه له أن يطلب
-- حذفَ حسابه ثمّ يعدل عنه، فلولا هذا التوسيعُ لَردَّه الحارسُ بـ«عضويّة منتهية لا تُحرَّر
-- بياناتها» — وليست هذه بياناتِ عضويّة، بل قرارُ شخصٍ في حسابه.
create or replace function public.guard_terminated_membership_profile()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
    allowed constant text[] := array[
      'account_status', 'terminated_at', 'termination_reason', 'updated_at',
      -- قرارُ صاحب الحساب في حسابه، لا بياناتُ عضويّته:
      'deletion_requested_at', 'deletion_reason', 'deleted_at', 'accepts_marketing'
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

-- ── ٣. الطلب ───────────────────────────────────────────────────────────────────
-- على مثال `revoke_my_session`: الفاعلُ من `auth.uid()` لا من مُدخَلٍ يُمرَّر، فلا يطلب أحدٌ
-- حذفَ حسابِ غيره ولو نادى الدالّةَ بيده. ومن ناداها بمفتاح الخدمة (حيث `auth.uid()` فارغة)
-- لم يفعل شيئًا.
--
-- وتُعيد `jsonb` لا `void`: الشاشةُ تحتاج أن تفرّق بين «طُلب» و«أنت تحمل منصبًا» و«طلبتَه
-- من قبل»، وكلُّ حالةٍ لها جوابٌ عربيٌّ يُعرَض كما هو.
create or replace function public.request_my_account_deletion(p_reason text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid   uuid := auth.uid();
  v_seat  text;
  v_at    timestamptz;
  v_gone  timestamptz;
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

  -- **حاملُ المنصب يُمنع** (القرار الثاني): المقعدُ في الهيكل ليس ملكًا لصاحبه وحدَه، وخلوُّه
  -- صامتًا عطبٌ في الشجرة. فيُقال له اسمُ ما يحمل ليعرف بابَ من يقصد.
  select r.role_name_ar into v_seat
  from public.user_roles ur
  join public.roles r on r.role_name = ur.role_name
  where ur.user_id = v_uid and ur.is_active
  order by ur.assigned_at
  limit 1;

  if v_seat is not null then
    return jsonb_build_object(
      'ok', false, 'code', 'has_position', 'seat', v_seat,
      'message', format('مقعدُك في الهيكل لم يُخلَ بعدُ (%s). راجع من عيّنك ليُعفيك، ثمّ عُد.', v_seat));
  end if;

  if v_at is not null then
    return jsonb_build_object('ok', true, 'code', 'already_requested', 'at', v_at,
                              'dueAt', v_at + interval '30 days',
                              'message', 'طلبُك قائمٌ من قبل.');
  end if;

  update public.profiles
     set deletion_requested_at = now(),
         deletion_reason       = nullif(btrim(coalesce(p_reason, '')), ''),
         accepts_marketing     = false,   -- تقف رسائلُ النادي من اللحظة، لا بعد المهلة
         updated_at            = now()
   where id = v_uid
  returning deletion_requested_at into v_at;

  insert into public.activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'request_account_deletion', 'profile', v_uid::text,
          jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), ''),
                             'dueAt', v_at + interval '30 days'));

  return jsonb_build_object('ok', true, 'code', 'requested', 'at', v_at,
                            'dueAt', v_at + interval '30 days');
end;
$$;

revoke all on function public.request_my_account_deletion(text) from public, anon;
grant execute on function public.request_my_account_deletion(text) to authenticated;

comment on function public.request_my_account_deletion(text) is
  'طلبُ صاحبِ الحساب حذفَ حسابه (auth.uid() وحدَه). يُمنع حاملُ المنصب. المهلةُ ٣٠ يومًا، وينفّذها sweep_account_deletions.';

-- ── ٤. العدول ──────────────────────────────────────────────────────────────────
-- «ولك أن تعدل خلال المهلة» وعدٌ في شاشة التأكيد، وهذا بابُه. ولا يُقبل بعد التنفيذ لأنّ
-- حسابَ المصادقة يكون قد مات، فلا جلسةَ تناديها أصلًا.
create or replace function public.cancel_my_account_deletion()
returns jsonb
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_had timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'code', 'no_session', 'message', 'لا جلسةَ لك.');
  end if;

  update public.profiles
     set deletion_requested_at = null,
         deletion_reason       = null,
         updated_at            = now()
   where id = v_uid and deleted_at is null and deletion_requested_at is not null
  returning now() into v_had;

  if v_had is null then
    return jsonb_build_object('ok', false, 'code', 'nothing_to_cancel', 'message', 'لا طلبَ قائمًا.');
  end if;

  insert into public.activity_log (user_id, action_type, target_type, target_id, details)
  values (v_uid, 'cancel_account_deletion', 'profile', v_uid::text, '{}'::jsonb);

  return jsonb_build_object('ok', true, 'code', 'cancelled', 'message', 'أُلغيَ الطلب. حسابُك كما كان.');
end;
$$;

revoke all on function public.cancel_my_account_deletion() from public, anon;
grant execute on function public.cancel_my_account_deletion() to authenticated;

comment on function public.cancel_my_account_deletion() is
  'عدولُ صاحب الحساب عن طلب الحذف داخل المهلة (auth.uid() وحدَه).';

-- ── ٤٫٥. حالُ الطلب تُقرأ ───────────────────────────────────────────────────────
-- شاشاتُ الويب تقرأ حالَ الطلب بمفتاح الخدمة (`lib/auth.ts`)، وتطبيقُ الجوّال لا مفتاحَ
-- خدمةٍ له ولا يجوز أن يكون. فبدلًا من توسيع `grant select` على عمودين في `profiles` —
-- وهو سطحٌ يُفتح للجميع لأجل واحد — تُفتح نافذةٌ بقدرِ الحاجة: دالّةٌ تقرأ صفَّ `auth.uid()`
-- وحدَه وتُخرج تاريخين.
create or replace function public.my_account_deletion()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
           'requestedAt', p.deletion_requested_at,
           'dueAt',       p.deletion_requested_at + interval '30 days',
           'deletedAt',   p.deleted_at)
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke all on function public.my_account_deletion() from public, anon;
grant execute on function public.my_account_deletion() to authenticated;

comment on function public.my_account_deletion() is
  'حالُ طلب حذف الحساب لصاحبه وحدَه (auth.uid()) — لتطبيق الجوّال حيث لا مفتاحَ خدمة.';

-- ── ٥. الكنّاس ─────────────────────────────────────────────────────────────────
-- ينفّذ ما مضت مهلتُه، على مثال `sweep_election_deadlines` و`sweep_survey_deadlines`.
--
-- **وكيف يعرف من يُمحى محوًا ممّن يبقى أرشيفًا؟** لا بقائمةِ جداولَ تُعدّ ههنا فتشيخ ويسقط
-- منها جدولٌ يُضاف غدًا، بل **بالمحاولة نفسِها**: يُحاوَل حذفُ الصفّ، فإن ردّته مفاتيحُ
-- السجلّ (`foreign_key_violation`) فتلك شهادةُ القاعدةِ أنّ للرجل أثرًا يُصان، فيبقى صفُّه
-- أرشيفًا. وإن مضى الحذفُ فلم يكن له أثرٌ أصلًا فلا يبقى منه شيء. والحكمُ من القاعدة لا من
-- ذاكرتي — وهو الفرقُ بين حارسٍ يصدق أبدًا وقائمةٍ تكذب بعد شهر.
create or replace function public.sweep_account_deletions()
returns integer
language plpgsql
volatile
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  r      record;
  v_done integer := 0;
begin
  for r in
    select p.id, p.joined_date, p.account_status
    from public.profiles p
    where p.deletion_requested_at is not null
      and p.deleted_at is null
      and p.deletion_requested_at <= now() - interval '30 days'
  loop
    -- العضويّةُ تُنهى باسم صاحبها هو: الفاعلُ من ذهب، والسببُ مكتوبٌ في السجلّ.
    if r.joined_date is not null and r.account_status is distinct from 'suspended' then
      perform public._apply_termination(r.id, r.id, 'حذفَ صاحبُها حسابَه', 'account_deletion');
    end if;

    update public.profiles
       set deleted_at = now(), updated_at = now()
     where id = r.id;

    -- الدخولُ يموت. وبعد فكِّ `profiles_id_fkey` لا يهدم هذا الحذفُ شيئًا من الأرشيف،
    -- ويتحرّر البريدُ فيستطيع صاحبُه أن يبدأ حسابًا جديدًا إن عاد.
    delete from auth.users u where u.id = r.id;

    -- ومن لا أثرَ له في السجلّ لا يبقى منه صفّ.
    begin
      delete from public.profiles where id = r.id;
    exception when foreign_key_violation then
      null;  -- له أثرٌ يُصان: يبقى الصفُّ أرشيفًا كما أمر المالك
    end;

    insert into public.activity_log (user_id, action_type, target_type, target_id, details)
    values (null, 'execute_account_deletion', 'profile', r.id::text,
            jsonb_build_object('source', 'sweep'));

    v_done := v_done + 1;
  end loop;

  return v_done;
end;
$$;

revoke all on function public.sweep_account_deletions() from public, anon, authenticated;

comment on function public.sweep_account_deletions() is
  'كنّاسُ حذف الحسابات: ينفّذ ما مضت مهلتُه (٣٠ يومًا). يُنهي العضويّة، ويقتل الدخول، ويمحو الصفَّ إن لم يكن له أثرٌ في السجلّ.';

-- ── ٦. الصفحةُ العلنيّةُ تُغلَق ─────────────────────────────────────────────────
-- الدالّةُ تشترط `account_status = 'active'` أصلًا، وهو يكفي العضوَ لأنّ عضويّته تُنهى مع
-- الحذف. ويُزاد شرطُ `deleted_at` حرسًا ثانيًا: لو بقي صفٌّ نشِطًا لسببٍ لم نتوقّعه، فلا
-- تُفتَح صفحةُ من طلب أن يذهب.
create or replace function public.get_public_profile(p_slug text)
returns jsonb
language sql
stable security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'slug',       p.public_slug,
    'name',       coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name),
    'avatar',     nullif(btrim(coalesce(p.avatar_url, '')), ''),
    'gender',     p.gender,
    'bio',        nullif(btrim(coalesce(p.bio, '')), ''),
    'joinedDate', p.joined_date,
    'positions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'roleAr',   r.role_name_ar,
               'unitName', coalesce(c.committee_name_ar, d.name_ar),
               'since',    ur.assigned_at
             ) order by (r.holder_uniqueness = 'multi'), ur.assigned_at)
      from public.user_roles ur
      join public.roles r             on r.role_name = ur.role_name
      left join public.committees c   on c.id = ur.committee_id
      left join public.departments d  on d.id = ur.department_id
      where ur.user_id = p.id and ur.is_active
    ), '[]'::jsonb),
    'badges', coalesce((
      select jsonb_agg(x order by (x->>'earnedAt') is null, (x->>'sortOrder')::int)
      from (
        select jsonb_build_object(
                 'key', b.badge_key, 'name', b.name_ar, 'how', b.description_ar,
                 'icon', b.icon, 'sortOrder', b.sort_order,
                 'earnedAt', mb.earned_at, 'evidence', mb.evidence,
                 'current', case
                              when mb.id is not null then null
                              when b.rule_key = 'events_attended' then
                                (select count(*) from public.activity_reservations ar
                                 where ar.user_id = p.id and ar.attendance_status = 'attended')
                              when b.rule_key = 'tenure_days' and p.joined_date is not null then
                                (current_date - p.joined_date)
                            end,
                 'threshold', case when mb.id is null then b.threshold end
               ) as x
        from public.badges b
        left join public.member_badges mb on mb.badge_id = b.id and mb.user_id = p.id
        where b.is_active and (mb.id is not null or b.show_locked)
      ) s
    ), '[]'::jsonb),
    'college', nullif(btrim(coalesce(md.college, '')), ''),
    'major',   nullif(btrim(coalesce(md.major, '')), ''),
    'degree',  nullif(btrim(coalesce(md.academic_degree, '')), ''),
    'links', jsonb_strip_nulls(jsonb_build_object(
      'twitter',   nullif(btrim(coalesce(md.twitter_account, '')), ''),
      'instagram', nullif(btrim(coalesce(md.instagram_account, '')), ''),
      'tiktok',    nullif(btrim(coalesce(md.tiktok_account, '')), ''),
      'linkedin',  nullif(btrim(coalesce(md.linkedin_account, '')), '')
    ))
  )
  from public.profiles p
  left join public.member_details md on md.user_id = p.id
  where p.public_slug = p_slug
    and p.account_status = 'active'
    and p.deleted_at is null
    and p.deletion_requested_at is null
    and coalesce(nullif(btrim(md.full_name_triple), ''), p.full_name) is not null
    and exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.is_active);
$function$;

commit;

-- ── ٧. الموعدُ اليوميّ ─────────────────────────────────────────────────────────
-- خارجَ المعاملة لأنّ `cron.schedule` لا يُعاد تشغيله في معاملةٍ فاشلة. والساعةُ ٣:١٧ فجرًا
-- بتوقيت الخادم: بعد كنّاسِ الزيارات (٣:٠٠) وقبل تجميع الشهر، فلا يتزاحمان.
select cron.unschedule('account-deletions-sweep')
where exists (select 1 from cron.job where jobname = 'account-deletions-sweep');

select cron.schedule('account-deletions-sweep', '17 3 * * *', $$select public.sweep_account_deletions();$$);
