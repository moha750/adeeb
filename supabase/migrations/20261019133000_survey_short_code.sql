-- ═══════════════════════════════════════════════════════════════════════════
-- **رمزُ الاستبيان القصير** (قرار المالك ٢٠٢٦-١٠-١٩): رابطُ الاستبيان العلنيّ صار
-- `adeeb.club/s/<code>` بدل `adeeb.club/surveys/<id>`.
--
-- لِمَ: الرقمُ المتسلسل (٧٦، ٧٧…) يُجرَّب بالعدّ فيُوصِل إلى كلّ استبيانٍ عامّ ولو لم يُنشر
-- رابطُه إلّا لفئة، ويكشف عددَ استبيانات النادي. والرمزُ ستّةُ أحرفٍ عشوائيّة من ٣١ حرفًا
-- (≈ ٨٨٧ مليون احتمال) فلا يُخمَّن. والرقمُ باقٍ مفتاحًا داخليًّا لكلّ الجداول والدوالّ:
-- الرمزُ وجهُ الرابط وحدَه، والروابطُ القديمة تُحوَّل إليه من التطبيق (`app/surveys/[id]/route.ts`).
--
-- الأبجديّة صغيرةٌ بلا ما يلتبس عند القراءة أو الإملاء: لا `0/o` ولا `1/l/i`.
-- والرمزُ يولَد مع الاستبيان ولا يتغيّر بعدها: رابطٌ نُشر في قروبٍ أو حُفر في باركود
-- يجب أن يبقى صحيحًا ما بقي الاستبيان.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.surveys add column if not exists code text;

-- مولّدُ الرمز: بايتاتٌ مشفّرةُ العشوائيّة (لا `random()`)، ويُرفض البايتُ ≥ ٢٤٨ كي لا تميل
-- القسمةُ على ٣١ إلى أوائل الأبجديّة. ويُعاد السحبُ عند التصادم (نادرٌ جدًّا).
-- مغلقٌ بالولادة (قواعد ٢٠٢٦-١٠-١٠): لا يناديه إلّا الزنادُ أدناه، فلا منحَ لأحد.
create or replace function public.survey_code_new()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789';
  c text;
  b int;
begin
  loop
    c := '';
    while length(c) < 6 loop
      b := get_byte(extensions.gen_random_bytes(1), 0);
      if b < 248 then
        c := c || substr(alphabet, 1 + (b % 31), 1);
      end if;
    end loop;
    exit when not exists (select 1 from public.surveys where code = c);
  end loop;
  return c;
end;
$$;
revoke all on function public.survey_code_new() from public, anon, authenticated;

-- تعبئةُ القائم قبل القيد
update public.surveys set code = public.survey_code_new() where code is null;

alter table public.surveys
  alter column code set not null,
  add constraint surveys_code_shape check (code ~ '^[a-hjkmnp-z2-9]{6}$');
create unique index if not exists surveys_code_key on public.surveys (code);

-- الزناد: الرمزُ يولده النظامُ عند الإنشاء (لا يُقبل من المُدرِج)، ولا يتبدّل بعدها.
-- SECURITY DEFINER لأنّ المولّد مغلق: أيًّا كان المُدرِج فالتوليدُ بصلاحية المالك.
create or replace function public.surveys_code_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.code := public.survey_code_new();
  elsif new.code is distinct from old.code then
    raise exception 'رمز الاستبيان ثابت لا يتغيّر';
  end if;
  return new;
end;
$$;
revoke all on function public.surveys_code_guard() from public, anon, authenticated;

drop trigger if exists surveys_code_guard on public.surveys;
create trigger surveys_code_guard
  before insert or update of code on public.surveys
  for each row execute function public.surveys_code_guard();
