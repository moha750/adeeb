-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260808111843   الاسم: 20260808_elections_36_governance_finalize

-- انتخابات — اعتماد نهائيّ لحوكمة القدرات (قرار المالك).

-- (1) إدارة الانتخاب: تُزال من عضو الموارد → تبقى للرئيس والتنفيذيّ وقائد الموارد
delete from role_permissions
 where role_name = 'hr_admin_member'
   and permission_id = (select id from permissions where permission_key = 'manage_elections');

-- (2) إسناد المناصب: يُمنح للتنفيذيّ وقائد الموارد (مع رئيس النادي القائم)
insert into role_permissions (role_name, permission_id)
select r, (select id from permissions where permission_key = 'manage_positions')
from unnest(array['executive_council_president','hr_committee_leader']) r
on conflict (role_name, permission_id) do nothing;

-- (3) منح الفائز يعود بسلطة مُعلِن الفائز نفسه — إذ صار مديرو الانتخاب الثلاثة
--     يملكون manage_positions، فلا حاجة لسلطة رئيس النادي نائبةً. والمُعلِن أدقّ سجلًّا.
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
            jsonb_build_object('winner_user_id', v_winner_user, 'role_name', NEW.target_role_name, 'assignment', v_result));
    return NEW;
end;
$function$;
