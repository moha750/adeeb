-- ═══════════════════════════════════════════════════════════════════════
-- نظام الانتخابات — إعادة تأسيس نظيفة على الهيكلة الجديدة (بلا حذف أيّ بيانات)
-- ═══════════════════════════════════════════════════════════════════════
--
-- لا تُمَسّ صفوف elections / election_candidates / election_votes /
-- election_audit_log. كلّ ما هنا: إعادة كتابة دوالّ (CREATE OR REPLACE قابلة
-- للرجوع) + عمود حوكمة إضافيّ + توجيه منح الفائز عبر assign_position + إزالة
-- كائنات ميّتة. الجذر لا الترقيع:
--
--   • الصلاحيّة قدرةٌ لا اسمَ دورٍ محفورًا  → check_user_permission
--   • «مَن يصوّت في كلّ انتخاب» عمودُ حوكمة مُصرَّح → roles.votes_in_all_elections
--   • «مَن يترشّح» قدرة run_for_election → لا قائمةَ حظرٍ سباعيّة
--   • منح الفائز عبر assign_position → لا بوّابةَ إسنادٍ ثانية غير محروسة
--
-- ملاحظة أمنيّة: كلّ استعمال لـ check_user_permission في حارسٍ منطقيّ مُغلَّفٌ
-- بـ coalesce(...,false) — فـ «NOT NULL» في حارس RPC يفتح بدل أن يمنع.

-- ═══ (1) عمود الحوكمة: مَن يصوّت في كلّ انتخاب ═══════════════════════════
alter table roles add column if not exists votes_in_all_elections boolean not null default false;

update roles set votes_in_all_elections = true
 where role_name in ('club_president','executive_council_president','president_advisor','hr_committee_leader');

comment on column roles.votes_in_all_elections is
  'حوكمة: الأدوار التي تصوّت في كلّ انتخابٍ مهما كان نطاقه (الإدارة العليا). '
  'مصدرٌ واحد مُصرَّح — is_top_admin_role يشتقّ منه، بدل قائمة أسماءٍ محفورة في دوالّ.';

-- ═══ (2) is_top_admin_role: يشتقّ من العمود لا من قائمةٍ محفورة ═══════════
create or replace function public.is_top_admin_role(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
    select exists (
        select 1 from user_roles ur join roles r on r.id = ur.role_id
        where ur.user_id = p_user and ur.is_active and r.votes_in_all_elections
    );
$function$;

-- ═══ (3) صلاحيّة إدارة الانتخابات: قدرة manage_elections ═════════════════
create or replace function public.has_election_admin_permission(p_user uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
    select coalesce(check_user_permission(p_user, 'manage_elections'), false);
$function$;

-- ═══ (4) صلاحيّة الاطّلاع على المرشّحين: تُترَك كما هي عمدًا ══════════════
-- has_election_view_permission لا تُلمَس في هذا الترحيل — سببٌ مبدئيّ لا سهو:
-- الاطّلاع فيه بُعدُ *نطاق* لا تعبّر عنه قدرةٌ مسطّحة. المستشار يرى كلّ الانتخابات،
-- وعضو الموارد يرى *لجنته وحدها* (تقليلُ انكشاف بيانات المرشّحين). تحويلها إلى
-- قدرةٍ صرفة يوسّع رؤية ٩ من أعضاء الموارد إلى كلّ اللجان — قرارُ حوكمة/خصوصيّة
-- يُترَك للمالك، لا يُبَتّ في ترحيلٍ تقنيّ. فتبقى الدالّة الحيّة بسلوكها الحاليّ.

-- ═══ (5) أهليّة التصويت: is_top_admin_role() + النطاق ════════════════════
create or replace function public.is_user_eligible_to_vote(p_user uuid, p_election uuid)
returns boolean language plpgsql stable security definer set search_path to 'public'
as $function$
declare
    v_election elections%ROWTYPE;
    v_in_scope boolean;
begin
    select * into v_election from elections where id = p_election;
    if not found then return false; end if;

    -- (أ) الإدارة العليا تصوّت في كلّ انتخاب — من العمود لا من قائمة
    if is_top_admin_role(p_user) then return true; end if;

    -- (ب) ضمن نطاق الانتخاب: قسم → أعضاء لجانه؛ لجنة → أعضاؤها
    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur
            join committees c on c.id = ur.committee_id
            where ur.user_id = p_user and ur.is_active
              and c.department_id = v_election.target_department_id
        ) into v_in_scope;
    else
        select exists (
            select 1 from user_roles ur
            where ur.user_id = p_user and ur.is_active
              and ur.committee_id = v_election.target_committee_id
        ) into v_in_scope;
    end if;

    return coalesce(v_in_scope, false);
end;
$function$;

-- ═══ (6) لوحة المشاركة: الإدارة العليا من العمود (لا قائمة محفورة) ════════
create or replace function public.get_election_voters_participation(p_election uuid)
returns table(user_id uuid, full_name text, role_name text, has_voted boolean, voted_at timestamptz, vote_weight numeric)
language plpgsql stable security definer set search_path to 'public'
as $function$
declare
    v_election elections%ROWTYPE;
begin
    select * into v_election from elections where id = p_election;
    if not found then raise exception 'الانتخاب غير موجود'; end if;

    if not has_election_admin_permission(auth.uid())
       and not has_election_view_permission(auth.uid(), p_election) then
        raise exception 'غير مصرح بعرض قائمة المصوّتين';
    end if;

    return query
    with eligible as (
        -- (أ) الإدارة العليا — ناخبون في كلّ الانتخابات (من العمود)
        select distinct ur.user_id as uid
        from user_roles ur join roles r on r.id = ur.role_id
        where ur.is_active and r.votes_in_all_elections
        union
        -- (ب) ضمن نطاق الانتخاب
        select distinct ur.user_id as uid
        from user_roles ur
        where ur.is_active
          and (
              (v_election.target_role_name = 'department_head'
                and exists (select 1 from committees c
                            where c.id = ur.committee_id
                              and c.department_id = v_election.target_department_id))
              or
              (v_election.target_role_name in ('committee_leader','deputy_committee_leader')
                and ur.committee_id = v_election.target_committee_id)
          )
    )
    select p.id, p.full_name,
           coalesce(get_user_primary_role(p.id), 'unknown'),
           v.id is not null, v.created_at, v.vote_weight
    from eligible e
    join profiles p on p.id = e.uid
    left join election_votes v on v.election_id = p_election and v.voter_id = p.id
    order by (v.id is not null) desc, p.full_name;
end;
$function$;

-- ═══ (7) أهليّة الترشّح: الحظر من الميتاداتا + قدرة run_for_election ══════
-- الحظرُ صار مُشتقًّا لا محفورًا: عضو المجلس الإداريّ (council_type='administrative')
-- لا يترشّح — رقابةٌ لا تنافس — وهو يعيد قائمة الحظر السباعيّة القديمة حرفًا بحرف
-- (الرئيس · المستشار · التنفيذيّ · قائدا الموارد والضمان · عضوا الموارد والضمان).
-- ثمّ لا بدّ من قدرة run_for_election (تُقصي منسّق النشاط وغيره ممّن لا يترشّح
-- تنفيذيًّا). وتبقى قيود التعارض البنيويّة والنطاق والترشّح السابق/النشط.
create or replace function public.is_user_eligible_to_run(p_user uuid, p_election uuid)
returns boolean language plpgsql stable security definer set search_path to 'public'
as $function$
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

    -- (أ) لا يترشّح من يحمل أيّ دورٍ إداريّ (council_type='administrative') — يسدّ
    --     ثغرة مزدوج الدور الذي كان يَعبُر بحارس is_top_admin_role وحده. ثمّ
    --     لا بدّ من قدرة run_for_election.
    if exists (
        select 1 from user_roles ur join roles r on r.id = ur.role_id
        where ur.user_id = p_user and ur.is_active and r.council_type = 'administrative'
    ) then return false; end if;
    if not coalesce(check_user_permission(p_user, 'run_for_election'), false) then return false; end if;

    -- (ب) قيود التعارض البنيويّة + النطاق
    if v_election.target_role_name = 'department_head' then
        select exists (
            select 1 from user_roles ur join roles r on r.id = ur.role_id
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
            select 1 from user_roles ur join roles r on r.id = ur.role_id
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.id = ur.role_id
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
            select 1 from user_roles ur join roles r on r.id = ur.role_id
            join committees c on c.id = v_election.target_committee_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'department_head' and ur.department_id = c.department_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.id = ur.role_id
            where ur.user_id = p_user and ur.is_active
              and r.role_name = 'committee_leader' and ur.committee_id = v_election.target_committee_id
        ) into v_blocks;
        if v_blocks then return false; end if;

        select exists (
            select 1 from user_roles ur join roles r on r.id = ur.role_id
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

    -- (ج) لا ترشّح سابق على هذا الانتخاب بعينه، ولا ترشّح نشط في انتخابٍ آخر
    select exists (
        select 1 from election_candidates ec
        where ec.election_id = p_election and ec.user_id = p_user
    ) into v_has_prior;
    if v_has_prior then return false; end if;

    select exists (
        select 1 from election_candidates ec join elections e on e.id = ec.election_id
        where ec.user_id = p_user and ec.status in ('pending','approved','needs_edit')
          and e.archived_at is null
          and e.status in ('candidacy_open','candidacy_closed','voting_open','voting_closed')
    ) into v_has_active;

    return not v_has_active;
end;
$function$;

-- ═══ (8) منح الفائز عبر assign_position — البوّابة المُخوّلة الوحيدة ═══════
-- كان يكتب user_roles مباشرةً ويُعطّل *كلّ* أدوار الفائز (افتراض «دورٌ واحد لكلّ
-- عضو» خاطئ في هيكلةٍ تسمح بأدوارٍ متعدّدة). صار يمرّ بـ assign_position فيحترم
-- النطاق والتفرّد وWRONG_UNIT والإحلال، ويُبقي أدوار الفائز الأخرى المشروعة،
-- ويُعطّل عضويّته السابقة في اللجنة عند ترقّيه (منطق assign_position نفسه).
-- مُعلِن الفائز يملك manage_positions (مُتحقَّق: حَمَلة manage_elections الثلاثة
-- كلّهم يملكونها) فلا يُرفض الإسناد لنقص صلاحية.
create or replace function public.auto_grant_winner_role()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
    v_winner_user uuid;
    v_result      jsonb;
begin
    if NEW.status <> 'completed' or OLD.status = 'completed' then
        return NEW;
    end if;

    select user_id into v_winner_user from election_candidates where id = NEW.winner_candidate_id;
    if v_winner_user is null then
        raise exception 'auto_grant_winner_role: لا فائزَ مرتبطٌ بهذا الانتخاب';
    end if;

    v_result := assign_position(
        p_actor      => NEW.winner_declared_by,
        p_user       => v_winner_user,
        p_role_name  => NEW.target_role_name,
        p_committee  => NEW.target_committee_id,
        p_department => NEW.target_department_id,
        p_replace    => true,
        p_notes      => 'تعيين تلقائيّ بعد الفوز في الانتخاب ' || NEW.id::text
    );

    if not coalesce((v_result->>'ok')::boolean, false) then
        raise exception 'تعذّر إسناد منصب الفائز: %', coalesce(v_result->>'message', 'خطأ غير معروف');
    end if;

    insert into election_audit_log (election_id, actor_id, event_type, payload)
    values (NEW.id, NEW.winner_declared_by, 'winner_declared',
            jsonb_build_object('winner_user_id', v_winner_user,
                               'role_name', NEW.target_role_name,
                               'assignment', v_result));
    return NEW;
end;
$function$;

-- ═══ (9) إزالة المهمّة الميّتة (تنادي دالّةً غير موجودة كلّ دقيقة) ════════
-- auto_advance_elections_by_deadline → public.auto_advance_elections_by_deadline()
-- غير موجودة فتصرخ كلّ دقيقة. العاملة الحقيقيّة elections-sweep-deadlines تبقى.
do $$
begin
  perform cron.unschedule('auto_advance_elections_by_deadline');
exception when others then
  raise notice 'المهمّة auto_advance_elections_by_deadline غائبة سلفًا — لا شيء يُلغى.';
end $$;

-- ═══ (10) إزالة سياسات التخزين الميّتة (دلو election-applications غير موجود) ═
-- الدلو الوحيد الموجود election-files، وسياساته الستّ الحيّة تبقى كما هي.
-- التسعة أدناه كلّها تشير لدلوٍ غير موجود (فهي خاملة)، وإحداها تحفر دورًا وهميًّا
-- administrative_council_president — تُزال تنظيفًا لا تغييرَ سلوك.
drop policy if exists "Allow authenticated reads"      on storage.objects;
drop policy if exists "Allow authenticated uploads"    on storage.objects;
drop policy if exists "election_applications_delete"   on storage.objects;
drop policy if exists "election_applications_insert"   on storage.objects;
drop policy if exists "election_applications_select"   on storage.objects;
drop policy if exists "election_applications_update"   on storage.objects;
drop policy if exists "election_files_delete"          on storage.objects; -- election-applications + administrative_council_president
drop policy if exists "election_files_read"            on storage.objects; -- election-applications
drop policy if exists "election_files_upload"          on storage.objects; -- election-applications
