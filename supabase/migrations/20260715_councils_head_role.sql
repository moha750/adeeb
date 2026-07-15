-- councils.head_role_name — «مَن يرأس المجلس»، حقيقةٌ لم تكن للقاعدة عبارةٌ تقولها.
--
-- ═══ الحال قبل هذا الترحيل ═══
--
-- جدول councils أعمدته: id, name_ar, description, group_link, created_at, updated_at.
-- لا شيء فيه يقول من يرأس المجلس. والحقيقة كما قرّرها المالك (2026-07-15):
--   المجلس الإداريّ  -> يرأسه رئيس نادي أدِيب
--   المجلس التنفيذيّ -> يرأسه رئيس المجلس التنفيذيّ
-- كانت تعيش في الأذهان وفي الشيفرة، لا في القاعدة.
--
-- ═══ لماذا الاسم لا الرقم ═══
--
-- roles.role_name مُعلَن UNIQUE، وثابت بأمرٍ صريح (لا يُغيَّر أبدًا)، وهو ما
-- تشير به elections.target_role_name وelection_vote_weights.role_name وما
-- تحفره ١٢ دالّة نصًّا. فالإشارة بالاسم اتّساقٌ مع القائم، وتُبقي الصفّ
-- مقروءًا بلا وصل، وتنجو من انزياح المعرّفات بين قاعدتين.
--
-- ═══ الرئاسة دورٌ لا شخص ═══
--
-- نشير إلى المنصب لا إلى شاغله. فمن يشغل رئاسة النادي اليوم قد يتغيّر غدًا،
-- ورئاسة المجلس الإداريّ تبقى لرئيس النادي أيًّا كان. والشاغل يُقرأ من
-- user_roles عبر هذا الدور.
--
-- إضافيّ صرف: عمود جديد لا يعرفه قارئ قائم.

alter table councils
  add column if not exists head_role_name text;

update councils set head_role_name = 'club_president'
 where id = 'administrative' and head_role_name is distinct from 'club_president';

update councils set head_role_name = 'executive_council_president'
 where id = 'executive' and head_role_name is distinct from 'executive_council_president';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'councils_head_role_name_fkey') then
    alter table councils
      add constraint councils_head_role_name_fkey
      foreign key (head_role_name) references roles (role_name);
  end if;

  -- كلّ مجلس له رئيس. تُفرض بعد الملء لا قبله.
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='councils'
               and column_name='head_role_name' and is_nullable='YES')
     and not exists (select 1 from councils where head_role_name is null) then
    alter table councils alter column head_role_name set not null;
  end if;
end $$;

comment on column councils.head_role_name is
  'الدور الذي يرأس المجلس (لا الشخص). المصدر الوحيد — الشاغل يُقرأ من user_roles عبر هذا الدور.';
