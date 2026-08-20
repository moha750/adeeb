-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260810171108   الاسم: candidacy_allow_same_committee_pair


-- إرخاء البند (ج): كان يمنع أيّ ترشّحٍ نشطٍ ثانٍ في النادي كلّه. صار يُسمح بالمقعد الثاني
-- إن كان في **اللجنة نفسها** (قيادةً ونيابةً)؛ ويبقى المنع لأيّ نطاقٍ آخر. البقيّة كما هي.
CREATE OR REPLACE FUNCTION public.is_user_eligible_to_run(p_user uuid, p_election uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_election   elections%ROWTYPE;
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

    -- ولا ترشّح نشطٌ في نطاقٍ **آخر**. يُسمح بالمقعد الثاني في **اللجنة نفسها** (قيادةً ونيابةً):
    -- فالحصر صار «ترشّحٌ نشطٌ لهذا العضو في انتخابٍ لجنتُه غير لجنة هذا الانتخاب» (أو منسّق).
    select exists (
        select 1 from election_candidates ec join elections e on e.id = ec.election_id
        where ec.user_id = p_user and ec.status in ('pending','approved','needs_edit')
          and e.archived_at is null
          and e.status in ('candidacy_open','candidacy_closed','voting_open','voting_closed')
          and e.id <> p_election
          and e.target_committee_id is distinct from v_election.target_committee_id
    ) into v_has_active;

    return not v_has_active;
end;
$function$

