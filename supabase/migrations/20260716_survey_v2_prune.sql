-- ============================================================
-- نظام الاستبيانات V2 — الجزء ١: التقليم
-- خمسة جداول صفريّة لم يُكتب لها كود قطّ، منظوران يتجاوزان RLS بلا
-- قارئ واحد (البند الأحمر الوحيد في DB-AUDIT)، سلالة دوالّ مكسورة
-- تقرأ أعمدة غير موجودة، وجدول مشاركةٍ تقاعد بقرار «كلّ المشرفين
-- يرون كلّ الاستبيانات» في لوحة V2.
-- ============================================================

-- ١) المنظوران المتجاوزان لـ RLS — يقرآن الجداول بصلاحيّة postgres
--    (لا security_invoker) ويكشفان بريد المنشئ وIP المجيب، وصفر قارئ لهما
drop view if exists surveys_overview;
drop view if exists survey_responses_detailed;

-- ٢) الجداول الميتة: صفر صفوف وصفر مراجع في كامل تاريخ المستودع
alter table survey_questions drop column if exists section_id;
drop table if exists survey_sections cascade;
drop table if exists survey_templates cascade;
drop table if exists survey_shares cascade;
drop table if exists survey_analytics cascade;
drop table if exists survey_notifications cascade;

-- ٣) مشاركة النتائج بين المشرفين تقاعدت — V2 يعرض كلّ الاستبيانات
--    لكلّ المشرفين (نمط وحدة الأعضاء). cascade يُسقط سياسات
--    *_shared_read المعتمدة على الجدول في الجداول الأربعة الحيّة.
--    ملاحظة: سياسة الإدراج فيه كانت ثغرة تصعيد (أيّ مستخدم يشارك
--    استبيان غيره لنفسه فيفتح قراءة كلّ الاستجابات).
drop table if exists survey_sharing cascade;

-- ٤) العدّادات المخزّنة تقاعدت — الانحراف موثّق (استبيان 40: مخزّن 1
--    والواقع 119). V2 يحسبها من الصفوف مباشرة.
drop trigger if exists trigger_update_survey_statistics on survey_responses;
drop function if exists update_survey_statistics();

-- ٥) الدوالّ الميتة/المكسورة/اليتيمة
drop function if exists can_access_survey(uuid, uuid);              -- تقرأ surveys.allowed_roles غير الموجود
drop function if exists can_access_survey(integer, uuid);           -- ناقصة ولا سياسة تستدعيها
drop function if exists can_respond_to_survey(integer, uuid, text); -- تقرأ surveys.max_responses غير الموجود
drop function if exists update_survey_stats(uuid);                  -- تقرأ surveys.completion_rate غير الموجود
drop function if exists update_survey_stats();                      -- يتيمة، خلَفها update_survey_statistics وقد تقاعد
drop function if exists trigger_update_survey_stats();              -- تستدعي التحميل الميّت أعلاه
drop function if exists update_survey_response_count();             -- يتيمة
drop function if exists update_survey_updated_at();                 -- يتيمة، خلَفها update_updated_at_column
drop function if exists get_survey_completion_rate(integer);        -- بلا مستدعٍ
drop function if exists generate_survey_share_token();              -- كانت لجدول survey_shares الميّت
drop function if exists calculate_completion_rate(uuid);            -- رفيقة السلالة الميتة
drop function if exists calculate_average_time(uuid);               -- رفيقة السلالة الميتة

-- ٦) دوالّ الانتحال الاستبيانيّة: صفر مستدعٍ في V1 وV2 معًا،
--    وإحداها تقرأ survey_sharing الساقط أعلاه
drop function if exists impersonate_get_user_surveys(uuid);
drop function if exists impersonate_get_survey_responses(uuid, integer);
drop function if exists impersonate_get_shared_surveys(uuid);
