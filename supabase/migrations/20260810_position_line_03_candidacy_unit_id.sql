-- سجلُّ ترشُّح العضو كان يُخرج **اسمَ** اللجنة بلا معرّفها، والتسميةُ تُسكِت الوحدةَ
-- بمقارنة المعرّفَين لا بمقارنة الأسماء (`assignmentScope`). فأُضيف المعرّف كما في
-- أختيها (`get_eligible_elections_for_user` · `get_votable_elections_for_user`)، فتقرأ
-- الشاشاتُ الثلاثُ القطعتين على نسقٍ واحد.
--
-- لا يمسّ الحارس ولا التوقيع: `p_user` وافتراضُه `auth.uid()` كما كانا.

drop function if exists public.get_user_candidacies(uuid);

create function public.get_user_candidacies(p_user uuid default null::uuid)
 returns table(
   candidate_id uuid, election_id uuid, election_status text,
   election_archived_at timestamp with time zone,
   target_role_name text, target_committee_id integer, target_committee_ar text,
   target_department_id integer, target_department_ar text,
   candidate_number integer, candidate_status text, statement_ar text,
   file_url text, file_name text, review_note_ar text,
   reviewed_at timestamp with time zone, submitted_at timestamp with time zone,
   candidacy_end timestamp with time zone, can_withdraw boolean, can_edit boolean
 )
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
    v_user uuid := coalesce(p_user, auth.uid());
begin
    return query
    select
        ec.id,
        e.id,
        e.status,
        e.archived_at,
        e.target_role_name,
        e.target_committee_id,
        c.committee_name_ar,
        e.target_department_id,
        d.name_ar,
        ec.candidate_number,
        ec.status,
        ec.statement_ar,
        ec.file_url,
        ec.file_name,
        ec.review_note_ar,
        ec.reviewed_at,
        ec.submitted_at,
        e.candidacy_end,
        (ec.status in ('pending','approved','needs_edit')
          and e.status in ('candidacy_open','candidacy_closed')
          and e.archived_at is null) as can_withdraw,
        -- التعديل لِـ pending و needs_edit وحدهما ما دام الترشّح مفتوحًا؛ المعتمَد لا يُعدَّل
        (ec.status in ('pending','needs_edit')
          and e.status = 'candidacy_open'
          and e.archived_at is null) as can_edit
    from election_candidates ec
    join elections e on e.id = ec.election_id
    left join committees  c on c.id = e.target_committee_id
    left join departments d on d.id = e.target_department_id
    where ec.user_id = v_user
    order by ec.submitted_at desc;
end;
$function$;

grant execute on function public.get_user_candidacies(uuid) to anon, authenticated, service_role;
