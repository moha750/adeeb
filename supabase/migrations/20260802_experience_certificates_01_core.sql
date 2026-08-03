-- ═══════════════════════════════════════════════════════════════════════════
-- شهادة الخبرة — م٠: النواة
--
-- المرجع: v2/CERTIFICATES-SYSTEM.md (قراراتُ المالك الأربعة مكتوبةٌ فيه).
-- ولا حذفَ بيانات في هذه الهجرة البتّة.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────
-- ١) متى خمد الدور؟ — عمودٌ وتريغر
--
-- الشهادةُ اليوم تحمل **المنصب الحاليّ** (قرار المالك)، لكنّ «المسيرة الكاملة» كانت
-- مستحيلةً لأنّ `user_roles` يقول متى بدأ الدور ولا يقول متى انتهى. فالعمود يُضاف الآن
-- ويُكتب **من الآن**، فتنضج المسيرة تلقائيًّا لمن يأتي.
--
-- **وتريغرٌ لا تعديلُ ثلاث دوالّ**: `assign_position` و`revoke_position` و`assign_supervision`
-- كلُّها تُطفئ الأدوار، ومعها الكتابةُ المباشرة بمفتاح الخدمة. فالحارس عند الجدول يسري على
-- الجميع — كما فعلنا في `trg_enforce_position_uniqueness`.
--
-- **والماضي يبقى مجهولًا**: الصفوف الخامدة اليوم تبقى `ended_at = NULL` — لا نخترع لها
-- تواريخ، والفراغُ أصدقُ من تخمين.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.user_roles add column if not exists ended_at timestamptz;

comment on column public.user_roles.ended_at is
  'متى خمد هذا الدور (يكتبه تريغر عند is_active: true→false، ويمحوه عند العودة). NULL في الصفوف التي خمدت قبل ٢٠٢٦-٠٨-٠٢ = غير معلوم لا «ما زال حيًّا» — والحيُّ يُعرَف بـis_active.';

create or replace function public.stamp_role_end()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if old.is_active and not new.is_active then
    new.ended_at := coalesce(new.ended_at, now());
  elsif not old.is_active and new.is_active then
    new.ended_at := null;   -- عاد الدور، فلا نهايةَ له
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_role_end on public.user_roles;
create trigger trg_stamp_role_end
  before update of is_active on public.user_roles
  for each row execute function public.stamp_role_end();


-- ─────────────────────────────────────────────────────────────────────────
-- ٢) القدرة — واحدةٌ لا اثنتان
--
-- الرائي هنا هو المُصدِر نفسه، فلا يُخترع بابٌ وفعلٌ كما في الإنذارات (هناك رئيسان يريان
-- ولا يُصدران، وهنا لا أحد). والثلاثة الذين سمّاهم المالك: رئيس النادي · رئيس التنفيذيّ ·
-- قائد الموارد.
-- ─────────────────────────────────────────────────────────────────────────

insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('manage_certificates', 'شهادات الخبرة',
        'إصدار شهادات الخبرة للأعضاء وإبطال ما خرج منها بخطأ', 'membership')
on conflict (permission_key) do nothing;

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president'), ('hr_committee_leader')) as r(role_name)
cross join public.permissions p
where p.permission_key = 'manage_certificates'
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────────────────
-- ٣) الجدول — لقطةٌ تُخزَّن لا تُشتقّ
--
-- **وهذا يفارق رتبةَ الإنذار عمدًا**: تلك مشتقّةٌ لأنّ الحقّ فيها الحالةُ الراهنة، وهذه
-- ورقةٌ سُلّمت بيد صاحبها فلا تتغيّر بعد اليوم ولو انتقل من لجنته أو انتهت عضويّته.
-- ─────────────────────────────────────────────────────────────────────────

-- ترقيمٌ مستقلٌّ عن شهادات حضور الفعاليات (`ADEEB-<سنة>-<رقم>` من `certificate_serial_seq`)
-- فلا يلتبس ما يُقدَّم لجهة عملٍ بما يُمنَح لحضور أمسية.
create sequence if not exists public.experience_certificate_serial_seq;

create table if not exists public.experience_certificates (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  issued_by       uuid references public.profiles(id) on delete set null,
  serial          text not null unique,

  -- اللقطة: ما رُسم على الورقة حرفًا بحرف
  holder_name     text not null,
  position_title  text not null,
  period_from     date not null,
  period_to       date not null,

  -- لقطتان للسجلّ لا للورقة: أين كان ومَن كان يومَ الإصدار
  role_at_issue   text,
  committee_id    integer references public.committees(id),

  status          text not null default 'valid' check (status in ('valid', 'revoked')),
  revoked_by      uuid references public.profiles(id) on delete set null,
  revoked_at      timestamptz,
  revoke_reason   text,

  created_at      timestamptz not null default now(),

  constraint experience_certificates_period_ck check (period_to >= period_from)
);

comment on table public.experience_certificates is
  'شهادات الخبرة. اللقطة (الاسم والمسمّى والفترة) مخزّنةٌ لا مشتقّة: الورقة سُلّمت فلا تتغيّر.';

create index if not exists idx_experience_certificates_user on public.experience_certificates (user_id, created_at desc);
create index if not exists idx_experience_certificates_issuer on public.experience_certificates (issued_by);


-- ─────────────────────────────────────────────────────────────────────────
-- ٤) الحَكَمان — القدرةُ والمدى معًا
--
-- المدى من `membership_authority` القائم عبر `member_within_reach` — بلا صفٍّ جديد ولا
-- عمود. فقائد الموارد لا يبلغ رئيسَ النادي ولا التنفيذيَّ ولا المستشارَ ولا قائدَ الضمان،
-- كما هو محجوبٌ عنهم في الإنهاء والإنذار.
--
-- **ولا شرطَ `actor <> target`** (بخلاف الإنذار): الشهادة إثباتُ واقعٍ مسجَّلٍ في القاعدة
-- لا حكمٌ على أحد، والسجلّ يقول من أصدرها لنفسه. ولولا ذلك لبقي رئيسُ النادي بلا مُصدِر.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.can_issue_certificate(p_actor uuid, p_target uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select check_user_permission(p_actor, 'manage_certificates')
     and member_within_reach(p_actor, p_target);
$$;

create or replace function public.can_view_certificate_of(p_actor uuid, p_target uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  -- لكلٍّ شهاداتُ نفسه (يُنزّلها متى شاء بلا مراجعة أحد)
  select p_actor is not null and (p_actor = p_target or can_issue_certificate(p_actor, p_target));
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- ٥) المسمّى كاملًا — مصدرٌ واحد في القاعدة
--
-- النمط نفسه الذي تقوله `lib/positionLabel.ts` في الواجهة: الاسمُ = الرتبةُ + وحدتُها الأمّ
-- (`roles.home_committee_id`)، ثمّ تُلحَق وحدةُ الإسناد إن خالفت الأمّ. فأدوارُ الإدارات
-- تحمل وحدتها في اسمها («قائد إدارة الموارد البشرية») ولا تُكرَّر، وأدوارُ اللجان رتبةٌ
-- مجرّدة تُلحَق بها لجنتُها («عضو لجنة السفراء والتصوير»).
--
-- ومن حمل مقعدين حُمِلا معًا بـ«و». ومن لا دورَ له حيًّا أُخذ آخرُ ما خمد — فالمنتهية
-- عضويّتُه أولى الناس بالشهادة، ولا تُترك ورقتُه بلا مسمّى.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.position_title_of(p_user uuid)
returns text
language sql stable security definer
set search_path = public, pg_temp
as $$
  with seats as (
    select
      ur.is_active,
      ur.assigned_at,
      trim(
        r.role_name_ar
        || coalesce(' ' || home.committee_name_ar, '')
        || case
             when ur.committee_id is not null and ur.committee_id is distinct from r.home_committee_id
               then ' ' || coalesce(unit.committee_name_ar, '')
             when ur.committee_id is null and ur.department_id is not null
               then ' ' || coalesce(dept.name_ar, '')
             else ''
           end
      ) as title
    from user_roles ur
    join roles r on r.role_name = ur.role_name
    left join committees home on home.id = r.home_committee_id
    left join committees unit on unit.id = ur.committee_id
    left join departments dept on dept.id = ur.department_id
    where ur.user_id = p_user
  )
  select coalesce(
    -- الأدوار الحيّة كلُّها
    (select string_agg(title, ' و' order by assigned_at) from seats where is_active),
    -- وإلّا آخرُ ما خمد
    (select title from seats order by assigned_at desc limit 1)
  );
$$;

comment on function public.position_title_of(uuid) is
  'المسمّى كاملًا كما يُكتب في شهادة الخبرة — بنمط lib/positionLabel.ts نفسه.';


-- ─────────────────────────────────────────────────────────────────────────
-- ٦) الفعلان — بابان لا غير
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.issue_certificate(
  p_actor    uuid,
  p_user     uuid,
  p_name     text default null,      -- تصحيحُ الاسم إن شذّ في الملفّ
  p_position text default null       -- تصحيحُ المسمّى إن شذّ
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_today    date := (now() at time zone 'Asia/Riyadh')::date;
  v_joined   date;
  v_name     text;
  v_title    text;
  v_role     text;
  v_committee integer;
  v_serial   text;
  v_id       uuid;
begin
  -- الاسم: الثلاثيّ إن وُجد وإلّا المسجَّل (قرار المالك)، وللمُصدِر تصحيحُه
  select p.joined_date,
         coalesce(nullif(btrim(coalesce(p_name, '')), ''),
                  nullif(btrim(md.full_name_triple), ''),
                  btrim(p.full_name))
  into v_joined, v_name
  from profiles p
  left join member_details md on md.user_id = p.id
  where p.id = p_user;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذا العضو.');
  end if;

  -- **ولا يُشترط أن تكون العضويّة سارية**: أكثرُ من يطلب شهادةَ خبرةٍ من غادر.
  if not can_issue_certificate(p_actor, p_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ إصدار شهادةٍ لهذا العضو.');
  end if;

  if v_joined is null then
    return jsonb_build_object('ok', false, 'code', 'NO_JOIN_DATE',
      'message', 'لا تاريخَ انضمامٍ مسجَّلٌ لهذا العضو — سجّله أوّلًا فالشهادة تبدأ منه.');
  end if;

  v_title := coalesce(nullif(btrim(coalesce(p_position, '')), ''), position_title_of(p_user));
  if v_title is null or v_title = '' then
    return jsonb_build_object('ok', false, 'code', 'NO_POSITION',
      'message', 'لا منصبَ مسجَّلٌ لهذا العضو — اكتب المسمّى في النافذة.');
  end if;

  if v_name is null or char_length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'code', 'NO_NAME', 'message', 'اسمُ العضو ناقص.');
  end if;

  -- لقطةُ المقعد للسجلّ: الحيُّ أوّلًا، وإلّا آخرُ ما خمد
  select ur.role_name, ur.committee_id into v_role, v_committee
  from user_roles ur
  where ur.user_id = p_user
  order by ur.is_active desc, ur.assigned_at desc
  limit 1;

  -- الفترة تنتهي **بتاريخ الإصدار** ولو انتهت العضويّة قبله (قرار المالك)
  v_serial := 'ADEEB-EXP-' || extract(year from v_today)::text || '-'
              || lpad(nextval('experience_certificate_serial_seq')::text, 4, '0');

  insert into experience_certificates
    (user_id, issued_by, serial, holder_name, position_title, period_from, period_to, role_at_issue, committee_id)
  values
    (p_user, p_actor, v_serial, v_name, v_title, v_joined, v_today, v_role, v_committee)
  returning id into v_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'issue_certificate', 'profile', p_user::text,
          jsonb_build_object('certificate_id', v_id, 'serial', v_serial,
                             'position', v_title, 'from', v_joined, 'to', v_today));

  return jsonb_build_object(
    'ok', true, 'id', v_id, 'serial', v_serial,
    'holder_name', v_name, 'position_title', v_title,
    'period_from', v_joined, 'period_to', v_today,
    'message', format('صدرت الشهادة برقم %s.', v_serial)
  );
end;
$$;


create or replace function public.revoke_certificate(
  p_actor  uuid,
  p_id     uuid,
  p_reason text
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_user   uuid;
  v_status text;
begin
  select user_id, status into v_user, v_status from experience_certificates where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'لا وجود لهذه الشهادة.');
  end if;
  if v_status = 'revoked' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY', 'message', 'الشهادة مبطَلةٌ أصلًا.');
  end if;

  -- سلطةُ الإبطال سلطةُ الإصدار (لا «مُصدِرُها وحده»)
  if not can_issue_certificate(p_actor, v_user) then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN',
      'message', 'صلاحيتك لا تبلغ إبطال هذه الشهادة.');
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    return jsonb_build_object('ok', false, 'code', 'REASON_REQUIRED',
      'message', 'اكتب سبب الإبطال (خمسة أحرف فأكثر).');
  end if;

  update experience_certificates
  set status = 'revoked', revoked_by = p_actor, revoked_at = now(), revoke_reason = v_reason
  where id = p_id;

  insert into activity_log (user_id, action_type, target_type, target_id, details)
  values (p_actor, 'revoke_certificate', 'profile', v_user::text,
          jsonb_build_object('certificate_id', p_id, 'reason', v_reason));

  return jsonb_build_object('ok', true, 'message', 'أُبطلت الشهادة، وبقيت في السجلّ مشطوبة.');
end;
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- ٧) مرآةُ الواجهة — من أستطيع إصدار شهادةٍ له
-- (كما تفعل `members_in_my_reach` و`members_i_may_warn`: الصفُّ يحمل علمَه)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.members_i_may_certify(p_actor uuid)
returns table (user_id uuid)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id
  from profiles p
  where can_issue_certificate(p_actor, p.id);
$$;


-- ─────────────────────────────────────────────────────────────────────────
-- ٨) الحراسة — قراءةٌ بالحَكَم، ولا سياسةَ كتابةٍ البتّة
-- ─────────────────────────────────────────────────────────────────────────

alter table public.experience_certificates enable row level security;

drop policy if exists experience_certificates_select on public.experience_certificates;
create policy experience_certificates_select on public.experience_certificates
  for select using (can_view_certificate_of(auth.uid(), user_id));

-- لا INSERT ولا UPDATE ولا DELETE: لا يُكتب الجدول إلّا من البابين أعلاه (SECURITY DEFINER)

revoke all on function public.issue_certificate(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.revoke_certificate(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.members_i_may_certify(uuid) from public, anon;
grant execute on function public.can_view_certificate_of(uuid, uuid) to authenticated;
grant execute on function public.can_issue_certificate(uuid, uuid) to authenticated;
grant execute on function public.position_title_of(uuid) to authenticated;
grant execute on function public.members_i_may_certify(uuid) to authenticated;
