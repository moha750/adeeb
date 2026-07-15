-- الرقم ← الاسم: سحب EXECUTE عن دالّة التريغر.
--
-- sync_role_key() دالّة تريغر (returns trigger)، لكنّ بوستغريس يمنح EXECUTE
-- إلى public افتراضيًّا — فتظهر في PostgREST على /rest/v1/rpc/sync_role_key
-- ويحذّر منها مدقّق Supabase (anon/authenticated_security_definer_function_executable).
--
-- ليست ثغرة: نداؤها مباشرةً يُردّ بـ«trigger functions can only be called
-- as triggers» (0A000). لكنّ سطحًا معروضًا بلا داعٍ يُسحب، اتّساقًا مع
-- assign_position التي تُسحب وتُمنح لـservice_role وحده.
--
-- والسحب لا يمسّ عمل التريغر: بوستغريس يفحص EXECUTE عند CREATE TRIGGER
-- لا عند الإطلاق. فالتريغر يظلّ يعمل لكلّ كاتب في الجدولين.

revoke all on function public.sync_role_key() from public, anon, authenticated;
