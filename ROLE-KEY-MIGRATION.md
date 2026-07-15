# الرقم ← الاسم: توحيد مفتاح المنصب

> **الحالة: نُفّذت على الإنتاج 2026-07-15.** الخطوات ١–٤ تامّة؛ والخطوة ٥ (إسقاط `role_id`) مؤجَّلة إلى موت V1.
> اقرأ [[project_org_structure]] و[[feedback_v2_priority_dont_gate_on_v1]].
>
> **ما صار في القاعدة:** `role_name` عمودٌ في `user_roles` (233) و`role_permissions` (143) · تريغر **`sync_role_key`** يزامن المفتاحين في الجدولين · `assign_position(p_role_name)` والاسم هو المرجع · `roles.vote_weight` NOT NULL بلا DEFAULT · `election_vote_weights` مُجمَّد.
>
> **ما بقي:** إسقاط `role_id` و`p_role` — كلاهما ينتظر موت V1 (٨٢ موضعًا).

## الجملة الواحدة

القاعدة تستعمل مفتاحين للمنصب — `roles.id` (رقم) و`roles.role_name` (اسم) — وتخلط بينهما.
الاسم هو المفتاح الحقيقيّ عمليًّا؛ والرقم إرث محصور في جدولين. نوحّد على الاسم.

## لماذا الاسم، لا الرقم

- **`role_name` مفتاح فريد ثابت أصلًا**: `roles_role_name_key UNIQUE (role_name)`، وأمرٌ صريح لا يُغيَّر أبدًا.
- **وصار محروسًا بمفاتيح أجنبيّة حقيقيّة** (عمل 2026-07-15): `councils.head_role_name`، `committees.leader_role_name`، `committees.member_role_name` — ثلاثة FK تشير إلى `roles(role_name)`. القاعدة نفسها تمنع تغييره الآن.
- **الرقم لا يُستعمل خارج جدولين**: `user_roles.role_id`، `role_permissions.role_id`. بينما الاسم في ٥ جداول و**١٣ دالّة** وكامل منطق V2 (`model.ts` يذكره ٢٦ مرّة مقابل ١٣ للرقم؛ و`lib/auth.ts` بالاسم حصرًا).
- **النقل بين قاعدتين**: الأرقام تنزاح صامتة. سطرٌ مثل `insert into user_roles values (uid, 3)` يعني «قائدة الضمان» بالصدفة وحدها.
- **القراءة**: `(فاطمة، hr_admin_member، لجنة الرواة)` ≠ `(فاطمة، 4، 2)`.

## النطاق الدقيق — جدولان ودالّة

| الهدف | الحال | المقيس |
|---|---|---|
| `user_roles.role_id` | FK → `roles(id)` · `UNIQUE (user_id, role_id, committee_id)` | **233 صفًّا** (169 نشط) |
| `role_permissions.role_id` | FK → `roles(id)` ON DELETE CASCADE · `PK (role_id, permission_id)` | **143 صفًّا** |
| `assign_position(p_role integer)` | يستدعيها V2 وحده عبر `service_role` | `actions.ts:35` يمرّر `input.roleId` |

القرّاء في V2: `structure/model.ts` · `structure/actions.ts` · `structure/StructureView.tsx` · `members/data.ts` · `assignments/AssignmentsView.tsx` · `assignments/page.tsx`.

## الطريقة: أضِف ولا تحذف

V1 يقرأ `user_roles` في **٨٢ موضعًا** — ولن نهاجر قارئيه، فهو زائل ([[project_v1_retiring]]).

```
١. أضِف user_roles.role_name  + role_permissions.role_name   (FK → roles(role_name))
٢. املأهما من role_id
٣. تريغر يزامن العمودين في كلّ INSERT/UPDATE  ← الثمن الحقيقيّ الوحيد
٤. V2 وassign_position يقرآن الاسم؛ V1 يبقى على الرقم لا يشعر بشيء
٥. حين يموت V1: أسقِط role_id — مجّانًا، لأنّ قارئه الوحيد مات
```

**لا يوم تحويل، ولا نقل بيانات، ولا ٨٢ موضعًا تُصلحها.**

القيود الجديدة تُضاف بجانب القديمة لا بدلها:
- `UNIQUE (user_id, role_name, committee_id)` بجانب `UNIQUE (user_id, role_id, committee_id)`
- `UNIQUE (role_name, permission_id)` بجانب `PK (role_id, permission_id)`

## `assign_position`

أضِف معاملًا `p_role_name text default null` **بجانب** `p_role integer` (لا بدلَه — لا تكسر توقيعًا قائمًا):
- إن جاء `p_role_name` فهو المرجع؛ وإلّا اشتقّه من `p_role`.
- ثمّ حوّل V2 (`actions.ts:35`) إلى تمرير الاسم.
- ثمّ أسقِط `p_role` حين لا يبقى مستدعٍ.

## فخّ يستحقّ نفس الجلسة — عولج

**`election_vote_weights.role_name` كان بلا حارس إطلاقًا** — صفر FK، صفر CHECK. وغياب صفٍّ لدور قائم لا يشتكي منه أحد، لأنّ `get_vote_weight` يحسم الغياب بـ`COALESCE(...,1.0)`.

**العلاج المُنفَّذ (2026-07-15)**: الوزن صار عمودًا `roles.vote_weight` **NOT NULL بلا DEFAULT** — فكلّ دورٍ جديد مُلزَمٌ بالتصريح بوزنه وإلّا رفضته القاعدة. `election_vote_weights` مُجمَّد (باقٍ سجلًّا، كتابته مسحوبة، لا يقرؤه أحد). ولا وزن تغيّر لأحد: بصمة الأوزان قبل/بعد متطابقة (180 عضوًا، مجموع 199.5).

> ### تصحيح: «سطرٌ منسيّ» كان تشخيصًا خاطئًا
>
> نسخةٌ سابقة من هذه الفقرة قالت إنّ وزن قائدة الضمان (1.0) خللٌ وُلد من سطرٍ منسيّ. **هذا خطأ، والشفرة تكذّبه في ثلاثة مواضع مستقلّة:**
>
> 1. `20260422000001_elections_01_schema.sql:15` حرفيًّا: «الأوزان حسب المواصفات الجديدة (**QA غير مذكور عمداً** — يسقط إلى 1.0 افتراضياً)».
> 2. `is_top_admin_role` و`is_user_eligible_to_vote` تحفران أربعة أدوار تصوّت في كلّ انتخاب — `hr_committee_leader` منها و`qa_committee_leader` **ليس**.
> 3. صفّا الموارد (3.0 و2.5) مكتوبان، وتوأماهما في الضمان متروكان.
>
> وسطرٌ منسيّ واحد لا يُسقِط الدورَ نفسه من دالّتين أُخريَين. فالنمط سياسة: الضمان جهةُ رقابة، وحيادُ المدقّق يأبى أن يزن صوته أثقل ممّن يدقّق عليه.
>
> فكُتبت 1.0 صراحةً في `roles.vote_weight` — **نقلًا للقائم لا مصادقةً عليه**. وسؤال «هل يستحقّ المدقّق وزنًا انتخابيًّا؟» **قرار حوكمة مؤجَّل**، لا يُحسم في ترحيلٍ تقنيّ.

> **تصحيح**: `elections.target_role_name` **محروس** بقيدَي CHECK (`elections_target_role_name_check` و`elections_scope_check`) يحصران القيم في `department_head | committee_leader | deputy_committee_leader`. ليس نصًّا حرًّا. لكنّ القيدين **يحفران الأسماء** — فإضافة دور منتخَب تتطلّب `ALTER CONSTRAINT`.

## خطوط حمراء

1. **لا تُغيّر أيّ `role_name`.** صار أثقل من أيّ وقت: ٣ مفاتيح أجنبيّة + قيدا `elections` + ١٣ دالّة + كلّ منطق V2.
2. **لا تُسقِط `role_id` قبل موت V1.** ٨٢ موضعًا في V1 تقرؤه.
3. **التريغر (الخطوة ٣) ليس اختياريًّا.** بدونه ينحرف العمودان صامتَين — وV1 يكتب في `role_id`.

## البدء

في محادثة صافية: **«نفّذ خطّة الرقم ← الاسم»** — وأشِر إلى هذا الملفّ.
