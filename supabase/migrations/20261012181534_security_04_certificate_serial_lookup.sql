-- أمنٌ ٠٤ (٢٠٢٦-١٠-١٢): رقمُ حضور الفعالية لا يكشف صاحبه
--
-- `get_certificate_data(p_serial)` كانت تُستدعى بلا حساب، فتُعيد اسمَ الحاضر وجنسَه وفعاليتَه
-- لأيّ رقم، والأرقامُ متسلسلة (`ADEEB-YYYY-NNNN`)، فتُستخرج أسماءُ الحاضرين كلّهم بعدّها.
-- ولا يستدعيها كودُ الموقع. ونظامُ الشهادات (المادة ١٣): «لا تُعطى بيانات صاحب الحجز لمن
-- يطلبها برقمه». بكلمة المالك ٢٠٢٦-١٠-١٢.
--
-- ومعها `generate_certificate_serial`: لا يناديها إلّا `mark_attendance` (SECURITY DEFINER)،
-- واستدعاؤها من العميل يستهلك أرقامًا من التسلسل فيُحدث فيه فجوات.

revoke execute on function public.get_certificate_data(text) from public, anon, authenticated;
revoke execute on function public.generate_certificate_serial(date) from public, anon, authenticated;
