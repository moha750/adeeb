-- حذف عمود candidacy_start من جدول الانتخابات
-- السبب: عند إنشاء الانتخاب يُفتح باب الترشح فوراً، فـ created_at يغني عن candidacy_start

ALTER TABLE elections DROP COLUMN IF EXISTS candidacy_start;
