-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260802124223   الاسم: assign_positions_key_derived_from_authority

-- مفتاحُ تبويب التعيينات يُشتقّ من جدول السلطة، فلا يصير مصدرًا ثانيًا.
--
-- كان قفل التبويب `manage_positions`، وهي قدرةٌ تعني شيئين معًا: رؤيةُ شاشة التعيينات،
-- وتحريرُ بيانات الوحدات (الوصف ورابط القروب). فلو مُنحت لقائد الموارد ليُسنِد، لَنال
-- معها تحريرَ الوحدات وهو ما لم يُطلَب. فصار للتبويب مفتاحُه: `assign_positions`.
--
-- ولا يُمنَح بيدٍ: تريغرٌ يزرعه ويقلعه تبعًا لـ`position_authority` — من له صفُّ سلطةٍ
-- له المفتاح، ومن سقط صفُّه سقط مفتاحُه. فالجدول يبقى المصدر الواحد، والقدرة أثرُه.
insert into public.permissions (permission_key, permission_name_ar, description, category)
values ('assign_positions', 'إسناد المناصب', 'فتحُ تبويب التعيينات. مدى الإسناد نفسه يقوله جدول position_authority.', 'admin')
on conflict (permission_key) do nothing;

create or replace function public.sync_assign_positions_key()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_perm integer;
begin
  select id into v_perm from permissions where permission_key = 'assign_positions';
  if v_perm is null then return null; end if;

  if tg_op in ('INSERT', 'UPDATE') then
    insert into role_permissions (role_name, permission_id)
    values (new.role_name, v_perm)
    on conflict do nothing;
  end if;

  if tg_op in ('DELETE', 'UPDATE') then
    delete from role_permissions rp
    where rp.permission_id = v_perm
      and rp.role_name = old.role_name
      and not exists (select 1 from position_authority pa where pa.role_name = old.role_name);
  end if;

  return null;
end;
$function$;

drop trigger if exists trg_sync_assign_positions_key on public.position_authority;
create trigger trg_sync_assign_positions_key
after insert or update or delete on public.position_authority
for each row execute function public.sync_assign_positions_key();

-- الزرع الأوّل لمن في الجدول الآن
insert into role_permissions (role_name, permission_id)
select pa.role_name, p.id
from position_authority pa, permissions p
where p.permission_key = 'assign_positions'
on conflict do nothing;
