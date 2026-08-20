-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260731130441   الاسم: supervision_split_07_revoke_client_execute

-- الصلاحيّات كنظيرتيهما assign_position/revoke_position: الخدمة وحدها (p_actor يُصدَّق، فلا يُفتح للعميل)
revoke execute on function public.assign_supervision(uuid, uuid, integer, integer, boolean, text) from public, anon, authenticated;
revoke execute on function public.revoke_supervision(uuid, uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.enforce_supervision_shape() from public, anon, authenticated;
revoke execute on function public.cascade_membership_loss_to_supervision() from public, anon, authenticated;
