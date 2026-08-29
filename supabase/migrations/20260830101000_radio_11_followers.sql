-- ══════════════════════════════════════════════════════════════════════════════
-- إذاعة أدِيب م١١: متابعةُ البرنامج
--
-- ⚠️ مكتوبٌ ينتظر إذنَ المالك. لا يُنفَّذ إلّا بكلمته.
--
-- ## لماذا جدولٌ أصلًا والإذاعةُ كلُّها بلا حساب
-- جداولُ الإذاعة اليومَ لا يعرف واحدٌ منها مستخدِمًا: الموضعُ وبصمةُ الجهاز
-- و«اسمع لاحقًا» كلُّها في `localStorage`، وذلك صوابٌ ما دام المطلوبُ حالًا
-- تُقرأ. لكنّ «تابِع» ليست حالًا: هي **وعدٌ بأن نعود إليك** حين تنزل حلقة.
-- والوعدُ يحتاج مُوعَدًا، وذاكرةُ المتصفّح لا تصلح عنوانًا: تُمسَح بمسحة، ولا
-- تعبر من الجوّال إلى الحاسوب، ولا يُرسَل إليها شيء.
--
-- وقرارُ المالك (٢٠٢٦-٠٨-٢٨): **الحسابُ يُضاف ولا يُشترَط.** فالسماعُ
-- والتصفّحُ والبحثُ تبقى للمجهول كما هي، ولا يُطلَب الدخولُ إلّا في لحظة
-- الضغط على «تابِع» وحدَها.
--
-- ## ولماذا يتبع `auth.users` لا `profiles`
-- قانونُ المستودع: ما هو **أرشيفٌ** يتبع `profiles` فيبقى بعد ذهاب الدخول،
-- وما هو **اشتراكٌ حيّ** يتبع `auth.users` فيذهب بذهابه. والمتابعةُ اشتراكٌ:
-- لا معنى لها إلّا ما دام هناك من يُبلَّغ. وهو حكمُ `qr_links.owner_id` نفسُه.
--
-- ## والعدّادُ يُحسَب لا يُزاد
-- كانت مسوّدةٌ أولى ترفع العدّادَ بـ`+1` وتخفضه بـ`-1`. وجُرّبت فوُجد أنّ
-- نداءً بلا صفٍّ واحدٍ يرفعه (‏٠ ← ٣). فالمُشغِّلُ يُعيد **الحسبةَ كاملةً** من
-- الجدول: أبطأُ بلا أثرٍ عند هذه الأحجام، وصادقٌ دائمًا.
-- ══════════════════════════════════════════════════════════════════════════════

begin;

/* ══ الجدول ═══════════════════════════════════════════════════════════════════
   المفتاحُ الأوّليُّ المركّبُ هو قيدُ التفرّد نفسُه: صفٌّ واحدٌ لكلّ (شخص،
   برنامج)، فالنقرةُ المزدوجةُ والطلبُ المعادُ يُردّان ولا يُنشئان ثانيًا.

   وترتيبُ العمودين مقصود: السؤالان الحارّان يبدآن بالشخص («ما أتابع؟» و«أأتابع
   هذا؟»)، فيكفيهما فهرسُ المفتاح. ويُزاد فهرسٌ على `show_id` وحدَه لأنّ
   المُشغِّلَ يعدّ به. */
create table if not exists public.radio_show_followers (
  user_id    uuid not null references auth.users(id)         on delete cascade,
  show_id    uuid not null references public.radio_shows(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, show_id)
);

create index if not exists radio_show_followers_show_idx
  on public.radio_show_followers (show_id);

comment on table public.radio_show_followers is
  'من يتابع أيَّ برنامج. اشتراكٌ حيٌّ يتبع auth.users فيذهب بذهاب الدخول، لا أرشيفٌ يتبع profiles.';

/* ══ عدّادُ المتابعين على البرنامج ════════════════════════════════════════════
   يُحفَظ على `radio_shows` كي تقرأه الكشوفُ بلا انضمامٍ ولا عدٍّ في كلّ فتحة. */
alter table public.radio_shows
  add column if not exists followers_count integer not null default 0;

comment on column public.radio_shows.followers_count is
  'عددُ المتابعين، يحفظه مُشغِّلٌ بحسبةٍ كاملة. لا يُكتَب بيدٍ ولا يُزاد بواحد.';

create or replace function public.radio_recount_followers()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_show uuid := coalesce(new.show_id, old.show_id);
begin
  update public.radio_shows s
     set followers_count = (
           select count(*) from public.radio_show_followers f where f.show_id = v_show
         )
   where s.id = v_show;
  return null;
end;
$$;

comment on function public.radio_recount_followers() is
  'يُعيد حسبةَ المتابعين كاملةً بعد كلّ تبدّل. حسبةٌ لا زيادةٌ بواحد: المسوّدةُ الأولى كانت تُزاد فارتفع العدّادُ بنداءٍ بلا صفّ.';

drop trigger if exists radio_show_followers_recount on public.radio_show_followers;
create trigger radio_show_followers_recount
  after insert or delete on public.radio_show_followers
  for each row execute function public.radio_recount_followers();

/* ══ الحراسة ══════════════════════════════════════════════════════════════════
   الصفوفُ تُقرأ وتُكتب وتُحذَف من متصفّح صاحبها بسياسات own-row، لا بمفتاح
   الخدمة: المدى في القاعدة لا في الشاشة.

   **والمنحُ بالعمود لا بالجدول** (وهو ما سقط في المسوّدة الأولى): لو مُنح
   الإدراجُ على الجدول كلِّه لكتب المتصفّحُ `created_at` بيده، فيزعم متابعةً
   قديمةً ليُبلَّغ بحلقاتٍ سبقتها. فيُمنَح العمودان اللذان له وحدَهما. */
alter table public.radio_show_followers enable row level security;

drop policy if exists radio_show_followers_own_read on public.radio_show_followers;
create policy radio_show_followers_own_read
  on public.radio_show_followers for select
  using ((select auth.uid()) = user_id);

drop policy if exists radio_show_followers_own_insert on public.radio_show_followers;
create policy radio_show_followers_own_insert
  on public.radio_show_followers for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists radio_show_followers_own_delete on public.radio_show_followers;
create policy radio_show_followers_own_delete
  on public.radio_show_followers for delete
  using ((select auth.uid()) = user_id);

/* ولا تحديث: المتابعةُ حالٌ ثنائيّة، تُنشَأ أو تُحذَف. وبابٌ ثالثٌ بلا حاجةٍ
   بابٌ يُنسى حراستُه. */

revoke all on public.radio_show_followers from anon, authenticated;
grant select                        on public.radio_show_followers to authenticated;
grant insert (user_id, show_id)     on public.radio_show_followers to authenticated;
grant delete                        on public.radio_show_followers to authenticated;

commit;
