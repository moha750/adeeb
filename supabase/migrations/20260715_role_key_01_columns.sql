-- الرقم ← الاسم: توحيد مفتاح المنصب — الخطوات ١ و٢ و٣.
-- (الخطّة الكاملة في ROLE-KEY-MIGRATION.md بجذر المستودع)
--
-- ═══ لماذا الاسم ═══
--
-- roles.role_name مفتاحٌ فريد ثابت (roles_role_name_key UNIQUE)، وأمرٌ صريح
-- لا يُغيَّر أبدًا، ومحروسٌ بثلاثة مفاتيح أجنبيّة حقيقيّة منذ 2026-07-15
-- (councils.head_role_name و committees.leader_role_name و member_role_name).
-- والرقم لا يُستعمل خارج هذين الجدولين، بينما الاسم في ٥ جداول و١٣ دالّة
-- وكامل منطق V2. والأرقام تنزاح صامتة بين قاعدتين:
--     insert into user_roles values (uid, 3)  -- «قائدة الضمان» بالصدفة وحدها
--
-- ═══ الطريقة: أضِف ولا تحذف ═══
--
-- V1 يقرأ user_roles في ٨٢ موضعًا ولن نهاجر قارئيه — فهو زائل. فالعمودان
-- يتعايشان: V1 يكتب الرقم، وV2 يكتب الاسم، والتريغر يزامنهما في كلّ
-- INSERT/UPDATE. ولا يشعر أيّ قارئ قائم بشيء.
--
-- **التريغر ليس اختياريًّا**: بدونه ينحرف العمودان صامتَين وV1 يكتب الرقم.
--
-- حين يموت V1: يُسقَط role_id مجّانًا — لأنّ قارئه الوحيد مات.
--
-- ═══ القيود الجديدة بجانب القديمة لا بدلها ═══
--
-- role_name مشتقٌّ من role_id اشتقاقًا تقابليًّا (١:١)، فـ
-- UNIQUE(user_id, role_name, committee_id) مكافئٌ تمامًا للقيد القائم
-- UNIQUE(user_id, role_id, committee_id) — لا صفَّ قائمًا يخالفه.

-- ═══════════════════════════════════════════════════════════
-- (١) العمودان
-- ═══════════════════════════════════════════════════════════

alter table user_roles
  add column if not exists role_name text;

alter table role_permissions
  add column if not exists role_name text;

-- ═══════════════════════════════════════════════════════════
-- (٢) الملء من الرقم
-- ═══════════════════════════════════════════════════════════

update user_roles ur
   set role_name = r.role_name
  from roles r
 where r.id = ur.role_id
   and ur.role_name is distinct from r.role_name;

update role_permissions rp
   set role_name = r.role_name
  from roles r
 where r.id = rp.role_id
   and rp.role_name is distinct from r.role_name;

-- ═══════════════════════════════════════════════════════════
-- (٣) التريغر — الثمن الحقيقيّ الوحيد
-- ═══════════════════════════════════════════════════════════
--
-- دالّة واحدة تخدم الجدولين: كلاهما يحمل role_id و role_name بالاسمين
-- نفسيهما، فلا داعي لنسختين تنحرفان.
--
-- القاعدة: الاسم يفوز إن جاء أو تغيّر، وإلّا اشتُقّ من الرقم.
-- والتعارض الصريح (رقمٌ واسمٌ لا يتوافقان) يُرفض صائحًا — لا يُرجَّح أحدهما
-- صامتًا، فالصمت هو ما نعالجه.
--
-- BEFORE: يملأ العمود قبل فحص NOT NULL والمفتاح الأجنبيّ — فيكتب V1 الرقم
-- وحده بلا أن يشعر.

create or replace function public.sync_role_key()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id   integer;
  v_name text;
begin
  if tg_op = 'INSERT' then
    if new.role_name is not null then
      select id into v_id from roles where role_name = new.role_name;
      if v_id is null then
        raise exception 'لا دور باسم %', new.role_name using errcode = '23503';
      end if;
      if new.role_id is not null and new.role_id <> v_id then
        raise exception 'تعارض المفتاحين: role_id=% لا يوافق role_name=%', new.role_id, new.role_name
          using errcode = '23514';
      end if;
      new.role_id := v_id;

    elsif new.role_id is not null then
      select role_name into v_name from roles where id = new.role_id;
      if v_name is null then
        raise exception 'لا دور برقم %', new.role_id using errcode = '23503';
      end if;
      new.role_name := v_name;

    else
      raise exception 'يلزم أحد المفتاحين: role_id أو role_name' using errcode = '23502';
    end if;

  else -- UPDATE
    if new.role_name is distinct from old.role_name then
      select id into v_id from roles where role_name = new.role_name;
      if v_id is null then
        raise exception 'لا دور باسم %', coalesce(new.role_name, '(فارغ)') using errcode = '23503';
      end if;
      new.role_id := v_id;

    elsif new.role_id is distinct from old.role_id then
      select role_name into v_name from roles where id = new.role_id;
      if v_name is null then
        raise exception 'لا دور برقم %', new.role_id using errcode = '23503';
      end if;
      new.role_name := v_name;
    end if;
  end if;

  return new;
end;
$function$;

comment on function public.sync_role_key is
  'يزامن role_id و role_name في user_roles و role_permissions. الاسم يفوز إن جاء أو تغيّر، وإلّا اشتُقّ من الرقم. التعارض الصريح يُرفض.';

drop trigger if exists user_roles_sync_role_key on user_roles;
create trigger user_roles_sync_role_key
  before insert or update on user_roles
  for each row execute function public.sync_role_key();

drop trigger if exists role_permissions_sync_role_key on role_permissions;
create trigger role_permissions_sync_role_key
  before insert or update on role_permissions
  for each row execute function public.sync_role_key();

-- ═══════════════════════════════════════════════════════════
-- (٤) الحراسة — بعد الملء لا قبله
-- ═══════════════════════════════════════════════════════════

do $$
declare v_gap integer;
begin
  select count(*) into v_gap from user_roles where role_name is null;
  if v_gap > 0 then
    raise exception 'user_roles: % صفًّا بلا role_name بعد الملء', v_gap;
  end if;

  select count(*) into v_gap from role_permissions where role_name is null;
  if v_gap > 0 then
    raise exception 'role_permissions: % صفًّا بلا role_name بعد الملء', v_gap;
  end if;
end $$;

alter table user_roles       alter column role_name set not null;
alter table role_permissions alter column role_name set not null;

do $$
begin
  -- المفتاحان على الجدول الواحد يتّفقان في ON DELETE.
  --
  -- user_roles_role_id_fkey مُعلَنٌ ON DELETE CASCADE، فلو تُرك مفتاح الاسم
  -- على NO ACTION لتناقض المفتاحان: أحدهما يُسقِط الصفوف والآخر يمنع الحذف.
  -- ومن يفوز يحسمه ترتيب أسماء تريغرات RI (RI_ConstraintTrigger_a_<oid>)
  -- مقارنةً نصّيّة — أي أنّ طول الـoid يقرّر السلوك لا النيّة. فتحذف القاعدةُ
  -- المُعاد بناؤها محلّيًّا بنجاح، وتصرخ قاعدةُ الإنتاج بخطأ — من الترحيل نفسه.
  --
  -- فالاتّفاق يجعل الترتيب بلا أثر: الدلالة واحدة أيًّا كان من يسبق.
  if not exists (select 1 from pg_constraint where conname = 'user_roles_role_name_fkey') then
    alter table user_roles
      add constraint user_roles_role_name_fkey
      foreign key (role_name) references roles (role_name) on delete cascade;
  end if;

  -- role_permissions.role_id يُسقَط بـ CASCADE عند حذف الدور — والاسم يتبعه
  if not exists (select 1 from pg_constraint where conname = 'role_permissions_role_name_fkey') then
    alter table role_permissions
      add constraint role_permissions_role_name_fkey
      foreign key (role_name) references roles (role_name) on delete cascade;
  end if;

  -- القيود الجديدة بجانب القديمة: مكافئة لها تمامًا (الاشتقاق تقابليّ)
  if not exists (select 1 from pg_constraint where conname = 'user_roles_user_role_name_committee_key') then
    alter table user_roles
      add constraint user_roles_user_role_name_committee_key
      unique (user_id, role_name, committee_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'role_permissions_role_name_permission_key') then
    alter table role_permissions
      add constraint role_permissions_role_name_permission_key
      unique (role_name, permission_id);
  end if;
end $$;

comment on column user_roles.role_name is
  'مفتاح المنصب. المصدر لV2. role_id إرثٌ لV1 يزامنه تريغر sync_role_key — يُسقَط حين يموت V1.';

comment on column role_permissions.role_name is
  'مفتاح المنصب. المصدر لV2. role_id إرثٌ لV1 يزامنه تريغر sync_role_key — يُسقَط حين يموت V1.';
