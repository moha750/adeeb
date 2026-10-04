import Link from "next/link";

/**
 * **بابا اللوحة الإعلانية: شريطُ الإعلانات والأخبارُ المعروضة** (طلبُ المالك ٢٠٢٦-١٠-٠٣،
 * بصورةٍ من مبدّل غرفة الباركود: «يكون شريط الإعلانات والأخبار المعروضة»).
 *
 * كانا قسمين مكدَّسين في صفحةٍ واحدة، فكان قسمُ الأخبار يُدفَع تحت قائمةِ الشريط كلِّها،
 * ومبدّلُ العرض (جدول/كروت) يقف بينهما وهو للشريط وحده. والقسمان لا يُحرَّران معًا
 * أبدًا: لكلٍّ زرُّه ومحتواه.
 *
 * **وصفحتان لا حالةٌ في شاشة** على عُرف `QrRoomTabs` وحجّتِه: الصفحةُ عنوانٌ يُربَط به،
 * والرجوعُ بالسهم يعود إلى ما كان فيه. **وكلاهما تحت الجذر** (`ticker/` و`news/`) كي
 * تتماثل فتاتُهما، والجذرُ يحوّل إلى الشريط فلا ينكسر رابطٌ محفوظ.
 */
export function AnnouncementsTabs({ on }: { on: "ticker" | "news" }) {
  const item = (key: "ticker" | "news", label: string, href: string) => (
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
    <div className="tabs tabs-segmented tabs-split" role="tablist" style={{ marginBottom: 18 }}>
      {item("ticker", "شريط الإعلانات", "/dashboard/website/announcements/ticker")}
      {item("news", "الأخبار المعروضة", "/dashboard/website/announcements/news")}
    </div>
  );
}
