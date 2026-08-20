-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260720204222   الاسم: normalize_achievements_icon_keys


-- تطبيع icon_class: من سلاسل FontAwesome الإرثيّة إلى مفاتيح أيقونات V2 (statIcons).
-- ما لا يُعرَف يُصفَّر ليقع على الأيقونة الافتراضية في العرض — فيصير العمود مفاتيحَ خالصة.
UPDATE achievements SET icon_class = 'film'      WHERE icon_class = 'fa-solid fa-photo-film';
UPDATE achievements SET icon_class = 'megaphone' WHERE icon_class = 'fa-solid fa-hashtag';
UPDATE achievements SET icon_class = 'workshop'  WHERE icon_class = 'fa-solid fa-chalkboard';
UPDATE achievements SET icon_class = 'trophy'    WHERE icon_class = 'fa-solid fa-trophy';
UPDATE achievements SET icon_class = NULL        WHERE icon_class LIKE 'fa-%';

