-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260717010921   الاسم: funcs_credentials_drop_leftover_var

do $mig$
declare fn text; d text;
begin
  foreach fn in array array['public.update_member_email(uuid,text)','public.update_member_password(uuid,text)'] loop
    d := pg_get_functiondef(fn::regprocedure);
    d := regexp_replace(d, 'v_caller_role_level\s+INT\s*;', '');
    execute d;
  end loop;
end $mig$;
