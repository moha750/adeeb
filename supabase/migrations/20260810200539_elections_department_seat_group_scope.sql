-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810200539   الاسم: elections_department_seat_group_scope

create or replace function public.election_department(p_election uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(e.target_department_id, c.department_id)
  from elections e
  left join committees c on c.id = e.target_committee_id
  where e.id = p_election;
$$;

comment on function public.election_department(uuid) is
  'قسمُ الانتخاب: قسمُه صراحةً (التنسيق) أو قسمُ لجنته (القيادة والنيابة). وحدةُ الحصر والحسم.';

create or replace function public.is_user_eligible_to_run(p_user uuid, p_election uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
    v_election   elections%ROWTYPE;
    v_dept       integer;
    v_blocks     boolean;
    v_in_scope   boolean;
    v_has_active boolean;
    v_has_prior  boolean;
begin
    select * into v_election from elections where id = p_election;
    if not found or v_election.status <> 'candidacy_open' or v_election.archived_at is not null then
        return false;
    end if;

    -- (أ) لا يترشّح عضو المجلس الإداريّ (رقابةٌ لا تنافس) — يعيد الحظر السباعيّ من
    --     الميتاداتا ويسدّ ثغرة مزدوج الدور. ثمّ لا بدّ من قدرة run_for_election.
    if exists (
        select 1 from user_roles ur join roles r on r.role_name = ur.role_name
        where ur.user_id = p_user and ur.is_active and r.council_type = 'administrative'
    ) then return false; end if;
    if not coalesce(check_user_permission(p_user, 'run_for_election'), false) then return false; end if;

    -- (ب) قيود التعارض البنيويّة + النطاق
    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active and r.role_name = 'department_head'
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join committees c on c.id = ur.committee_id
            where ur.user_id = p_user and ur.is_active
              and c.department_id = v_election.target_department_id
        ) into v_in_scope;

    elsif v_election.target_role_name = 'committee_leader' then
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;

    else -- deputy_committee_leader
        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.role_name = ur.role_name
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'deputy_committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;
    end if;

    if not coalesce(v_in_scope, false) then return false; end if;

    -- (ج) لا ترشّح سابق على هذا الانتخاب بعينه.
    select exists (
        select 1 from election_candidates ec
        where ec.election_id = p_election and ec.user_id = p_user
    ) into v_has_prior;
    if v_has_prior then return false; end if;

    -- ولا ترشّح نشطٌ في قسمٍ آخر. أمّا داخل القسم الواحد فيُجمع: مقعدا لجنته
    -- وتنسيقُ قسمها، ويسمّي مفضّله فيُحسم به عند الإعلان.
    v_dept := election_department(p_election);
    select exists (
        select 1 from election_candidates ec join elections e on e.id = ec.election_id
        where ec.user_id = p_user and ec.status in ('pending','approved','needs_edit')
          and e.archived_at is null
          and e.status in ('candidacy_open','candidacy_closed','voting_open','voting_closed')
          and e.id <> p_election
          and election_department(e.id) is distinct from v_dept
    ) into v_has_active;

    return not v_has_active;
end;
$function$;

drop function if exists public.set_seat_preference(integer, uuid);

create or replace function public.set_seat_preference(p_department integer, p_preferred_election uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
    update election_candidates ec
    set preference_rank = case when e.id = p_preferred_election then 1 else 2 end
    from elections e
    where e.id = ec.election_id
      and ec.user_id = auth.uid()
      and election_department(e.id) = p_department
      and e.archived_at is null
      and e.status in ('candidacy_open','candidacy_closed','voting_open','voting_closed')
      and ec.status in ('pending','approved','needs_edit');
end;
$function$;

comment on function public.set_seat_preference(integer, uuid) is
  'مفضَّلُ العضو بين مقاعد القسم الواحد: يأخذه إن فاز بأكثر من مقعد، ويذهب الباقي للتالي في الأصوات.';
