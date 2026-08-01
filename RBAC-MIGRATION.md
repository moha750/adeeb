# ترحيل الصلاحيات إلى نظام قدراتيّ حقيقيّ (RBAC) — وثيقة قرار مؤجَّل

> **الحالة: مؤجَّل عن قصد (2026-07-10).** نُكمل بناء شاشات اللوحة مؤقّتًا مع `role_level ≥ 8`،
> ونعود لهذا **كمشروع خلفيّ مستقلّ** لاحقًا. هذه الوثيقة تحفظ الاكتشاف والخطّة كي لا نُعيد الفحص.
> المصدر: تحقيق مُوثَّق على القاعدة الحيّة (5 محاور متوازية) بتاريخ 2026-07-10.
>
> **تحديث (2026-07-16): تجاوزَه قرارٌ أوسع.** أمر المالك باقتلاع `role_level` من القاعدة نفسها
> (لا الإبقاء عليه «للعرض والترتيب» كما في §6.5). هذه الوثيقة تبقى **المرجع التفصيليّ لمسار
> التفويض (Track A)**، وخطّة الاقتلاع الكاملة في `ROLE-LEVEL-ELIMINATION.md`.

---

## 1) الخلاصة في فقرة

قاعدتك تحوي **نظام صلاحيات قائم على القدرات (capability-based RBAC) مبنيًّا بنسبة ~70%** — لكنّه
**غير موصول بالفرض، وأجزاؤه الكاتبة معطّلة**. النتيجة: جداول القدرات موجودة ومملوءة وتُستعمل
لإظهار/إخفاء القوائم فقط، بينما **الحماية الحقيقيّة تجري على أرقام `role_level` ثابتة**. لذلك
الهدفان اللذان طلبهما المستخدم (استبدال الأرقام بهويّة المنصب + التحكّم بالصلاحيات من الواجهة)
**ليسا اختراعًا جديدًا، بل إكمال وإصلاح لِما هو قائم**.

هذا الاتجاه **مطابق لتوصية `DB-AUDIT.md`**: «قوِّ، لا تُعِد البناء».

---

## 2) ما هو موجود ويعمل (الوجهة الصحيحة — نحتفظ به)

| المكوّن | التفصيل |
|---|---|
| `permissions` | **29 قدرة مُسمّاة** (`permission_key` + `permission_name_ar` + `category`). أمثلة: `manage_positions`, `approve_applications`, `manage_member_data`, `impersonate_users`, `manage_news`, `publish_news`, `manage_surveys`, `manage_activities`, `manage_elections`, `run_for_election`. |
| `role_permissions` | **~143 صفًّا** يربط كلّ منصب بقدراته — **بيانات قابلة للتعديل**. PK = (role_id, permission_id). أمثلة: club_president→28، exec_council_president→23، hr_committee_leader→16، department_head→11، committee_member→1، activity_coordinator→**0**. |
| `user_specific_permissions` | تجاوزات لكلّ مستخدم (منح/منع مؤقّت). حاليًّا **0 صفوف** (غير مستعمل). أعمدة: id, user_id, permission_id, is_granted, granted_by, expires_at, created_at. |
| `get_user_permissions(uuid)` | **✅ تعمل**. تُرجع القدرات الفعليّة = أدوار المستخدم ⋈ role_permissions ∪ منح خاصّ − منع خاصّ. (اللوحة القديمة تستعملها عبر `PermissionsHelper.hasPermission`). |
| `get_user_all_permissions`, `get_user_permissions_by_module` | قرّاء إضافيّون يعملون. |

**هويّة المنصب موجودة أصلًا** كصفوف: `roles.id` + `roles.role_name` (سلاسل ثابتة). وهناك سابقة
جيّدة: `is_top_admin_role(uuid)` تفحص `role_name IN (...)` بدل الرقم.

---

## 3) ما هو معطّل (يجب إصلاحه أولًا)

- **`check_permission(user, key, scope, ctx)` معطّلة** — تشير إلى عمود `scope` **غير موجود** على
  `role_permissions`/`user_specific_permissions`. أي استدعاء يفشل: `ERROR 42703: column "scope" does not exist`.
- **`grant_permission_to_role` / `revoke_permission_from_role` معطّلة** — تكتب أعمدة
  (`scope`, `conditions`, `granted_by`) وجدول `permissions_audit_log` **غير موجودة**، وتستعمل
  `ON CONFLICT(role_id, permission_id, scope)` على مفتاح غير موجود. (هذه هي دوالّ الواجهة المستقبليّة.)
- الأعمدة الفعليّة لـ`role_permissions` = (role_id, permission_id, created_at) فقط.

---

## 4) ما يفرض الحماية فعلًا اليوم (المشكلة)

- **105 من 261** سياسة RLS تبوّب على `role_level >= N` (غالبًا `>=8`). القدرات تستعملها **11 فقط**.
- **22 من 248** دالّة تُصلّب رقم `role_level`. القدرات تستعملها **دالّتان فقط**.
- مساعدات رقميّة: `current_user_is_admin()` = `role_level>=8`، `is_admin_user()` = `role_level>=5`،
  `get_user_max_role_level` / `get_user_highest_role_level` تحسب MAX(role_level).
- **الفريق يبتعد عن القدرات نحو الأرقام**: تعليق على `membership_interviews`:
  «تم تحديث سياسات RLS لإزالة الاعتماد على check_permission()».
- **لا واجهة تكتب القدرات** — `role_permissions` تُقرأ فقط (مكانين للاستبيانات)، وتُزرع بالـmigrations.
  شاشة «إدارة المناصب» تُسند **أشخاصًا** (`user_roles`) لا **قدرات**.

### دليل أنّ الاقتران يُنتج أخطاءً الآن
«هل هو أدمن؟» مُشفّرة بعتبات مختلفة لنفس الفكرة:
- `create-member-directly` → `role_level < 8`
- `migrate-accepted-member` / `resend-onboarding-email` / `send-member-welcome-email` → `role_level < 7`

وكثير من القرّاء يستعملون `.eq('is_active',true).single()` فيفشلون لو حمل المستخدم أكثر من دور نشط.

---

## 5) لماذا لا نبني الواجهة أولًا (الفخّ)

بناء «واجهة تحرير الصلاحيات» قبل نقل الفرض = **واجهة تكذب**: تبدّل قدرة فتتغيّر القائمة الجانبية،
لكن البوّابة الحقيقيّة (`role_level >= 8` في RLS) تتجاهل التبديل. تظنّ أنّك منعت منصبًا من حذف
الأعضاء وهو ما زال قادرًا. أسوأ من الوضع الصلب-الصادق الحاليّ. **الفرض أولًا، ثمّ الواجهة.**

---

## 6) الخطّة المرحليّة (عند العودة)

1. **إصلاح السباكة**: أصلِح `check_permission()` ودوالّ المنح/السحب لتطابق المخطّط (إمّا إضافة
   `scope`/`conditions` + جدول تدقيق، أو حذف مفهوم `scope` من الدوالّ). Migration مركّز + اختبار.
2. **بدائيّة واحدة**: دالّة `has_capability(uid, 'key')` تقرأ `role_permissions` (+ تجاوزات المستخدم).
   واحدة، `SECURITY DEFINER`, مُختبَرة.
3. **نقل الفرض**: حوّل الـ105 سياسة + الدوالّ الطرفيّة من `role_level` إلى `has_capability(...)`.
   الأكبر والأهمّ. اختبر كلّ سياسة (لا تقفل أحدًا، لا تفتح ثغرة).
4. **الواجهة**: مصفوفة (مناصب × قدرات) تستدعي دوالّ المنح/السحب المُصلَحة. الآن صادقة.
5. **فصل `role_level`**: يبقى **للعرض والترتيب والهيكل التنظيميّ فقط**، ويُمنع نهائيًّا من أيّ
   `if (level >= N)` للتفويض. (اسم/هويّة المنصب = «مَن هو»؛ القدرة = «ماذا يستطيع».)

---

## 7) جرد نقاط الاقتران (خريطة العمل — للترجمة: رقم → قدرة مُسمّاة)

### v2 (Next.js)
- `v2/apps/web/src/lib/auth.ts:8` — `ADMIN_MIN = 8`؛ `:61` `isAdmin = roleLevel >= ADMIN_MIN`.
  → القدرة المقصودة: `access_dashboard`.
- `v2/apps/web/src/app/dashboard/layout.tsx:15` — بوّابة اللوحة على `isAdmin`.
- `v2/apps/web/src/app/dashboard/members/credentials/actions.ts:25` — تسييج تغيير الدخول على `isAdmin`.
  → القدرة: `change_member_credentials` (مستقلّة عن الرتبة).
- `v2/apps/web/src/app/dashboard/members/data.ts:92-99` — اختيار «أفضل دور» بـ`role_level` (**عرض فقط** — مشروع).

### الدوالّ الطرفيّة (Edge)
- `create-member-directly/index.ts:72` `< 8` (+ `:187` `.eq('role_level',3)` لتحديد دور العضو). → `create_member`.
- `migrate-accepted-member/index.ts:63` `< 7`. → `migrate_member`.
- `resend-onboarding-email/index.ts:58` `< 7`. → `resend_onboarding`.
- `send-member-welcome-email/index.ts:64` `< 7`؛ `send-position-assignment-email/index.ts:71-77` `< 7`.

### اللوحة القديمة (JS) — أمثلة بارزة
- `admin/auth-manager.js:350-360` خريطة أرقام `sectionPermissions = {users:8, committees:8, settings:10, …}` (أوضح نمط «الأرقام = صلاحيات»).
- `admin/js/master-access.js:10` `PRESIDENT_ROLE_LEVEL = 10` (انتحال الهويّة). → `impersonate_users`.
- `admin/dashboard.js:297` ألعاب `>=8`؛ `:2581-2635` و`:3150-3740` كشف قادة الهيكل بـ`role_level ===7/6/5/>=8`.
- `admin/js/attendance-manager.js:41` + فحص اسم `activity_coordinator` (قدرة مزيّفة بالكود). → `record_attendance`.
- `admin/js/news-workflow-manager.js:24` قائمة أسماء أدوار للنشر. → `publish_news`.
- `admin/js/positions-manager.js:194-205` قوائم أسماء + `role_level===3`.

### SQL (RLS + RPC) — أكبر سطح
- `20260408_activities_programs.sql` عدّة `>= 8`؛ `20260427_activity_coordinator_management.sql` `>= 8`؛
  `20260510_guess_word_game.sql` `>= 8`؛ `20260422000002_elections_02_permissions.sql` `role_name IN (...)`؛
  `20260622_membership_submit_rpc_and_exec_council_perms.sql` `role_name = ANY(ARRAY[...])`.
- أوزان الانتخابات مقياس رقميّ **مستقلّ** عن role_level: `20260422000001_elections_01_schema.sql:17-25`.

---

## 8) التحذير الحاكم

القاعدة **مشتركة بين الموقع القديم الحيّ و v2**. أيّ تغيير RLS يمسّ **عمليّات النادي الجارية الآن**،
لا v2 فقط. لذا: migrations مُراجَعة، اختبار كلّ سياسة، ونشر تدريجيّ. مشروع **أيّام** بعناية، وله
مخاطرة إنتاج حقيقيّة — لهذا هو **مشروع مستقلّ** لا مهمّة عابرة.

---

## 9) القرار

- **2026-07-10:** أُجِّل. نُكمل شاشات اللوحة بـ`role_level ≥ 8` مؤقّتًا (`ADMIN_MIN` في مكان واحد يسهّل التبديل لاحقًا).
- **القدرة السريعة المتاحة بلا مخاطرة** (متى شئنا): تحويل `getCurrentAdmin` في v2 لقراءة
  `get_user_permissions` (تعمل) وفحص قدرة مُسمّاة بدل الرقم — بلا لمس RLS ولا الموقع الحيّ.
