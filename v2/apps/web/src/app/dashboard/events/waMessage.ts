/**
 * **رسالةُ تأكيد الحجز في واتساب** — بالقالب المعتمَد، مُعبّأةً ببيانات الحاجز والفعاليّة. نُقلت من `EventDetailView.tsx` كما هي حرفًا
 * (٢٠٢٦-١١-٠٧) حين انتقلت صفحةُ الفعاليّة إلى قالب «التذكرة المفتوحة»، فتقرؤها الصفحتان من مصدرٍ واحد. وأرقامُها لاتينيّة
 * بقرار صاحب الموقع (٢٠٢٦-١١-٠٧): الأرقامُ لاتينيّةٌ في الموقع كلِّه وفيما يُرسَل إلى الناس منه، فسقط محوّلُ الأرقام الهنديّة
 * الذي كان يُبقيها هنا وحدها. والصياغةُ كما هي حرفًا.
 */
import { fmtWallClock } from "@/lib/dates";
import type { EventDetail, ReservationRow } from "./data";
import { TYPE_META } from "./vocab";

const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

/** "YYYY-MM-DD" → «الأربعاء، 6 مايو 2026» (يوم الأسبوع + أرقام لاتينيّة). */
function fmtFullDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${WEEKDAYS[new Date(y, m - 1, d).getDay()]}، ${d} ${MONTHS[m - 1]} ${y}`;
}
/** "HH:MM" (٢٤‑ساعة) → «10 صباحًا» — ساعةُ الجدار الواحدة (`fmtWallClock`)، بالكلمة كاملةً كبقيّة الموقع (المالك ٢٠٢٦-١١-١٥) */
const to12h = (hm: string): string => fmtWallClock(hm);

/** رسالة تأكيد واتساب بالقالب المعتمَد — مُعبّأة ببيانات الحاجز والفعاليّة. */
export function buildWaMessage(r: ReservationRow, d: EventDetail): string {
  const greet = r.fullName?.trim() ? `السلام عليكم ${r.fullName.trim()}،` : "السلام عليكم،";
  const time = d.startTime ? `الوقت: ${d.endTime ? `${to12h(d.startTime)} - ${to12h(d.endTime)}` : to12h(d.startTime)}` : "";
  const loc = d.location
    ? (d.locationUrl ? `الموقع: ${d.location}\n${d.locationUrl}` : `الموقع: ${d.location}`)
    : (d.locationUrl ? `الموقع:\n${d.locationUrl}` : "");
  return [
    greet,
    `نؤكد حجزك في ${TYPE_META[d.type].label} "${d.name}".`,
    `التاريخ: ${fmtFullDate(d.date)}`,
    time,
    "ملحوظة: يُرجى الحضور قبل الموعد المحدد بـ10 دقايق على الأقل لضمان سلاسة الدخول.",
    loc,
    "نسعد بحضورك.\nمع تحيات نادي أدِيب",
  ].filter(Boolean).join("\n\n");
}

