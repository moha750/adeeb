-- ============================================================
-- الاستبيانات: الملكيّة والمشاركة (2026-10-08)
--
-- كان كلُّ من يملك `manage_surveys` (عشرون شخصًا) يرى كلَّ استبيان ويعدّله ويحذفه
-- نهائيًّا، ولا يُفحَص من أنشأه. القرار (محمد): الاستبيان لصاحبه وحده، ولا يراه غيرُه
-- إلّا بمشاركةٍ يمنحها صاحبُه: «يقرأ» (الاستبيان ونتائجه) أو «يحرّر» (المحتوى والنشر
-- والإيقاف والإغلاق). والأرشفةُ والحذفُ وإدارةُ المشاركة لصاحبه وحده.
--
-- **على سَنن مشاركة الباركود** (`qr_link_shares`، أقرّها المالك ٢٠٢٦-٠٩-٠٦): الإذنان
-- `read`/`edit` بلفظهما، و`granted_by`، ومرشّحو المشاركة حاملو قدرة الغرفة. فلا يكون
-- للسؤال الواحد («ما إذنُ الشريك؟») جوابان في نظامين.
--
-- واستثناءان لحساب النادي «أَدِيب» (حاملِ الدور `adeeb_admin`، فريدٍ في النادي):
--   ١) يرى كلَّ استبيانٍ **نُشر** ونتائجَه ويتحكّم فيه تحكّمًا كاملًا، ليوقف المسيءَ
--      منها. ولا يرى مسودّةً لم تُنشر قطّ.
--   ٢) تنتقل إليه ملكيّةُ استبيانِ من فقد صلاحيةَ الاستبيانات (انتهت عضويّته أو منصبه).
--      الانتقالُ **محسوبٌ لحظيًّا لا مكتوب**: لا يُمسّ `created_by`، فإن عادت الصلاحية
--      لصاحبها عادت إليه استبياناته بلا كنسٍ ولا مهمّةٍ دوريّة تفشل بصمت.
--
-- المصدرُ الواحد للحكم هو `survey_access_list`؛ وكلُّ شاشةٍ وفعلٍ في غرفة الاستبيانات
-- يسأله (عبر `survey_access` للواحد). اللوحةُ تقرأ بمفتاح الخدمة، فهذه الدوالّ لمفتاح
-- الخدمة وحده: لا يستدعيها المتصفّح، ولا تُكشَف ملكيّةُ أحدٍ لأحد.
-- ============================================================

-- ١) المشاركات
create table survey_shares (
  survey_id  integer     not null references surveys(id)  on delete cascade,
  user_id    uuid        not null references profiles(id) on delete cascade,
  access     text        not null check (access in ('read', 'edit')),
  granted_by uuid        references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (survey_id, user_id)
);
create index survey_shares_user_id_idx   on survey_shares (user_id);
create index survey_shares_granted_by_idx on survey_shares (granted_by);

-- خادميٌّ خالص: RLS مفعّل بلا سياسة، ولا امتياز للمتصفّح إطلاقًا
alter table survey_shares enable row level security;
revoke all on table survey_shares from anon, authenticated;

-- ٢) حساب النادي — بالدور لا بمعرّفٍ محفور، فإن تبدّل صاحبُ الحساب لم يتبدّل شيء هنا.
-- `is_active` وحده كما في `check_user_permission`: حاملُ الدور عنده هو حاملُه هنا.
create or replace function survey_club_account()
returns uuid
language sql stable security definer set search_path = public
as $$
  select ur.user_id from user_roles ur
  where ur.role_name = 'adeeb_admin' and ur.is_active
  order by ur.assigned_at nulls last
  limit 1;
$$;

-- ٣) «مديرُ استبيانات» = حسابٌ نشطٌ يملك `manage_surveys`. حكمٌ واحدٌ للمالك والسائل والشريك
-- والمرشَّح: `check_user_permission` لا ينظر في `account_status`، فحسابٌ أُوقف وبقيت أدوارُه
-- قائمةً كان سيبقى مالكًا لا تنتقل عنه استبياناتُه، ويبقى قابلًا للمشاركة.
create or replace function survey_is_manager(p_user uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_user is not null
    and exists (select 1 from profiles p where p.id = p_user and p.account_status = 'active')
    and check_user_permission(p_user, 'manage_surveys');
$$;

-- ٤) المصدر الواحد: دورُ مستخدمٍ في كلّ استبيانٍ له فيه دور
--    owner   = صاحبه الفعليّ (المنشئ ما دام يملك الصلاحية، وإلّا حساب النادي)
--    steward = حساب النادي على استبيانِ غيره المنشور: يرى ويتحكّم، ولا يدير المشاركة
--    edit    = شريكٌ يحرّر
--    read    = شريكٌ يقرأ
-- ولا دور لمن لا يملك `manage_surveys` أصلًا: المشاركةُ لا تفتح بابًا لا يملكه صاحبه،
-- ومن فقد الصلاحية سقطت مشاركاتُه معها تلقائيًّا.
-- «نُشر» = ليس مسودّةً أو له `published_at`: في القاعدة استبيانٌ منتهٍ قديم بلا طابع نشر.
create or replace function survey_access_list(p_user uuid, p_survey_id integer default null)
returns table (survey_id integer, access text)
language sql stable security definer set search_path = public
as $$
  with club as (select survey_club_account() as id),
  owned as (
    select s.id, s.status, s.published_at,
      case
        when survey_is_manager(s.created_by) then s.created_by
        else (select id from club)
      end as owner
    from surveys s
    where p_survey_id is null or s.id = p_survey_id
  ),
  ranked as (
    select o.id,
      case
        when o.owner = p_user then 'owner'
        when p_user = (select id from club)
             and (o.status <> 'draft' or o.published_at is not null) then 'steward'
        else sh.access
      end as access
    from owned o
    left join survey_shares sh on sh.survey_id = o.id and sh.user_id = p_user
  )
  select r.id, r.access from ranked r
  where r.access is not null
    and survey_is_manager(p_user);
$$;

create or replace function survey_access(p_survey_id integer, p_user uuid)
returns text
language sql stable security definer set search_path = public
as $$
  select l.access from survey_access_list(p_user, p_survey_id) l;
$$;

-- ٥) المشاركة — نقطةُ فرضٍ واحدة في القاعدة (كـ submit_survey_response)، برموزٍ ثابتة
-- يترجمها الخادم للعربيّة. الفاعلُ يمرّره الخادمُ من الجلسة الحقيقيّة.
create or replace function survey_share_set(p_actor uuid, p_survey_id integer, p_user uuid, p_access text)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if p_access is null or p_access not in ('read', 'edit') then raise exception 'bad_access'; end if;
  if survey_access(p_survey_id, p_actor) is distinct from 'owner' then raise exception 'not_owner'; end if;
  if p_user is null or p_user = p_actor then raise exception 'self_share'; end if;
  if not survey_is_manager(p_user) then raise exception 'not_manager'; end if;
  -- حسابُ النادي يرى المنشورَ ويتحكّم فيه أصلًا: إذنُ «يقرأ» له وعدٌ لا يصدق
  if p_user = survey_club_account() then raise exception 'club_account'; end if;

  insert into survey_shares (survey_id, user_id, access, granted_by)
  values (p_survey_id, p_user, p_access, p_actor)
  on conflict (survey_id, user_id)
  do update set access = excluded.access, granted_by = excluded.granted_by, updated_at = now();
end;
$$;

create or replace function survey_share_remove(p_actor uuid, p_survey_id integer, p_user uuid)
returns void
language plpgsql volatile security definer set search_path = public
as $$
begin
  if survey_access(p_survey_id, p_actor) is distinct from 'owner' then raise exception 'not_owner'; end if;
  delete from survey_shares where survey_id = p_survey_id and user_id = p_user;
end;
$$;

-- من تجوز مشاركتُه: كلُّ مديرِ استبياناتٍ سوى حساب النادي (القرار: لا مشاركة لمن لا يملكها)
-- كـ`qr_share_candidates` شكلًا؛ والسائلُ يُستثنى في الخادم (لا `auth.uid()` مع مفتاح الخدمة).
create or replace function survey_share_candidates()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name from profiles p
  where survey_is_manager(p.id)
    and p.id is distinct from survey_club_account()
  order by p.full_name;
$$;

-- ٦) لمفتاح الخدمة وحده
revoke execute on function survey_club_account()                               from public, anon, authenticated;
revoke execute on function survey_is_manager(uuid)                             from public, anon, authenticated;
revoke execute on function survey_access_list(uuid, integer)                   from public, anon, authenticated;
revoke execute on function survey_access(integer, uuid)                        from public, anon, authenticated;
revoke execute on function survey_share_set(uuid, integer, uuid, text)         from public, anon, authenticated;
revoke execute on function survey_share_remove(uuid, integer, uuid)            from public, anon, authenticated;
revoke execute on function survey_share_candidates()                           from public, anon, authenticated;
grant execute on function survey_club_account()                                to service_role;
grant execute on function survey_is_manager(uuid)                              to service_role;
grant execute on function survey_access_list(uuid, integer)                    to service_role;
grant execute on function survey_access(integer, uuid)                         to service_role;
grant execute on function survey_share_set(uuid, integer, uuid, text)          to service_role;
grant execute on function survey_share_remove(uuid, integer, uuid)             to service_role;
grant execute on function survey_share_candidates()                            to service_role;
