-- «صمّم تاجك» — قاعةُ التيجان المشتركة لركن التيجان في فعاليات اليوم العالمي للطفل (٢٠٢٦-١١-١٨)
-- صفٌّ لكلّ تاجٍ تُوِّج: اسمُ صاحبه (اختياريّ) وصورتُه (JPEG صغيرة ~٢٥ كيلوبايت) ورقمُه في القاعة.
-- الأجهزةُ في الركن ثلاثةٌ أو أربعة، فالقاعةُ واحدةٌ هنا لا في متصفّح كلّ جهاز، والترقيمُ واحد.
-- الصفحةُ تكتب وتقرأ عبر الدالّتين وحدهما (مفتاحُ النشر العامّ كأختها «بنك أدِيب»)، ولا تلمس الجدول.
-- المعرّفُ يولَّد في الجهاز، فإعادةُ الإرسال بعد انقطاع الشبكة لا تُكرِّر التاج.
-- والقراءةُ عامّةٌ عن قصد: القاعةُ تُعرض في الركن، وبوستُها يُنشر بأسماء الأطفال بقرار المالك.

begin;

create table if not exists public.taji_crowns (
  seq          bigint generated always as identity unique,
  id           uuid primary key,
  made_at      timestamptz not null,
  received_at  timestamptz not null default now(),
  name         text not null default '' check (char_length(name) <= 24),
  image        text not null check (image like 'data:image/jpeg;base64,%' and char_length(image) <= 200000)
);
alter table public.taji_crowns enable row level security;
revoke all on table public.taji_crowns from public, anon, authenticated;

-- يعلّق التاجَ في القاعة ويعيد رقمَه. سقفٌ عامٌّ للدقيقة يصدّ إغراقَ الجدول من خارج الركن.
create or replace function public.taji_log_crown(p jsonb)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare v bigint;
begin
  select seq into v from taji_crowns where id = (p->>'id')::uuid;
  if v is not null then return v; end if;
  if (select count(*) from taji_crowns where received_at > now() - interval '1 minute') >= 60 then
    raise exception 'taji_busy';
  end if;
  insert into taji_crowns (id, made_at, name, image)
  values (
    (p->>'id')::uuid,
    least(coalesce((p->>'madeAt')::timestamptz, now()), now()),
    left(btrim(coalesce(p->>'name', '')), 24),
    p->>'image'
  )
  on conflict (id) do nothing
  returning seq into v;
  if v is null then select seq into v from taji_crowns where id = (p->>'id')::uuid; end if;
  return v;
end;
$$;
revoke all on function public.taji_log_crown(jsonb) from public;
grant execute on function public.taji_log_crown(jsonb) to anon, authenticated;

-- يقرأ القاعةَ بعد رقمٍ معلوم، فيجلب كلُّ جهازٍ الجديدَ وحده ولا يعيد تنزيلَ ما عنده.
create or replace function public.taji_hall(p_after bigint default 0)
returns table (seq bigint, id uuid, name text, image text, made_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select c.seq, c.id, c.name, c.image, c.made_at
  from taji_crowns c
  where c.seq > coalesce(p_after, 0)
  order by c.seq
  limit 300;
$$;
revoke all on function public.taji_hall(bigint) from public;
grant execute on function public.taji_hall(bigint) to anon, authenticated;

commit;
