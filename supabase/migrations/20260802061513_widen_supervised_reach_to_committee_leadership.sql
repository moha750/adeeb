-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802061513   الاسم: widen_supervised_reach_to_committee_leadership

-- مدى «المُشرَف عليهم» يشمل قيادة اللجنة (٢٠٢٦-٠٨-٠٢)
--
-- كان الفرع يشترط أن يكون دور الهدف `committees.member_role_name` فيُسقط قائد اللجنة ونائبها،
-- والصواب بنصّ المالك: إشراف عضو الموارد على اللجنة يشمل **كلّ من فيها — قائدًا ونائبًا وعضوًا**.
-- فنُزع الشرط وحده، وبقي ما عداه: السلطة لا تتجزّأ على الشخص الواحد، والحجب بالأسماء.
--
-- وأثره يسري على الأفعال الثلاثة معًا (إنهاء العضويّة · تعديل البيانات · الإنذار) — حَكَمٌ واحد لا حَكَمان.
create or replace function public.member_within_reach(p_actor uuid, p_target uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p_actor is not null and p_target is not null and exists (
    select 1
    from user_roles a
    join membership_authority t on t.role_name = a.role_name
    where a.user_id = p_actor and a.is_active
      and case t.scope
        when 'all' then not exists (
          select 1 from user_roles v
          where v.user_id = p_target and v.is_active
            and v.role_name = any (t.blocked_roles)
        )
        -- «المُشرَف عليهم» = من كلُّ أدواره الحيّة في لجانٍ يشرف عليها الفاعل — أيًّا كان الدور:
        -- عضوًا أو نائبًا أو قائدًا (٢٠٢٦-٠٨-٠٢). ومن له دورٌ في لجنةٍ خارج إشرافه يسقط كلُّه،
        -- فالسلطة لا تتجزّأ على الشخص الواحد.
        when 'supervised' then
          exists (select 1 from user_roles v where v.user_id = p_target and v.is_active)
          and not exists (
            select 1 from user_roles v
            where v.user_id = p_target and v.is_active
              and not (
                v.committee_id is not null
                and exists (
                  select 1 from committee_supervision s
                  where s.supervisor_id = p_actor and s.committee_id = v.committee_id
                )
              )
          )
        else false
      end
  );
$function$;

comment on function public.member_within_reach(uuid, uuid) is
  'مدى سلطة الفاعل على العضو — يقرأ membership_authority. supervised يشمل قيادة اللجنة المُشرَف عليها.';
