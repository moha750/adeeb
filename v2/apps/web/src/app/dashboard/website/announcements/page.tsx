import { redirect } from "next/navigation";

/**
 * **جذرُ اللوحة الإعلانية يحوّل إلى بابها الأوّل** «شريط الإعلانات» (`ticker/`).
 *
 * كان الجذرُ هو الشريطَ نفسَه منذ ٢٠٢٦-٠٩-١٨، ثمّ صارت الغرفةُ بابين بمبدّل (٢٠٢٦-١٠-٠٣)
 * ونزل الشريطُ إلى مسارٍ فرعيٍّ كي تتماثل فتاتُ البابين — العلّةُ في رأس `ticker/page.tsx`.
 * والجذرُ باقٍ لأنّه بندُ الخريطة وقفلُها (`SECTION_CAP`) وما حفظه الناس من روابط.
 */
export default function AnnouncementsRoot() {
  redirect("/dashboard/website/announcements/ticker");
}
