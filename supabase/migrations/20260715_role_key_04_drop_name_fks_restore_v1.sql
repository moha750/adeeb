-- عاجل: إسقاط مفتاحَي role_name الأجنبيَّين — لأنّهما كسرا V1 كسرًا حيًّا.
--
-- ═══ ما حدث ═══
--
-- PostgREST يستنتج «التضمين» (embedding) من المفاتيح الأجنبيّة وحدها. وحين
-- صار لـuser_roles مفتاحان إلى roles (role_id و role_name)، صار كلّ استعلام
-- تضمينٍ قائم ملتبسًا:
--
--     GET /user_roles?select=user_id,roles(role_level)
--     → PGRST201: Could not embed because more than one relationship was
--                 found for 'user_roles' and 'roles'
--
-- وهذا **٢٨ موضعًا في ١٢ ملفًّا** من V1 الحيّ، منها فحص وصول الأدمن نفسه
-- (`admin/js/master-access.js:31`) و٥ دوالّ حافّة. أي أنّ إضافة المفتاح
-- نقضت الخطّ الأحمر الذي قامت عليه الخطّة: «V1 يبقى على الرقم لا يشعر بشيء».
--
-- الخطّة أمرت بـFK، وأمرت ألّا يشعر V1 — والأمران لا يجتمعان في PostgREST.
-- فقُدِّم الحيّ على الزينة.
--
-- (والعلّة ليست في «أضِف ولا تحذف»: العمود نفسه إضافيّ صرف لا يراه قارئ.
--  الكاسر هو **المفتاح الثاني إلى نفس الجدول**، لا العمود.)
--
-- ═══ ولا حارس يضيع ═══
--
-- التريغر sync_role_key هو الحارس الفعليّ، وهو هنا أقوى من FK لا أضعف:
--   • يشتقّ role_name من roles اشتقاقًا، فلا يمكن أصلًا أن يحمل قيمةً باطلة.
--   • اسمٌ لا دور له يُرفض 23503، والمفتاحان المتعارضان يُرفضان 23514.
--     (مُثبَتان بالتجربة بعد إسقاط المفتاحين — لا FK يقف خلفهما.)
--   • BEFORE على INSERT و UPDATE معًا — لا مسار كتابةٍ يفلت منه.
-- وحذف الدور يظلّ يُسقِط الصفّ عبر role_id FK (ON DELETE CASCADE) فيذهب
-- الاسم مع صفّه. و«لا تُغيّر role_name» خطٌّ أحمر قائم أصلًا.
--
-- فمكسب FK هنا ≈ صفر، وثمنه كسر V1 الحيّ.
--
-- البديل المرفوض: إبقاء FK وتصحيح ٢٨ موضعًا في V1 إلى
-- `roles!user_roles_role_id_fkey(...)` — هجرةٌ لقارئي نظامٍ زائل، وهو ما
-- قامت الخطّة كلّها على تجنّبه.

alter table user_roles       drop constraint if exists user_roles_role_name_fkey;
alter table role_permissions drop constraint if exists role_permissions_role_name_fkey;

comment on column user_roles.role_name is
  'مفتاح المنصب. المصدر لV2. لا FK عمدًا: مفتاحان إلى roles يجعلان تضمين PostgREST ملتبسًا (PGRST201) فينكسر V1. الحارس تريغر sync_role_key — يشتقّ الاسم من roles فلا يحمل قيمةً باطلة.';

comment on column role_permissions.role_name is
  'مفتاح المنصب. المصدر لV2. لا FK عمدًا — انظر user_roles.role_name.';
