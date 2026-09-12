"use client";

import Link from "next/link";

/**
 * **بابا صفحة الباركود: إحصاءٌ وإعدادات.**
 *
 * كانا تبويبين بحالةٍ في الشاشة، فصارا **صفحتين** بأمر المالك ٢٠٢٦-٠٩-٠٥ وحجّتُه أقوى:
 * الصفحةُ عنوانٌ يُربَط به. فمنسدلُ القائمة يُرسل «الإحصاءات» إلى بابها و«تعديل الوجهة»
 * إلى بابه، وبريدُ التنبيه يفتح ما يعني، والرجوعُ بالسهم يعود إلى ما كنت فيه.
 *
 * والمبدّلُ يبقى شكلًا واحدًا (`tabs-segmented`) لكنّه **روابطُ لا أزرار**: هيئةُ التبويب
 * تقول «هذان وجهان لشيءٍ واحد»، والرابطُ يعطي ما لا يعطيه الزرّ.
 */
export function QrTabs({
  id,
  on,
  canSettings = true,
}: {
  id: string;
  on: "stats" | "settings";
  /** الشريكُ القارئُ لا إعداداتِ له، وبابٌ واحدٌ ليس مبدّلًا: يُطوى الشريطُ كلُّه. */
  canSettings?: boolean;
}) {
  if (!canSettings) return null;

  const item = (key: "stats" | "settings", label: string, href: string) => (
    <Link
      href={href}
      role="tab"
      aria-selected={on === key}
      aria-current={on === key ? "page" : undefined}
      className={"tab" + (on === key ? " on" : "")}
    >
      {label}
    </Link>
  );

  return (
    /* **ممتدٌّ على عرض صفّه** (المالك ٢٠٢٦-٠٩-٠٦): جُرّب بعرض حبره فبدا حبّةً في فراغ،
       وبسقفٍ ٣٢٠ فبقي ناقصًا. فيمتدّ ويقتسمه بابان بالسويّة، ويسمّي كلٌّ منهما ما يفتحه
       كاملًا («إحصائيّات الباركود» لا «الإحصاء») فلا يُسأل: إحصاءُ ماذا؟ */
    <div className="tabs tabs-segmented tabs-split" role="tablist" style={{ marginBottom: 18 }}>
      {item("stats", "إحصائيّات الباركود", `/dashboard/tools/qr/${id}`)}
      {item("settings", "إعدادات الباركود", `/dashboard/tools/qr/${id}/settings`)}
    </div>
  );
}
