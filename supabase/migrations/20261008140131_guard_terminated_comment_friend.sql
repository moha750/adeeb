-- تصحيحُ تعليقٍ وحدَه (قرار المالك ٢٠٢٦-١٠-٠٨): «الزائر» صار لمن يتصفّح بلا حساب، والمنزلةُ «صديق أدِيب».
-- جسدُ الدالّة كما كان حرفًا بحرف.
create or replace function public.guard_terminated_membership_profile()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
    allowed constant text[] := array[
      'account_status', 'terminated_at', 'termination_reason', 'updated_at',
      'deletion_requested_at', 'deletion_reason', 'deleted_at', 'accepts_marketing',
      -- ما يحرّره صديقُ أدِيب عن نفسه (saveMyData)، والعضوُ السابقُ منهم (٢٠٢٦-١٠-٠٣)
      'full_name', 'phone', 'city'
    ];
begin
    if old.account_status is distinct from 'suspended'
       or new.account_status is distinct from 'suspended' then
        return new;
    end if;

    if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
        raise exception 'عضويّة منتهية لا تُحرَّر بياناتها (العضو %). أعِد العضوية أوّلًا ثمّ عدّلها.', old.id
            using errcode = '42501';
    end if;

    return new;
end;
$function$;
