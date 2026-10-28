-- تقييمُ القيادات الربعيّ (١): الجداولُ والقيودُ والقدرات.
--
-- لائحة تقييم القيادات، أقرّها الرئيسان ٢٠٢٦-١٠-٢٠، وتسري من ٢٠٢٦-١٠-٢١، وأوّلُ تقييمٍ حاسم
-- ٢٠٢٧-٠١-٢١. المرجع: `Claude outputs/لائحة تقييم القيادات.md` (القسم ١ نصُّها، وهو الحاكم).
--
-- **غرفةٌ مستقلّة لا وحدةُ الاستبيانات**: الاستبيانُ عامٌّ ويقبل المجهول ولا يعرف من يحقّ له أن يجيب
-- بحسب اللجنة، ولا يحسب نصابًا ولا وزنًا، ولا يمسّ المناصب. والأقربُ إليه الانتخابات (أهليّةٌ من
-- الهيكل، وصوتٌ واحد، وسرّيّة، وسجلّ تدقيق)، فعلى أنماطها بُني.
--
-- **أين يقع الحساب** (قرار محمد ٢٠٢٦-١٠-٢٠): في دالّةٍ نقيّةٍ واحدة في الكود (`lib/evaluation/score.ts`)
-- يحرسها اختبار. والقاعدةُ تجمع الدرجات، وتكتب الحكمَ الذي يعود منها، **وتتحقّق منه بقيد**
-- (`evaluation_targets_verdict_matches`): فلا يُكتب «باقٍ» لمن نتيجتُه 40% أو أقلّ، ولو أخطأ الكود.
--
-- **السرّيّة** (قرار محمد ٢٠٢٦-١٠-٢٠، المسألة ٢): الورقةُ مربوطةٌ بصاحبها لكي تُبطَل إن تبيّن خطأٌ في
-- أهليّته (م١٠/3)، ولا يقرؤها أحدٌ من المتصفّح: لا سياسةَ قراءةٍ لأيّ دور، وكلُّ قراءةٍ عبر دوالَّ تُعيد
-- مجاميعَ لا صفوفًا. ولا وقتَ في الورقة، فلا يُستدلّ بترتيبها على صاحبها.

-- ══ الدورة ════════════════════════════════════════════════════════════════

create table public.evaluation_cycles (
  id            integer generated always as identity primary key,
  -- موعدُ التقييم (م٢/2): 21 من يناير وأبريل ويوليو وأكتوبر، وأوّلُه 21 يناير 2027
  due_on        date not null unique,
  -- يُفتح ثلاثة أيام (م٢/3): من منتصف ليل يوم 21 بتوقيت الرياض إلى منتصف ليل يوم 24 (حصريًّا)
  opens_at      timestamptz not null,
  closes_at     timestamptz not null,
  status        text not null default 'scheduled',
  opened_at     timestamptz,
  closed_at     timestamptz,
  -- كُتبت الأحكامُ ونُفّذ الاستبعادُ (م٩/2: في اليوم التالي للإغلاق)
  executed_at   timestamptz,
  reminded_at   timestamptz,
  -- نُبّه قائدُ الموارد إلى أنّ موعدَ هذه الدورة حلّ والسابقةُ لم تُنفَّذ (جدول الحالات الحدّيّة)
  blocked_noted_at timestamptz,
  created_at    timestamptz not null default now(),
  constraint evaluation_cycles_status_known
    check (status in ('scheduled', 'open', 'closed', 'executed')),
  constraint evaluation_cycles_due_quarter
    check (extract(day from due_on) = 21 and extract(month from due_on) in (1, 4, 7, 10)
           and due_on >= date '2027-01-21'),
  constraint evaluation_cycles_window
    check (opens_at = (due_on::timestamp at time zone 'Asia/Riyadh')
           and closes_at = ((due_on + 3)::timestamp at time zone 'Asia/Riyadh')),
  constraint evaluation_cycles_status_stamps
    check ((status = 'scheduled' and opened_at is null)
        or (status = 'open' and opened_at is not null and closed_at is null)
        or (status = 'closed' and closed_at is not null and executed_at is null)
        or (status = 'executed' and executed_at is not null))
);
comment on table public.evaluation_cycles is
  'دوراتُ تقييم القيادات الربعيّ (لائحة تقييم القيادات، م٢). تُنشأ وتُفتح وتُغلق بالمؤقّت `evaluation-tick`.';

-- ══ المقيَّم ══════════════════════════════════════════════════════════════

create table public.evaluation_targets (
  id               integer generated always as identity primary key,
  cycle_id         integer not null references public.evaluation_cycles(id) on delete cascade,
  user_id          uuid references public.profiles(id) on delete set null,
  -- المقعدُ كما كان يوم الفتح: يُطفأ هو بعينه عند الاستبعاد، ويُعاد هو بعينه عند التصحيح
  seat_id          integer references public.user_roles(id) on delete set null,
  role_name        text not null,
  committee_id     integer references public.committees(id) on delete set null,
  department_id    integer references public.departments(id) on delete set null,
  -- لقطةُ الاسم والجنس والوحدة: السجلُّ يبقى مقروءًا ولو تغيّر الهيكلُ أو حُذف الحساب
  full_name        text not null,
  gender           text,
  unit_name        text not null,
  seat_assigned_at timestamptz not null,
  -- استُثني من الدورة: شغل منصبه قبل الموعد بأقلّ من 4 أسابيع (م١/4)
  excluded         text,
  members_eligible integer not null default 0,
  council_eligible integer not null default 0,
  -- بعد الإغلاق: ما جمعته القاعدة، وما حكمت به دالّةُ الحساب
  members_sum      integer,
  members_ballots  integer,
  council_sum      integer,
  council_ballots  integer,
  members_quorum   boolean,
  branch           text,
  members_num      bigint,
  members_den      bigint,
  council_num      bigint,
  council_den      bigint,
  final_num        bigint,
  final_den        bigint,
  verdict          text,
  -- أُلغي تقييمُه: ترك منصبَه أو انتهت عضويّتُه أثناء الأيام الثلاثة (جدول الحالات الحدّيّة)
  cancelled        text,
  decided_at       timestamptz,
  -- التنفيذ (م٩): متى أُطفئ المقعد، وإلى أيّ لجنةٍ عاد عضوًا
  removed_at       timestamptz,
  returned_to      integer references public.committees(id) on delete set null,
  -- منسّقٌ لا لجنةَ سابقةً له يعود إليها: ينتظر أن يختار قائدُ الموارد لجنته (قرار محمد، المسألة ٤)
  awaiting_return  boolean not null default false,
  -- أُعيد إلى مقعده بتصحيح (م١٠/3)
  restored_at      timestamptz,

  constraint evaluation_targets_once unique (cycle_id, user_id, role_name),
  constraint evaluation_targets_role_known
    check (role_name in ('committee_leader', 'deputy_committee_leader', 'department_head')),
  constraint evaluation_targets_scope
    check ((role_name = 'department_head') = (committee_id is null)),
  constraint evaluation_targets_excluded_known check (excluded is null or excluded in ('recent')),
  constraint evaluation_targets_cancelled_known
    check (cancelled is null or cancelled in ('seat_ended', 'membership_ended')),
  constraint evaluation_targets_branch_known
    check (branch is null or branch in ('both', 'members_only', 'council_only', 'none')),
  constraint evaluation_targets_verdict_known
    check (verdict is null or verdict in ('kept', 'removed', 'no_result')),
  constraint evaluation_targets_excluded_no_verdict check (excluded is null or verdict is null),
  constraint evaluation_targets_fractions
    check ((members_num is null) = (members_den is null) and (members_den is null or members_den > 0)
       and (council_num is null) = (council_den is null) and (council_den is null or council_den > 0)
       and (final_num   is null) = (final_den   is null) and (final_den   is null or final_den   > 0)),
  -- **الحكمُ يطابق النتيجة** (م٩/1): «40% أو أقلّ» = بسط×5 ≤ مقام×2. فلو أخطأ الكودُ لرُفض الحكم هنا.
  constraint evaluation_targets_verdict_matches
    check (verdict is null
        or (verdict = 'no_result' and final_num is null and (branch = 'none' or cancelled is not null))
        or (verdict = 'removed' and cancelled is null and final_num is not null and final_num * 5 <= final_den * 2)
        or (verdict = 'kept'    and cancelled is null and final_num is not null and final_num * 5 >  final_den * 2)),
  constraint evaluation_targets_branch_matches
    check (branch is null
        or (branch = 'both'         and members_num is not null and council_num is not null)
        or (branch = 'members_only' and members_num is not null and council_num is null)
        or (branch = 'council_only' and members_num is null     and council_num is not null)
        or (branch = 'none'         and members_num is null     and council_num is null))
);
create index evaluation_targets_cycle_idx on public.evaluation_targets (cycle_id);
create index evaluation_targets_user_idx on public.evaluation_targets (user_id);
comment on table public.evaluation_targets is
  'من يُقيَّم في كلّ دورة (م١)، ومجاميعُ شقّيه، وحكمُه (م٨، م٩)، وتنفيذُه.';

-- ══ لقطةُ المقيِّمين ═══════════════════════════════════════════════════════

create table public.evaluation_electorate (
  id          integer generated always as identity primary key,
  target_id   integer not null references public.evaluation_targets(id) on delete cascade,
  rater_id    uuid references public.profiles(id) on delete set null,
  -- الشقّ: الأعضاء 70% (م٣) أو المجلس 30% (م٤). ومن اجتمع له الشقّان فله ورقةٌ واحدة في المجلس.
  part        text not null,
  -- تصحيحُ الأهليّة (م١٠/3): أُضيف من سقط خطأً، أو أُخرج من دخل خطأً (ولا يُحذف صفُّه: السجلّ)
  added_by_correction boolean not null default false,
  removed_at  timestamptz,
  constraint evaluation_electorate_once unique (target_id, rater_id),
  constraint evaluation_electorate_part_known check (part in ('members', 'council'))
);
create index evaluation_electorate_rater_idx on public.evaluation_electorate (rater_id);
comment on table public.evaluation_electorate is
  'لقطةُ المقيِّمين يوم فتح الدورة: من انضمّ بعدها لا يقيّم، ومن خرج بعدها يبقى مقيِّمًا (جدول الحالات الحدّيّة).';

-- ══ الورقة ═══════════════════════════════════════════════════════════════

create table public.evaluation_ballots (
  id          integer generated always as identity primary key,
  target_id   integer not null references public.evaluation_targets(id) on delete cascade,
  rater_id    uuid references public.profiles(id) on delete set null,
  part        text not null,
  scores      smallint[] not null,
  -- السؤال المفتوح (م٦/4): للأعضاء وحدهم، ولا يدخل الحساب
  keep_text   text,
  change_text text,
  -- أُبطلت لخطأٍ في أهليّة صاحبها (م١٠/3)
  voided_at   timestamptz,
  constraint evaluation_ballots_once unique (target_id, rater_id),
  constraint evaluation_ballots_part_known check (part in ('members', 'council')),
  -- كلُّ البنود بلا نقص (م٦/2، م٧/2)، وكلُّ بندٍ من 1 إلى 5 (م٦/1)
  constraint evaluation_ballots_items
    check (array_ndims(scores) = 1
       and cardinality(scores) = case part when 'members' then 7 else 5 end
       and 1 <= all (scores) and 5 >= all (scores)),
  constraint evaluation_ballots_open_question
    check ((part = 'members' or (keep_text is null and change_text is null))
       and (keep_text is null or char_length(keep_text) between 1 and 1000)
       and (change_text is null or char_length(change_text) between 1 and 1000))
);
create index evaluation_ballots_target_idx on public.evaluation_ballots (target_id);
comment on table public.evaluation_ballots is
  'أوراقُ التقييم. لا يقرؤها أحدٌ من المتصفّح، ولا يرى أحدٌ ورقةَ غيره (أحكامٌ عامّة: السرّيّة).';

-- ══ سجلُّ التدقيق ════════════════════════════════════════════════════════

create table public.evaluation_audit_log (
  id         bigint generated always as identity primary key,
  cycle_id   integer references public.evaluation_cycles(id) on delete cascade,
  target_id  integer references public.evaluation_targets(id) on delete cascade,
  -- الفاعل: صاحبُ القدرة في التصحيح واختيار اللجنة، وفارغٌ فيما تفعله اللائحةُ بنفسها
  actor_id   uuid references public.profiles(id) on delete set null,
  event      text not null,
  reason     text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint evaluation_audit_log_event_known check (event in (
    'cycle_created', 'cycle_opened', 'cycle_closed', 'cycle_blocked', 'results_recorded',
    'removal_executed', 'removal_awaiting_return', 'return_chosen',
    'rater_removed', 'rater_added', 'result_corrected', 'restored', 'restore_skipped')),
  -- كلُّ فعلٍ بشريٍّ في التصحيح بسببٍ مكتوب (م١٠/3، والمواصفة ٢-٨)
  constraint evaluation_audit_log_reason_for_people
    check (actor_id is null or event not in ('rater_removed', 'rater_added', 'result_corrected')
           or char_length(btrim(coalesce(reason, ''))) >= 3)
);
create index evaluation_audit_log_cycle_idx on public.evaluation_audit_log (cycle_id);
comment on table public.evaluation_audit_log is
  'كلُّ فتحٍ وإغلاقٍ وتنفيذٍ وتصحيح. ولا يُسجَّل فيه إرسالُ الورقة: الحدثُ باسم صاحبه يكشف من قيّم.';

-- ══ الأقفال: لا قراءةَ ولا كتابةَ من المتصفّح ═════════════════════════════
-- كلُّ قراءةٍ وكتابةٍ عبر دوالّ (الترحيلان ٠٢ و٠٣)، أو بعميل الخدمة في الخادم.

alter table public.evaluation_cycles     enable row level security;
alter table public.evaluation_targets    enable row level security;
alter table public.evaluation_electorate enable row level security;
alter table public.evaluation_ballots    enable row level security;
alter table public.evaluation_audit_log  enable row level security;

revoke all on public.evaluation_cycles, public.evaluation_targets, public.evaluation_electorate,
              public.evaluation_ballots, public.evaluation_audit_log
  from anon, authenticated;

-- ══ القدرات ══════════════════════════════════════════════════════════════
-- `manage_leader_evaluation`: غرفةُ الإدارة والتصحيح. للرئيسين وقائد الموارد البشريّة (التمهيد:
--   «تتولّى تنفيذَها إدارةُ الموارد البشرية»). والمكلَّفُ بمقاعدهم يحملها بصفّه الحيّ.
-- `view_leader_evaluation_results`: النتائجُ التفصيليّة (أحكامٌ عامّة: «الرئيسان وقائدا الإدارتين»).
-- ولا يحمل حسابُ النادي `adeeb_admin` أيًّا منهما: لا سلطةَ له على الأشخاص (CLAUDE.md).

insert into public.permissions (permission_key, permission_name_ar, description, category)
select v.k, v.n, v.d, 'membership'
from (values
  ('manage_leader_evaluation', 'إدارة تقييم القيادات',
   'دوراتُ التقييم الربعيّ ومشاركتُها، وتصحيحُ الأهليّة والحساب، واختيارُ لجنة المنسّق المستبعَد'),
  ('view_leader_evaluation_results', 'نتائج تقييم القيادات',
   'النتائجُ التفصيليّة لكلّ مقيَّم: الشقّان والحكم، بلا ورقةٍ ولا اسمِ مقيِّم')
) as v(k, n, d)
where not exists (select 1 from public.permissions p where p.permission_key = v.k);

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from public.permissions p
join (values
  ('manage_leader_evaluation', 'club_president'),
  ('manage_leader_evaluation', 'executive_council_president'),
  ('manage_leader_evaluation', 'hr_committee_leader'),
  ('view_leader_evaluation_results', 'club_president'),
  ('view_leader_evaluation_results', 'executive_council_president'),
  ('view_leader_evaluation_results', 'hr_committee_leader'),
  ('view_leader_evaluation_results', 'qa_committee_leader')
) as r(cap, role_name) on r.cap = p.permission_key
where not exists (
  select 1 from public.role_permissions rp where rp.role_name = r.role_name and rp.permission_id = p.id
);
