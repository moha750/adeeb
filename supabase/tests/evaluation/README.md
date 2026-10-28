# اختبارُ قاعدة تقييم القيادات

دورةُ تقييمٍ كاملة على Postgres محلّيّ، بلا لمسٍ للقاعدة الحيّة.

- `00_platform.sql`: ما يحاكي Supabase (الأدوار، و`auth.uid()` من `test.uid`، ودُمى `cron` و`vault` و`net`).
- `01_tables.sql` و`02_functions.sql`: الجداولُ والدوالُّ التي يمسّها التقييم، منقولةٌ من الحيّة يوم ٢٠٢٦-١٠-٢٠
  (`revoke_position` وأخواتُها طابقت المستودعَ بصمةً ببصمة).
- `10_fixture.sql`: هيكلٌ يشبه أدِيب بأشخاصٍ وهميّين.
- `scenario.sh`: فتحٌ وأوراقٌ وإغلاقٌ وحكمٌ بدالّة الكود (`lib/evaluation/score.ts`) واستبعادٌ وتصحيحٌ ومهلةُ الانتخاب.
- `revoke_diff.sh`: `revoke_position` قبل استخراج منطق العودة وبعده، النتائجُ والصفوفُ والإشعاراتُ حرفًا بحرف.

يحتاج Postgres على `localhost` بكلمة مرور `pg` للمستخدم `postgres`، وNode 22 (`--experimental-strip-types`).
