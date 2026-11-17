-- ════════════════════════════════════════════════════════════════════════════
-- المرشّحُ يُعرَف باسمه في بطاقة الاقتراع (قرار المالك والمجلس الإداري، ٢٠٢٦-١١-٠٧)
-- ════════════════════════════════════════════════════════════════════════════
-- كانت البطاقةُ تُعمّي المرشّح: رقمٌ وبيانٌ وملفّ، ولا اسمَ ولا صورة. والتجربةُ أعطت عكسَ
-- ما أُريد بها: فاز مَن لو عُرف لما صُوِّت له، وندم ناخبون بعد أن عرفوا. والبيانُ وحده لم
-- يعد يكفي للحكم : كلامٌ مُغرٍ يُكتب بلا عناء، ولا يقول شيئًا عن التزام صاحبه وتعامله.
--
-- فالمرشّحُ يُعرَض باسمه وجنسه وصورته. و**الصوتُ يبقى سرّيًّا** كما كان: لا يتغيّر شيءٌ في
-- `election_votes` ولا في سياستها، ولا يعرف أحدٌ مَن صوّت لمن.
--
-- والدالّةُ تُسمّى باسمٍ جديد لأنّ القديم (`get_anonymized_candidates`) صار يقول ما لا تفعل.
-- والحارسُ نفسُه منقولٌ كما هو: الإدارةُ والمطّلِع يرون متى شاؤوا، والناخبُ لا يرى إلّا بعد
-- فتح التصويت وإلّا إن كان مؤهّلًا لهذا المقعد.

create or replace function public.get_ballot_candidates(p_election uuid)
returns table (
  candidate_id uuid,
  candidate_number integer,
  full_name text,
  gender text,
  avatar_url text,
  statement_ar text,
  file_url text,
  file_name text,
  file_size_bytes integer,
  file_mime text,
  is_self boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_election elections%rowtype;
  v_eligible boolean;
  v_is_admin boolean;
  v_is_view  boolean;
begin
  select * into v_election from elections where id = p_election;
  if not found then
    raise exception 'الانتخاب غير موجود';
  end if;

  v_is_admin := has_election_admin_permission(auth.uid());
  v_is_view  := has_election_view_permission(auth.uid(), p_election);

  if not v_is_admin and not v_is_view then
    if v_election.status not in ('voting_open','voting_closed','completed') then
      raise exception 'لا يمكن عرض المرشحين قبل فتح التصويت';
    end if;

    select is_user_eligible_to_vote(auth.uid(), p_election) into v_eligible;
    if not v_eligible then
      raise exception 'غير مؤهل لعرض مرشحي هذا الانتخاب';
    end if;
  end if;

  return query
  select
    ec.id,
    ec.candidate_number,
    p.full_name,
    p.gender,
    p.avatar_url,
    ec.statement_ar,
    ec.file_url,
    ec.file_name,
    ec.file_size_bytes,
    ec.file_mime,
    (ec.user_id = auth.uid()) as is_self
  from election_candidates ec
  left join profiles p on p.id = ec.user_id
  where ec.election_id = p_election
    and ec.status = 'approved'
  order by ec.candidate_number;
end;
$function$;

-- مولودةٌ مغلقة (security_01): البطاقةُ تُقرأ بجلسة الناخب، فتحتاج `authenticated` صراحةً.
revoke all on function public.get_ballot_candidates(uuid) from public, anon;
grant execute on function public.get_ballot_candidates(uuid) to authenticated, service_role;

-- القديمةُ تذهب ولا يبقى منها أثر (قاعدة المالك: لا يُترك ما لا يُستعمل). لا تصويتَ مفتوحٌ
-- ساعةَ التطبيق، فلا ناخبَ يقف بين حذفها ورفع الواجهة التي تنادي الجديدة.
drop function if exists public.get_anonymized_candidates(uuid);
