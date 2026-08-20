-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260310174714   الاسم: fix_profiles_rls_for_public_comments


-- السماح للجميع (بما في ذلك الزوار) بقراءة الحقول الأساسية من جدول profiles
-- هذا ضروري لعرض أسماء الأعضاء في التعليقات العامة

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select"
ON public.profiles
FOR SELECT
TO public
USING (
  -- السماح للمستخدم برؤية ملفه الشخصي
  id = auth.uid() 
  OR 
  -- السماح للإداريين برؤية جميع الملفات
  get_user_max_role_level(auth.uid()) >= 5
  OR
  -- السماح للجميع (بما في ذلك الزوار) برؤية الحقول الأساسية فقط
  -- هذا يسمح بعرض الأسماء في التعليقات العامة
  true
);

