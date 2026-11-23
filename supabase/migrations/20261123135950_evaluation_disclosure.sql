-- تقييمُ القيادات (٨): الكشف (محمد، ٢٠٢٦-١١-٢٣)، ويشمل تقييمَ نوفمبر 2026.
--
-- كانت السرّيّةُ كاملة: لا يرى أحدٌ من قيّم ولا ماذا أعطى، حتى الإدارة. فقرّر محمد بعد تجربة المحاكي (`/ui/evaluation/sim`):
--   • الرئيسان يريان من قيّم ومن لم يقيّم، وتقييمَ كلٍّ منهم بدرجاته وملاحظاته، أثناء التقييم وبعده.
--   • قائدا الموارد البشريّة والضمان والجودة يريان من قيّم ومن لم يقيّم وحده، لا ماذا أعطى.
--   • والقائدُ المقيَّم لا يرى من قيّمه أبدًا، ويرى في «نتيجتي» النهائيّةَ والحكمَ وحدهما (لا الشقّين).
-- وقدرتان لا رتبة (CLAUDE.md: التفويضُ بالقدرات وحدها)، والقاعدةُ تعطي الصفوفَ للخادم وحده، والخادمُ يسأل عن القدرة.
--
-- ولماذا تسقط أرقامُ الشقّين من «نتيجتي»: كانا يُخفيان إن قلّت أوراقُ أحدهما عن ثلاث، لكنّ النهائيّة = 70% أعضاء + 30% مجلس،
-- فمن النهائيّة والشقّ الظاهر يُحسب المخفيّ. فلا يعود الشقّان من القاعدة أصلًا، لا يُخفيان في الواجهة وحدها.

-- ══ ١) القدرتان ═══════════════════════════════════════════════════════════

insert into public.permissions (permission_key, permission_name_ar, description, category)
select v.k, v.n, v.d, 'membership'
from (values
  ('view_leader_evaluation_participation', 'من قيّم في تقييم القيادات',
   'يرى في نافذة المقيَّم من قيّم ومن لم يقيّم، بلا درجاتٍ ولا ملاحظات'),
  ('view_leader_evaluation_ballots', 'تقييمات المقيِّمين',
   'يرى تقييمَ كلِّ مقيِّمٍ باسمه: درجاتِه وملاحظاتِه، أثناء التقييم وبعده')
) as v(k, n, d)
where not exists (select 1 from public.permissions p where p.permission_key = v.k);

insert into public.role_permissions (role_name, permission_id)
select r.role_name, p.id
from public.permissions p
join (values
  ('view_leader_evaluation_participation', 'club_president'),
  ('view_leader_evaluation_participation', 'executive_council_president'),
  ('view_leader_evaluation_participation', 'hr_committee_leader'),
  ('view_leader_evaluation_participation', 'qa_committee_leader'),
  ('view_leader_evaluation_ballots', 'club_president'),
  ('view_leader_evaluation_ballots', 'executive_council_president')
) as r(cap, role_name) on r.cap = p.permission_key
where not exists (
  select 1 from public.role_permissions rp where rp.role_name = r.role_name and rp.permission_id = p.id
);

-- ══ ٢) تقييماتُ مقيَّمٍ واحد، للخادم وحده ═══════════════════════════════════════
-- الخادمُ يسأل عن القدرة قبلها: صاحبُ «من قيّم» يأخذ المعرّفاتِ وحدها، وصاحبُ «التقييمات» يأخذ الدرجاتِ والملاحظات.
-- والمُبطَلُ بالتصحيح لا يُعدّ تقييمًا.

create or replace function public.evaluation_admin_ballots(p_target integer)
returns table(rater_id uuid, part text, scores smallint[], keep_text text, change_text text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select b.rater_id, b.part, b.scores, b.keep_text, b.change_text
  from evaluation_ballots b
  where b.target_id = p_target and b.voided_at is null and b.rater_id is not null;
$$;
comment on function public.evaluation_admin_ballots(integer) is
  'تقييماتُ مقيَّمٍ واحد بأصحابها (الكشف، ٢٠٢٦-١١-٢٣). للخدمة وحدها: الخادمُ يعطي منها بقدر قدرة الناظر.';
revoke all on function public.evaluation_admin_ballots(integer) from public, anon, authenticated;

-- ══ ٣) نتيجتي: النهائيّةُ والحكمُ، بلا الشقّين ════════════════════════════════════

drop function if exists public.evaluation_my_results();

create function public.evaluation_my_results()
returns table(target_id integer, due_on date, role_name text, unit_name text, verdict text, branch text,
              final_num bigint, final_den bigint,
              members_ballots integer, members_eligible integer, council_ballots integer,
              comments integer, removed_at timestamptz, restored_at timestamptz, cancelled text,
              returned_unit text, awaiting_return boolean)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id, c.due_on, t.role_name, t.unit_name, t.verdict, t.branch, t.final_num, t.final_den,
         t.members_ballots, t.members_eligible, t.council_ballots,
         (select count(*)::integer from evaluation_ballots b
          where b.target_id = t.id and b.voided_at is null and (b.keep_text is not null or b.change_text is not null)),
         t.removed_at, t.restored_at, t.cancelled,
         (select u.committee_name_ar from committees u where u.id = t.returned_to),
         t.awaiting_return
  from evaluation_targets t
  join evaluation_cycles c on c.id = t.cycle_id
  where t.user_id = auth.uid() and t.excluded is null and c.status = 'executed'
  order by c.due_on desc, t.id;
$$;
-- منحٌ مقصود: نتيجةُ صاحب الجلسة وحده.
revoke all on function public.evaluation_my_results() from public, anon;
grant execute on function public.evaluation_my_results() to authenticated;
