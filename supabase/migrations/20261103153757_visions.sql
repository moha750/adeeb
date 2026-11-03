-- ═══════════════════════════════════════════════════════════════════════════
-- رؤى أدِيب (٢٠٢٦-١١-٠٣، قرار محمد: «نفّذ مقترحك»)
--
-- الرؤيةُ في أدِيب صارت سياسةً إداريّة (اقتراحُ المجلس الإداريّ، ووافق محمد): لكلّ مرحلةٍ رؤيةٌ
-- باسمها وأفقها ومساراتها وأهدافها، ولا تبدأ رؤيةٌ قبل أن يُكتب تقريرُ ختام التي قبلها.
-- أولاها «رؤية الهلال»: من 1 نوفمبر 2026 حتى بداية رمضان، بأربعة مساراتٍ و26 هدفًا.
--
-- والأهدافُ **بياناتٌ لا نصٌّ في صفحة**: المجلسُ يضع مواعيدها وقد يعدّل بعضها، وقائدُ الضمان
-- والجودة يغيّر حالَ كلّ هدفٍ من غرفة «متابعة الرؤية» في البوّابة، فتُضاء قطعتُه في هلال الصفحة
-- العامّة `/vision` لحظتَها. علامةُ الرؤية تُبنى من هذه الصفوف (قطعةٌ لكلّ هدف، وطبقةٌ لكلّ مسار)،
-- فإن زاد هدفٌ أو نقص أُعيد بناءُ الهلال وحده.
--
-- **ما يُنشر وما لا يُنشر:** «الواقعُ اليوم» (`baseline`: لجانٌ فارغة، نسبُ حضور…) كُتب للمجلس لا
-- للعامّة (محمد ٢٠٢٦-١١-٠٣). فالجداولُ مغلقةٌ على الزائر والعضو، والصفحةُ العامّة تقرأ من دالّةٍ آمنة
-- (`get_public_vision`) لا تُخرج إلّا الحقولَ المنشورة — على سَنن `get_public_structure`.
-- والكتابةُ من الخادم وحده بمفتاح الخدمة بعد فحص القدرة `manage_vision`.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ═══ (١) الرؤية ══════════════════════════════════════════════════════════════
create table public.visions (
  id            bigint generated always as identity primary key,
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name          text not null check (char_length(btrim(name)) between 2 and 60),
  starts_on     date not null,
  -- الأفقُ حدثٌ لا يومٌ ثابت («بداية رمضان» تثبت برؤية الهلال)، فيُقال بلفظه، ويومُه التقديريّ للعدّ التنازليّ وحده
  horizon_label text not null check (char_length(btrim(horizon_label)) between 2 and 40),
  horizon_on    date not null,
  status        text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at    timestamptz not null default now(),
  check (horizon_on > starts_on)
);
comment on table public.visions is
  'رؤى أدِيب: لكلّ مرحلةٍ رؤيةٌ باسمها وأفقها. draft مسوّدة، active السارية (واحدةٌ فقط)، closed منتهية تبقى في الأرشيف.';
-- رؤيةٌ واحدةٌ ساريةٌ في كلّ وقت (القاعدة الثالثة من سياسة الرؤى)
create unique index visions_one_active on public.visions ((true)) where status = 'active';

-- ═══ (٢) المسارات: طبقاتُ الهلال ═════════════════════════════════════════════
create table public.vision_tracks (
  id         bigint generated always as identity primary key,
  vision_id  bigint not null references public.visions(id) on delete cascade,
  position   smallint not null check (position between 1 and 8),
  name       text not null check (char_length(btrim(name)) between 2 and 40),
  summary    text not null default '' check (char_length(summary) <= 400),
  -- مفتاحُ رمزه في الواجهة (`lib/vision/icons.ts`)
  icon       text not null default 'target' check (icon ~ '^[a-z-]{2,20}$'),
  unique (vision_id, position)
);
comment on table public.vision_tracks is 'مساراتُ الرؤية: كلُّ مسارٍ طبقةٌ في هلالها، الأوّلُ الطبقةُ الخارجيّة.';

-- ═══ (٣) الأهداف: قطعُ الفسيفساء ═════════════════════════════════════════════
create table public.vision_goals (
  id          bigint generated always as identity primary key,
  track_id    bigint not null references public.vision_tracks(id) on delete cascade,
  position    smallint not null check (position between 1 and 99),
  -- عنوانُ مجموعته داخل المسار («سدّ القيادة»، «الفعاليات»…)
  cluster     text check (cluster is null or char_length(btrim(cluster)) between 2 and 40),
  title       text not null check (char_length(btrim(title)) between 2 and 120),
  detail      text check (detail is null or char_length(btrim(detail)) between 2 and 300),
  target      text not null check (char_length(btrim(target)) between 1 and 120),
  owner       text not null check (char_length(btrim(owner)) between 2 and 120),
  -- الواقعُ يومَ كُتبت الرؤية — للمجلس والغرفة، لا يخرج من `get_public_vision`
  baseline    text check (baseline is null or char_length(btrim(baseline)) between 1 and 200),
  -- موعدُه يضعه المجلسُ الإداريّ لكلّ هدف (محمد ٢٠٢٦-١١-٠١)، فيبدأ فارغًا
  due_on      date,
  status      text not null default 'pending' check (status in ('pending', 'active', 'done')),
  done_at     timestamptz,
  updated_by  uuid references public.profiles(id) on delete set null,
  updated_at  timestamptz not null default now(),
  unique (track_id, position),
  check ((status = 'done') = (done_at is not null))
);
comment on table public.vision_goals is
  'أهدافُ الرؤية: كلُّ هدفٍ قطعةٌ في طبقة مساره، تُضاء حين يتحقّق (done). pending لم يبدأ، active قيد العمل.';

alter table public.visions enable row level security;
alter table public.vision_tracks enable row level security;
alter table public.vision_goals enable row level security;
revoke all on public.visions, public.vision_tracks, public.vision_goals from anon, authenticated;

-- ═══ (٤) القدرة: الرئيسان وقائدُ الضمان والجودة ═══════════════════════════════
-- «الإدارة التنفيذية تنفّذ، والضمان والجودة يتابع» (محمد ٢٠٢٦-١١-٠١): فالمتابعةُ لقائد الضمان،
-- ومعه الرئيسان كسائر غرف المجلس.
insert into public.permissions (permission_key, permission_name_ar, description, category)
select 'manage_vision', 'متابعة الرؤية',
       'حالُ أهداف الرؤية ومواعيدُها ونصوصُها، في /dashboard/vision — وما يُضاء منها يظهر في /vision', 'admin'
where not exists (select 1 from public.permissions p where p.permission_key = 'manage_vision');

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from (values ('club_president'), ('executive_council_president'), ('qa_committee_leader')) as r(role_name)
join public.permissions p on p.permission_key = 'manage_vision'
where not exists (
  select 1 from public.role_permissions x
  where x.role_name = r.role_name and x.permission_id = p.id
);

-- ═══ (٥) البابُ العامّ: الحقولُ المنشورة وحدها ════════════════════════════════
-- بلا `p_slug`: الرؤيةُ السارية، فإن لم تكن فآخرُ منتهية. وبه: تلك الرؤيةُ إن كانت منشورة.
-- والمسوّدةُ لا تخرج أبدًا. و`archive` بقيّةُ الرؤى المنشورة بعدد أهدافها وما تحقّق منها.
create or replace function public.get_public_vision(p_slug text default null)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
  with v as (
    select * from public.visions
    where status in ('active', 'closed') and (p_slug is null or slug = p_slug)
    order by (status = 'active') desc, starts_on desc
    limit 1
  )
  select (
    select jsonb_build_object(
      'slug', v.slug,
      'name', v.name,
      'starts_on', v.starts_on,
      'horizon_label', v.horizon_label,
      'horizon_on', v.horizon_on,
      'status', v.status,
      'tracks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'position', t.position,
          'name', t.name,
          'summary', t.summary,
          'icon', t.icon,
          'goals', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', g.id, 'cluster', g.cluster, 'title', g.title, 'detail', g.detail,
              'target', g.target, 'owner', g.owner, 'due_on', g.due_on,
              'status', g.status, 'done_at', g.done_at
            ) order by g.position)
            from public.vision_goals g where g.track_id = t.id
          ), '[]'::jsonb)
        ) order by t.position)
        from public.vision_tracks t where t.vision_id = v.id
      ), '[]'::jsonb),
      'archive', coalesce((
        select jsonb_agg(jsonb_build_object(
          'slug', o.slug, 'name', o.name, 'starts_on', o.starts_on,
          'horizon_label', o.horizon_label, 'status', o.status,
          'total', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id),
          'done', (select count(*) from public.vision_goals g join public.vision_tracks t on t.id = g.track_id where t.vision_id = o.id and g.status = 'done')
        ) order by o.starts_on desc)
        from public.visions o where o.status in ('active', 'closed') and o.id <> v.id
      ), '[]'::jsonb)
    )
    from v
  );
$function$;
comment on function public.get_public_vision(text) is
  'صفحةُ الرؤية العامّة (/vision): الرؤيةُ المنشورة بمساراتها وأهدافها، بلا «الواقع اليوم» ولا من غيّر الحال.';
-- تقرؤها الصفحةُ العامّة بمفتاح الزائر (الدوالُّ الجديدة تولد مغلقة، ٢٠٢٦-١٠-١٠)
grant execute on function public.get_public_vision(text) to anon, authenticated;

-- ═══ (٦) الرؤيةُ الأولى: «رؤية الهلال» كما عُرضت على المجلس الإداريّ (٢٠٢٦-١١-٠١) ═══════
insert into public.visions (slug, name, starts_on, horizon_label, horizon_on, status)
values ('hilal', 'رؤية الهلال', '2026-11-01', 'بداية رمضان', '2027-02-08', 'active');

insert into public.vision_tracks (vision_id, position, name, summary, icon)
select v.id, t.position, t.name, t.summary, t.icon
from public.visions v
cross join (values
  (1, 'التمكين', 'بنهاية الرؤية لا تبقى لجنة أو قسم بلا قيادة، ولكل لجنة هدف تعمل عليه، ويكون أدِيب قد حقق ثلاث رغبات طلبها أعضاؤه.', 'users'),
  (2, 'الأثر', 'يعود أدِيب بفعالية متوسطة في منتصف كل شهر، وبرُشد كل أسبوع دراسة.', 'presentation'),
  (3, 'الصدى', 'تُطلق مظلة مرئية بهوية منفصلة لها ذراع صوتية في إذاعة أدِيب، ويُجمع تاريخ أدِيب في مركز إعلامي على الموقع.', 'megaphone'),
  (4, 'التحوّل الرقمي', 'قبل رمضان يكون تطبيق أدِيب في متجري أبل وقوقل، وتكتمل برمجة نظام أدِيب وبوابته، ويُعلن ديبو بعد تغذية معرفته.', 'device')
) as t(position, name, summary, icon)
where v.slug = 'hilal';

insert into public.vision_goals (track_id, position, cluster, title, detail, target, owner, baseline)
select t.id, g.position, g.cluster, g.title, g.detail, g.target, g.owner, g.baseline
from public.visions v
join public.vision_tracks t on t.vision_id = v.id
join (values
  -- المسار الأوّل: التمكين
  (1, 1, 'سد القيادة', 'سد مقعد قائد إدارة الضمان والجودة', null, 'مشغول', 'الرئيسان', 'شاغر'),
  (1, 2, 'سد القيادة', 'منسق لكل قسم', null, '4 من 4', 'إدارة الموارد البشرية', '2 من 4 (صناعة المحتوى ونظم المعلومات بلا منسق)'),
  (1, 3, 'سد القيادة', 'لا لجنة فارغة', 'في كل لجنة قائد ونائب وخمسة أعضاء على الأقل، من المتطوعين أولا', '9 من 9', 'إدارة الموارد البشرية', 'التسويق والتقارير والأرشفة فارغتان، والبرمجة بلا أعضاء، والنائب في 3 لجان من 9'),
  (1, 4, 'تمكين القادة', 'لقاء تأسيسي للقادة والنواب', 'الرؤية، والهدف الاستراتيجي، وأدوات بوابة أدِيب', 'يُعقد بحضور كل القادة', 'الرئيس التنفيذي', null),
  (1, 5, 'تمكين القادة', 'هدف استراتيجي لكل لجنة', 'يخدم أحد المسارات، بمؤشر مكتوب', '9 أهداف معتمدة', 'قادة اللجان، ويعتمدها المجلس الإداري', '0'),
  (1, 6, 'الأعضاء والمتطوعون', 'استبيان الرغبات', 'كل عضو يكتب رغبة يتمنى أن يحققها له أدِيب، وتُنشر النتائج', 'مشاركة 80% من الأعضاء', 'إدارة الموارد البشرية', null),
  (1, 7, 'الأعضاء والمتطوعون', 'تحقيق أكثر ثلاث رغبات تكرارا في الاستبيان', null, '3 رغبات', 'المجلس الإداري', '0'),
  (1, 8, 'الأعضاء والمتطوعون', 'تفعيل المتطوعين', 'بمقعد في لجنة أو فرصة تطوعية واحدة على الأقل', '50% من المتطوعين', 'إدارة الموارد البشرية', '16 من 105 قدموا على فرصة، وقبل 5'),
  (1, 9, 'العمل في بوابة أدِيب', 'كل لجنة تدير مهامها في بوابة أدِيب', null, '9 لجان من 9', 'قادة اللجان', '0 مهام'),
  (1, 10, 'العمل في بوابة أدِيب', 'أول تقييم ربعي حاسم يُنفذ كاملا في بوابة أدِيب', null, 'دورة مغلقة بنتائجها', 'المجلس الإداري', null),
  -- المسار الثاني: الأثر
  (2, 1, 'الفعاليات', 'حسم القاعات لرُشد والفعاليات', 'ومذكرة تَجَرَّبْ إحدى وسائله', 'تصريح أو اتفاق قائم', 'قسم التواصل المجتمعي', null),
  (2, 2, 'الفعاليات', 'فعالية متوسطة في منتصف كل شهر', null, '3 فعاليات: نوفمبر وديسمبر ويناير', 'لجنة الفعاليات', '0'),
  (2, 3, 'الفعاليات', 'رُشد أسبوعيا', 'ورشة أو دورة أو جلسة', 'نحو 9 فعاليات في أسابيع الدراسة', 'فريق رُشد', '0'),
  (2, 4, 'الحضور والرعاة', 'نسبة الحضور من الحجوزات', null, '75%', 'لجنة الفعاليات', '58% (108 من 187)'),
  (2, 5, 'الحضور والرعاة', 'حقيبة رعاية', 'ما يحصل عليه الراعي في الفعالية وموجز والموقع والتطبيق', 'جاهزة', 'لجنة السفراء', null),
  (2, 6, 'الحضور والرعاة', 'راع لكل فعالية متوسطة', 'وكل الرعاة مسجلون في الموقع', '3 رعاة', 'لجنة السفراء', '0 مسجل'),
  -- المسار الثالث: الصدى
  (3, 1, 'البرامج المرئية', 'إطلاق المظلة المرئية', 'بهوية منفصلة', 'الاسم والهوية معتمدان ومعلنان', 'قسم الإنتاج الإعلامي', null),
  (3, 2, 'البرامج المرئية', 'مقطع مرئي، ولكل حلقة نسخة صوتية في إذاعة أدِيب', null, 'موسم مرئي من 3 إلى 4 حلقات', 'قسم الإنتاج الإعلامي', null),
  (3, 3, 'البرامج المرئية', 'موجز كل شهر', null, '3 حلقات', 'قسم الإنتاج الإعلامي', null),
  (3, 4, 'الصورة والخبر والأرشيف', 'رفة كل أسبوع', null, 'صورة في كل أسبوع من أسابيع الرؤية', 'لجنة التصوير', null),
  (3, 5, 'الصورة والخبر والأرشيف', 'عودة الأخبار', 'خبر لكل فعالية خلال 72 ساعة', 'كل فعاليات الرؤية', 'لجنة التقارير والأرشفة', 'آخر خبر في مايو 2026'),
  (3, 6, 'الصورة والخبر والأرشيف', 'المركز الإعلامي على الموقع', 'تاريخ أدِيب وفعالياته وصوره وفيديوهاته، يجمع المكتبة والأخبار والإذاعة والأعمال', 'منشور، وفيه أرشيف السنوات السابقة', 'البناء: لجنة البرمجة، والمحتوى: لجنة التقارير والأرشفة', null),
  -- المسار الرابع: التحوّل الرقميّ
  (4, 1, 'البوابة والتطبيق', 'إكمال برمجة نظام وبوابة أدِيب', 'قائمة مغلقة معتمدة، ومنها التقييم الربعي جاهزا ومجربا', 'كل بنود القائمة منفذة', 'قسم نظم المعلومات', null),
  (4, 2, 'البوابة والتطبيق', 'تطبيق أدِيب', 'للإذاعة (تشغيل في الخلفية وتحكم من شاشة القفل) والبرامج المرئية والأخبار وحجز الفعاليات والإشعارات، وبوابة الأعضاء تُفتح من داخله', 'منشور في متجري أبل وقوقل', 'لجنة البرمجة', null),
  (4, 3, 'ديبو', 'تغذية معرفة ديبو', 'الفعاليات ورُشد والبرامج والأنظمة', 'يجيب عن هذه الأربعة', 'قسم نظم المعلومات', '13 سؤالا شائعا وثلاث معلومات فقط'),
  (4, 4, 'ديبو', 'إعلان ديبو', null, 'يُحدد بعد الإعلان', 'قسم الإنتاج الإعلامي', '40 محادثة منذ إطلاقه')
) as g(track, position, cluster, title, detail, target, owner, baseline)
  on g.track = t.position
where v.slug = 'hilal';

commit;
