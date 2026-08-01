-- موت V1 — تسديد البندين ١ و٢: إعدام المفتاح المزدوج (رقم + اسم)
--
-- ═══ العلّة ═══
--
-- `user_roles` و`role_permissions` يحملان هويّة المنصب **مرّتين**: `role_id` رقمًا
-- و`role_name` اسمًا، ويزامنهما تريغرٌ في اتّجاهين. مصدران لمعنًى واحد — والمزامنة
-- تُخفي التناقض بدل أن تكشفه، والقيد الحقيقيّ (الاسم) صار مستعمَلًا في كلّ مكان.
--
-- ═══ لماذا لم يُسقَط قبل اليوم ═══
--
-- كان يمنعه `admin/dashboard.js` في ٨٢ موضعًا — ومات مع V1 في 2026-08-01.
-- ثمّ تبيّن بالجرد أنّ **V2 ورث الرقم عنه**: تبويب الصلاحيات ومقعد المعاينة.
-- فرُحّلت تلك المواضع كلّها إلى الاسم في نفس اليوم، ولم يبقَ قارئٌ ولا كاتب.
--
-- ═══ التحقّق قبل الإسقاط ═══
--
--   grep -rn "role_id" v2/apps/web/src v2/packages --include=*.ts --include=*.tsx \
--     | grep -v "committee_id|department_id|permission_id"
--   → تعليقاتٌ فقط، صفر كود.
--
-- وعلى القاعدة الحيّة: إدراجٌ بالاسم وحده يمرّ (201) ويملأ التريغر الرقمَ —
-- فلا صفَّ في الجدولين بلا اسمٍ صحيح، ولا يفقد الإسقاطُ معلومة.
--
-- ═══ ترتيب ملزم ═══
--
-- العمودان أوّلًا ثمّ التريغران: مزامنةُ عمودٍ مفقودٍ خطأٌ لا فائدة فيه. ولو أُسقط
-- التريغر أوّلًا لظلّ العمودان يقبلان قيمًا متناقضة في النافذة بينهما.
--
-- **بلا `cascade`** — كسائر ترحيلات هذا اليوم: التابع الخفيّ يجب أن يَصرخ لا أن يُحذف.

begin;

/* ══ البند ١: العمودان ══════════════════════════════════════════════ */

alter table public.user_roles       drop column if exists role_id;
alter table public.role_permissions drop column if exists role_id;

/* ══ البند ٢: تريغرا المزامنة ودالّتهما ═════════════════════════════ */

drop trigger if exists user_roles_sync_role_key       on public.user_roles;
drop trigger if exists role_permissions_sync_role_key on public.role_permissions;

drop function if exists public.sync_role_key();

commit;

-- ═══ التحقّق بعد التنفيذ ═══
--
-- ١) لم يبقَ العمودان:
--
--   select table_name from information_schema.columns
--    where table_schema = 'public' and column_name = 'role_id'
--      and table_name in ('user_roles','role_permissions');
--   → صفر صفوف.
--
-- ٢) لم يبقَ التريغران ولا الدالّة:
--
--   select tgname from pg_trigger where tgname like '%sync_role_key%';
--   select proname from pg_proc where proname = 'sync_role_key';
--   → صفر صفوف في الاثنين.
--
-- ٣) البصمة قبل/بعد يجب أن تتطابق (لا صفَّ يضيع مع العمود):
--
--   select count(*) from public.role_permissions;  -- → ١٤٩ (بصمة 2026-08-01)
--   select count(*) from public.user_roles where is_active;
--
-- ٤) واللوحة نفسها: افتح /dashboard/system/permissions وبدّل قدرةً ثمّ أعِدها —
--    فالكتابة بالاسم وحدها هي ما يبقى بعد هذا الترحيل.
