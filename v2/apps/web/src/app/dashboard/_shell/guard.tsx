import { getCurrentAdmin } from "@/lib/auth";
import { SECTION_CAP, type Section } from "@/lib/capabilities";
import { AdRoomDenied } from "@/app/_ad/states";
import { navLabelForHref } from "./nav";

/**
 * حارس الغرفة — أوّل سطرٍ في كلّ صفحة:
 *
 * ```tsx
 * const denied = await denyUnless("/dashboard/surveys");
 * if (denied) return denied;
 * ```
 *
 * يُعيد شاشة الردّ إن نقص المفتاح، و`null` إن توفّر. القفل يُقرأ من `SECTION_CAP`
 * بمسار القسم — فلا تُسمّى القدرة في الصفحة، ولا تنحرف عن خريطة التنقّل.
 *
 * **هذا هو الحاجز الحقيقيّ** لا ترشيح القائمة الجانبيّة: الرابط المخفيّ يبقى مسارًا
 * يُكتب في شريط العنوان. وكلّ صفحةٍ فرعيّة تستدعيه بمسار قسمها.
 */
export async function denyUnless(section: Section) {
  const admin = await getCurrentAdmin();
  if (admin?.caps.includes(SECTION_CAP[section])) return null;
  // **أمام غرفةٍ بعينها وهو داخل البوّابة** (٢٠٢٦-١١-١٧): كان بابَ الدخول نفسَه (`AccessDenied` على `AuthShell`) وسط البوّابة، فصار لوحَ
  // الغرفة باسمها من الخريطة (لا يرى بندَها فلا يُقرأ من المرئيّ) وتحته القفل، والجملةُ نفسُها. والبابُ (`gate`) باقٍ في `layout`
  return (
    <AdRoomDenied title={navLabelForHref(section) ?? "بوّابة أدِيب"} navPath={section}
      desc="حسابك لا يملك صلاحية هذه الصفحة. ما تملكه من أقسامٍ يظهر في القائمة الجانبيّة." />
  );
}
