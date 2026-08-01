import { LogoLoader } from "@adeeb/design-system";

/**
 * تحميلُ التنقّل بين تبويبات اللوحة — حدٌّ أقرب من حدّ الجذر عمدًا: التخطيط
 * (الشريط الجانبيّ والرأس) يبقى ثابتًا ويتبدّل **المتنُ وحده**، فلا تومض اللوحة
 * كلُّها عند كلّ تبويب.
 *
 * والشعارُ أفقيٌّ هنا: المتنُ عريضٌ قصير، فالرأسيّ يمدّه ويقفز به.
 */
export default function DashboardLoading() {
  return <LogoLoader orientation="horizontal" minHeight="52vh" />;
}
