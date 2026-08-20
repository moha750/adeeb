-- الدالّةُ التي تعمل بصلاحيّة صاحبها لا يُترَك لها طريقٌ يختاره غيرُها.
--
-- القصّة: إحدى عشرة دالّةً في `public` مكتوبةً `SECURITY DEFINER` (أي تعمل بصلاحيّة
-- مالكها `postgres`) وليس في `proconfig` منها `search_path` مثبَّت. فالطريقُ الذي تُحلّ به
-- الأسماءُ غيرُ المؤهَّلة يأتي **من المُنادي**، لا من الدالّة. ومن ملك أن يُنشئ جدولًا أو
-- دالّةً في مخطَّطٍ يسبق `public` في طريقه ملك أن يجعل `user_roles` في متن الدالّة تُشير إلى
-- جدولِه هو، فتُجيب الدالّةُ بما كتبه — وهي تعمل بصلاحيّة `postgres`.
--
-- وفي الإحدى عشرة **قلبُ التصريح نفسُه**: `get_user_permissions` و`get_user_all_permissions`
-- منهما تُبنى `CurrentAdmin.caps` في `lib/auth.ts`، فهما اللتان تقولان للوحة مَن يفتح أيَّ
-- غرفة. ومعهما اثنتان تمسّان أوراقَ الدخول: `update_member_email` و`update_member_password`.
--
-- والعلاج تثبيتُ الطريق في الدالّة نفسها، فلا تسأل مُناديها عن شيء.
--
-- **كيف قِيست القائمة** (لا نُقلت): الاستعلامُ الذي أخرجها، ويُعاد به التحقّق بعد التطبيق
-- (يجب أن يعود صفرَ صفوف):
--
--   select p.oid::regprocedure::text
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.prosecdef
--     and (p.proconfig is null
--          or not exists (select 1 from unnest(p.proconfig) c where c like 'search\_path=%'));
--
-- **القيمة تُختار من المتن لا بالقياس**: قُرئ `prosrc` لكلٍّ منها. ما نادى `auth.*` ناداه
-- **مؤهَّلًا بمخطَّطه** (`auth.uid()`، `auth.users`) فلا يلزمه `auth` في الطريق؛ وما نادى دالّةً
-- من إضافةٍ **بلا تأهيل** لزمه مخطَّطُها. و`pg_temp` تُذيَّل بها القائمةُ دائمًا: لو لم تُذكر
-- لسبقت الطريقَ كلَّه، فأمكن لجدولٍ مؤقّتٍ أن يُظلّل جدولًا حقيقيًّا — وذِكرُها أخيرًا يُنزلها
-- إلى آخر الطريق.
--
-- **الترحيلُ إضافيٌّ وقابلٌ للرجوع**: لا يمسّ متنَ دالّةٍ ولا صفًّا ولا صلاحيّةَ تنفيذ؛ يضيف
-- شرطَ `SET` وحده. والرجوعُ عن أيّها `alter function … reset search_path;`.

-- ــــــ ثمانٍ لا تخرج عن `public` ــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــ
-- متونُها كلُّها جداولُ `public` ودوالُّ لغةٍ مبنيّة (`sum`/`coalesce`/`now`/`greatest`)،
-- وما فيها من `auth` مؤهَّلٌ باسم مخطَّطه. فـ`public` وحدها تكفي.

-- activities + activity_reservations
alter function public.get_activity_seat_status(uuid)
  set search_path = public, pg_temp;

-- file_downloads
alter function public.get_download_stats(text)
  set search_path = public, pg_temp;

-- activities + activity_reservations
alter function public.get_ended_activities_with_seats(integer)
  set search_path = public, pg_temp;

-- activities + activity_reservations
alter function public.get_published_activities_with_seats()
  set search_path = public, pg_temp;

-- user_roles + role_permissions + permissions + user_specific_permissions
-- (قلبُ التصريح: منها تُبنى قدراتُ صاحب الجلسة)
alter function public.get_user_all_permissions(uuid)
  set search_path = public, pg_temp;

-- user_roles + role_permissions + permissions + user_specific_permissions
-- (قلبُ التصريح: هي التي تنادَى في `lib/auth.ts`)
alter function public.get_user_permissions(uuid)
  set search_path = public, pg_temp;

-- user_roles، و`auth.uid()` مؤهَّلةٌ في المتن
alter function public.is_committee_member(integer)
  set search_path = public, pg_temp;

-- file_downloads (إدراج)
alter function public.log_file_download(text, text, text, text)
  set search_path = public, pg_temp;

-- news_activity_log، و`auth.uid()` مؤهَّلةٌ في المتن
alter function public.log_news_activity(uuid, text, jsonb)
  set search_path = public, pg_temp;

-- ــــــ واحدةٌ تكتب في `auth.users` وهي تؤهّلها ــــــــــــــــــــــــــــــــــــــــــــ
-- تقرأ `auth.users` وتكتب فيها، وتكتب في `profiles`، وتنادي `check_user_permission`.
-- وكلُّ ما مسّ `auth` مكتوبٌ **مؤهَّلًا** (`auth.users`)، والتأهيلُ لا يُحلّ بالطريق — فلا
-- يُزاد `auth` إلى الطريق بلا حاجة، وزيادتُه توسيعُ سطحٍ بلا مقابل.
alter function public.update_member_email(uuid, text)
  set search_path = public, pg_temp;

-- ــــــ واحدةٌ **تلزمها `extensions`** ــــــــــــــــــــــــــــــــــــــــــــــــــــــ
-- **انتبه: هذه وحدَها تكسر إن قُصر طريقُها على `public`.** متنُها ينادي `crypt(…)` و
-- `gen_salt('bf')` **بلا تأهيل**، وهما من `pgcrypto` المركَّبة في مخطَّط `extensions`
-- (قِيس: `select extname, nspname from pg_extension …` ⇐ pgcrypto ⇒ extensions).
-- فهي تعمل اليومَ لأنّ طريقَ الدور المُنادي فيه `extensions`؛ ولو ثُبّت طريقُها على `public`
-- وحدها لصارت كلُّ محاولةِ تغييرِ كلمةِ مرورٍ خطأَ «دالّة غير موجودة» وقتَ التنفيذ لا وقتَ
-- الترحيل. والسابقةُ قائمةٌ في القاعدة: `issue_certificate` و`issue_participation_certificate`
-- مثبَّتتان على `public, extensions, pg_temp` لأنّهما تناديان `gen_random_bytes`.
alter function public.update_member_password(uuid, text)
  set search_path = public, extensions, pg_temp;
