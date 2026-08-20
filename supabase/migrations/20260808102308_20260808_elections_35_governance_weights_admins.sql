-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260808102308   الاسم: 20260808_elections_35_governance_weights_admins

-- ═══════════════════════════════════════════════════════════════════════
-- انتخابات — تصحيح حوكمة بقرار المالك: أوزانٌ جديدة + مديرو الانتخاب والمطّلعون
-- ═══════════════════════════════════════════════════════════════════════
-- لا يمسّ الأصوات المُدلاة (وزنها مُلقَط عند الإدلاء) — التغيير للمستقبل فقط.

-- ── (1) أوزان التصويت الجديدة (roles.vote_weight) ────────────────────────
update roles set vote_weight = 4.0 where role_name in ('executive_council_president','president_advisor');
update roles set vote_weight = 3.5 where role_name in ('hr_committee_leader','qa_committee_leader');
update roles set vote_weight = 3.0 where role_name in ('hr_admin_member','qa_admin_member');
-- بلا تغيير: club_president 4.0 · department_head 2.5 · committee_leader 2.0 · deputy 1.5 · committee_member 1.0

-- ── (2) من يدير الانتخاب (manage_elections): الرئيس + التنفيذيّ + قائد الموارد + عضو الموارد ─
insert into role_permissions (role_name, permission_id)
select r, (select id from permissions where permission_key = 'manage_elections')
from unnest(array['executive_council_president','hr_committee_leader','hr_admin_member']) r
on conflict (role_name, permission_id) do nothing;
-- (club_president يملكها سلفًا)

-- ── (3) من يطّلع (view_election_candidates): نفس الأربعة ─────────────────
--     إضافة التنفيذيّ، وإزالة المستشار (بقرار المالك).
insert into role_permissions (role_name, permission_id)
values ('executive_council_president', (select id from permissions where permission_key = 'view_election_candidates'))
on conflict (role_name, permission_id) do nothing;

delete from role_permissions
 where role_name = 'president_advisor'
   and permission_id = (select id from permissions where permission_key = 'view_election_candidates');

-- ── (4) الاطّلاع صار قدرةً صرفة (يطابق القائمة أعلاه) ───────────────────
-- كان محفورًا (المستشار + عضو الموارد للجنته). صار قدرةً: حَمَلة view_election_candidates
-- الأربعة يرَون كلّ المرشّحين (قرار خصوصيّة المالك: القائمة مسطّحة لا مُنطَّقة).
create or replace function public.has_election_view_permission(p_user uuid, p_election uuid)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
    select coalesce(check_user_permission(p_user, 'view_election_candidates'), false);
$function$;

-- ── (5) جذرٌ لازم: منح الفائز لم يعد يعتمد على manage_positions لدى المُعلِن ─
-- «من يدير» انفصل عن «من يُسنِد» (manage_positions لرئيس النادي وحده). فمنح الفائز
-- (عبر assign_position) يُنفَّذ بسلطة **رئيس النادي** — سلطتُه تسري على نتيجة الانتخاب —
-- لا بسلطة مُعلِن الفائز الذي قد لا يملك manage_positions. والمُعلِن يبقى مسجَّلًا في التدقيق.
create or replace function public.auto_grant_winner_role()
returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
    v_winner_user uuid;
    v_actor       uuid;
    v_result      jsonb;
begin
    if NEW.status <> 'completed' or OLD.status = 'completed' then
        return NEW;
    end if;

    select user_id into v_winner_user from election_candidates where id = NEW.winner_candidate_id;
    if v_winner_user is null then
        raise exception 'auto_grant_winner_role: لا فائزَ مرتبطٌ بهذا الانتخاب';
    end if;

    select user_id into v_actor from user_roles where role_name = 'club_president' and is_active limit 1;
    if v_actor is null then v_actor := NEW.winner_declared_by; end if;

    v_result := assign_position(
        p_actor      => v_actor,
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
            jsonb_build_object('winner_user_id', v_winner_user, 'role_name', NEW.target_role_name, 'assignment', v_result));
    return NEW;
end;
$function$;
