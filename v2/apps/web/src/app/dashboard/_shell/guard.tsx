import { getCurrentAdmin } from "@/lib/auth";
import { SECTION_CAP, type Section } from "@/lib/capabilities";
import { AccessDenied } from "./AccessDenied";

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
  return <AccessDenied name={admin?.fullName ?? null} scope="room" />;
}
