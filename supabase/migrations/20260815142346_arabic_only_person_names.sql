-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815142346   الاسم: arabic_only_person_names

-- ══ الاسمُ عربيٌّ لا سواه (أمرُ المالك ٢٠٢٦-٠٨-١٥) ══════════════════════════════
-- كلُّ عمودٍ يحفظ اسم إنسان (عضوًا أو صاحبَ حسابٍ أو شاغلَ منصب) لا يقبل إلّا الحروف
-- العربيّة والتشكيل والمسافة. والحكمُ هنا آخرُ الأسوار: الشاشاتُ تردّ برسالةٍ عربيّة
-- (`lib/personName.arabicNameError`)، وهذا يردّ ما فاتها ولو نُودي الإجراءُ مباشرةً.

-- دالّةٌ واحدةٌ تحكم، فلا يفترق قيدٌ عن قيد. والتطويلُ مرفوضٌ عمدًا (زينةٌ لا حرف).
create or replace function public.is_arabic_name(p_name text)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select p_name ~ '^[ء-غف-يٱً-ٰٕ ]+$';
$$;

comment on function public.is_arabic_name(text) is
  'هل الاسم بالحروف العربيّة وحدها؟ توأمُ arabicNameError في lib/personName.';

alter table public.profiles
  add constraint profiles_full_name_arabic_check
  check (public.is_arabic_name(full_name));

alter table public.member_details
  add constraint member_details_full_name_triple_arabic_check
  check (full_name_triple is null or public.is_arabic_name(full_name_triple));

alter table public.experience_certificates
  add constraint experience_certificates_holder_name_arabic_check
  check (public.is_arabic_name(holder_name));

alter table public.participation_certificates
  add constraint participation_certificates_holder_name_arabic_check
  check (public.is_arabic_name(holder_name));

-- بابُ الزائر إلى صفّه: يردّ بشيفرةٍ يعرفها العميل (NAME_NOT_ARABIC) لا بخطأ قيدٍ خام،
-- ويُطبّع الاسمَ قبل حفظه كما تُطبّعه الشاشة (مسافةٌ واحدة، بلا تطويلٍ ولا محارف اتّجاه).
create or replace function public.create_my_account_profile(
  p_full_name text, p_phone text, p_gender text,
  p_city text default null::text, p_accepts_marketing boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user  uuid := auth.uid();
  v_email text;
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name  text := btrim(regexp_replace(
                    regexp_replace(coalesce(p_full_name, ''), '[ـ​-‏‪-‮⁦-⁩]', '', 'g'),
                    '\s+', ' ', 'g'));
begin
  if v_user is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.profiles where id = v_user) then raise exception 'PROFILE_EXISTS'; end if;
  if v_name = ''                        then raise exception 'NAME_REQUIRED';   end if;
  if not public.is_arabic_name(v_name)  then raise exception 'NAME_NOT_ARABIC'; end if;
  if p_gender not in ('male', 'female') then raise exception 'GENDER_REQUIRED'; end if;
  if v_phone !~ '^05[0-9]{8}$'          then raise exception 'PHONE_INVALID';   end if;

  select u.email into v_email from auth.users u where u.id = v_user;

  insert into public.profiles
    (id, full_name, email, phone, gender, city, accepts_marketing, account_status, joined_date)
  values
    (v_user, v_name, v_email, v_phone, p_gender,
     nullif(btrim(coalesce(p_city, '')), ''), coalesce(p_accepts_marketing, false),
     'active', null);
end;
$function$;
