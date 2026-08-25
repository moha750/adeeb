-- خمّن الكلمة — نزعُ منح PUBLIC عن دوالّها (م٠د)
-- طُبِّق ٢٠٢٦-٠٨-٢٥ بإذن المالك، عقب م٠ج.
--
-- ## كيف انكشف
-- بعد تطبيق م٠أ/م٠ب فُحصت الامتيازاتُ بجدول `pg_roles`، فبدت سليمة. ثمّ نبّه
-- `get_advisors` إلى أنّ **`gw_list_admin_sessions` يبلغها `anon`** عبر
-- `/rest/v1/rpc/…`. والفحصُ الأوّل لم يكشفها لأنّ منح **PUBLIC** يظهر في `proacl`
-- بصيغة `=X/postgres` بلا اسم دور، فيسقط من أيّ استعلامٍ يضمّ `pg_roles`.
--
-- **الدرس: لا تفحص المنحَ بضمِّ `pg_roles` وحدَه.** إمّا أن تقرأ `proacl` خامًّا،
-- وإمّا أن تسأل `get_advisors` بعد كلّ DDL. (وهذا ثاني درسٍ في يومٍ واحد بعد
-- «`grant … to authenticated` لا ينفي `anon`» في م٠ج.)
--
-- ## ولا تسرُّبَ وقع
-- الدالّةُ تفحص `gw_is_admin(auth.uid())` في أوّل سطرٍ وترفع `GW_FORBIDDEN`، فنداءُ
-- المجهول يُردّ. لكنّ بابًا يُطرَق ثمّ يُردّ خيرٌ منه بابٌ لا يُطرَق أصلًا: المنحُ
-- صريحٌ لا مفهوم، وسطرُ الحراسة داخل الدالّة قد يُنسى في تعديلٍ قادم.
--
-- ## والنزعُ يعمّ لا يخصّ
-- يُنزَع PUBLIC عن **كلّ** دوالّ `gw_*` لا عن المذكورة وحدها: ما وقع في واحدةٍ يقع
-- في أختها، والعبارةُ لا تضرّ من لا منحَ له.
--
-- ملحوظة: `gw_list_admin_sessions` لا يستعملها V2 أصلًا (قائمةُ الغرف تُقرأ بعميل
-- الجلسة من الجدول مباشرةً). وهي مرشَّحةٌ للإعدام في كنسةٍ قادمة، ولا تُعدَم هنا:
-- الحذفُ إذنٌ يُطلَب باسمه.

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'gw\_%'
  loop
    execute format('revoke all on function %s from public', r.sig);
  end loop;
end;
$$;
