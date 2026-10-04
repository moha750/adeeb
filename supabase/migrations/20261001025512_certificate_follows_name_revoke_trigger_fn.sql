-- دالّةُ المحفّز لا تُنادى إلّا محفّزًا: يُنزع تنفيذُها عن الأدوار العامّة فلا يُعلَن لها بابٌ في `/rpc`
-- (تنبيهُ مستشار الأمن بعد 20261001025341_certificate_follows_name).
revoke all on function public.log_profile_name_change() from public, anon, authenticated;
