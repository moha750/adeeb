-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260331110949   الاسم: drop_elections_system


-- حذف نظام الانتخابات بالكامل

-- حذف الجداول التابعة أولاً (بسبب المفاتيح الخارجية)
DROP TABLE IF EXISTS election_activity_log CASCADE;
DROP TABLE IF EXISTS election_votes CASCADE;
DROP TABLE IF EXISTS election_candidates CASCADE;

-- حذف الجدول الرئيسي
DROP TABLE IF EXISTS elections CASCADE;

