// مفردات الفعاليّات — لا تعتمد على شيء خادميّ، فيستوردها الخادم والعميل معًا بأمان.
// كلّ قيمة هنا يحرسها قيدٌ مقابل في القاعدة:
//   activities_activity_type_check · activity_reservations_status_check ·
//   activity_reservations_attendance_status_check.
// لا تُضِف قيمة قبل توسيع القيد بترحيل مقابل.

/* ══ نوع الفعاليّة + تقسيم المقاعد + الجنس (من المصدر المشترك) ═══════════ */

// النوع وتقسيم المقاعد وتسمية الجنس مفرداتٌ نقيّة تخدم اللوحة والصفحة العامّة معًا،
// فمكانها المصدر المشترك @/lib/activities، وتُعاد تصديرها هنا (لا نسخة ثانية).
export { TYPE_META, TYPE_VALUES, TYPE_OPTIONS, GENDER_LABEL, AUDIENCE_OPTIONS, AUDIENCE_LABEL, deriveSeats, type ActivityType } from "@/lib/activities";

/* ══ حالة الفعاليّة — مشتقّة لا مخزّنة ═════════════════════════════════ */

// لا عمود «حالة» في القاعدة؛ الحالة تُحسب من علمَي is_published/is_cancelled والتاريخ
// (كحالات الاستبيان المحسوبة). المصدر الواحد deriveStatus أدناه، يقرؤه الخادم والعميل.
export type EventStatus = "draft" | "published" | "ended" | "cancelled";

export const STATUS_META: Record<EventStatus, { label: string; tone: "info" | "success" | "neutral" | "danger" }> = {
  draft: { label: "مسودّة", tone: "info" },
  published: { label: "منشورة", tone: "success" },
  ended: { label: "منتهية", tone: "neutral" },
  cancelled: { label: "ملغاة", tone: "danger" },
};

/**
 * الحالة المشتقّة — قيدُ القاعدة `NOT(cancelled AND published)` يضمن ألّا تجتمع النغمتان.
 * @param dateYMD تاريخ الفعاليّة "YYYY-MM-DD" · @param todayYMD اليوم بالصيغة نفسها.
 */
export function deriveStatus(isPublished: boolean, isCancelled: boolean, dateYMD: string, todayYMD: string): EventStatus {
  if (isCancelled) return "cancelled";
  if (!isPublished) return "draft";
  return dateYMD >= todayYMD ? "published" : "ended";
}

/**
 * انتقالات الحالة المشروعة — مصدر واحد لقائمة الإجراءات في الواجهة وللتحقّق في الفعل الخادميّ.
 * المفتاح اسم العمليّة، والقيمة: من أيّ حالات (مشتقّة) تصحّ + تسمية الإجراء.
 * التطبيق على العلمين: publish=نشر · unpublish=إخفاء · cancel=إلغاء (يطفئ النشر معًا لاحترام القيد)
 * · reactivate=إعادة الملغاة إلى مسودّة.
 */
export const STATUS_OPS = {
  publish: { from: ["draft"], label: "نشر الفعاليّة" },
  // «المنتهية» منشورةٌ مضى وقتها؛ إخفاؤها يعيدها مسودّةً (past draft) فتُحجب عن العامّة.
  unpublish: { from: ["published", "ended"], label: "إلغاء النشر" },
  cancel: { from: ["draft", "published"], label: "إلغاء الفعاليّة" },
  reactivate: { from: ["cancelled"], label: "إعادة تفعيل" },
} as const satisfies Record<string, { from: readonly EventStatus[]; label: string }>;
export type StatusOp = keyof typeof STATUS_OPS;

/* ══ حالة الحجز والحضور (التفاصيل) ════════════════════════════════════ */

export const RESERVATION_STATUS_META: Record<"confirmed" | "cancelled", { label: string; tone: "success" | "danger" }> = {
  confirmed: { label: "مؤكّد", tone: "success" },
  cancelled: { label: "ملغى", tone: "danger" },
};

// «no_show» محسوب في get_activity_full_details لا مخزّن (نافذة: نهاية الفعاليّة + ساعة).
export type AttendanceStatus = "registered" | "attended" | "no_show";
export const ATTENDANCE_META: Record<AttendanceStatus, { label: string; tone: "neutral" | "success" | "warning" }> = {
  registered: { label: "مسجّل", tone: "neutral" },
  attended: { label: "حاضر", tone: "success" },
  no_show: { label: "لم يحضر", tone: "warning" },
};

export const ACCOUNT_TYPE_LABEL: Record<"visitor" | "member", string> = { visitor: "زائر", member: "عضو" };

/* ══ مرحلة الحجز في خطّ الفعاليّة (مسجّل→واتساب→حاضر→شهادة) ═══════════════ */

// المرحلة الحاليّة لكلّ حجز — تُشتقّ من الأعلام (لا عمود). ترتيب الأسبقيّة من الأبعد للأقرب.
export type ReservationStage = "awaiting_whatsapp" | "confirmed_wa" | "attended" | "cert_sent" | "no_show" | "cancelled";

export const STAGE_META: Record<ReservationStage, { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }> = {
  awaiting_whatsapp: { label: "بانتظار واتساب", tone: "neutral" },
  confirmed_wa: { label: "مؤكّد واتساب", tone: "info" },
  attended: { label: "حاضر — صدرت الشهادة", tone: "success" },
  cert_sent: { label: "أُرسلت الشهادة", tone: "success" },
  no_show: { label: "لم يحضر", tone: "warning" },
  cancelled: { label: "ملغى", tone: "danger" },
};

/** المرحلة الحاليّة من أعلام الحجز — مصدرٌ واحد للشارة وتقسيم التبويبات. */
export function reservationStage(f: {
  status: "confirmed" | "cancelled";
  attendance: AttendanceStatus;
  whatsappConfirmed: boolean;
  certificateSent: boolean;
}): ReservationStage {
  if (f.status === "cancelled") return "cancelled";
  if (f.attendance === "no_show") return "no_show";
  if (f.certificateSent) return "cert_sent";
  if (f.attendance === "attended") return "attended";
  if (f.whatsappConfirmed) return "confirmed_wa";
  return "awaiting_whatsapp";
}

/**
 * رموز أخطاء دوالّ الحجز/الحضور (RAISE EXCEPTION) → رسائل عربيّة.
 * الدالّة ترفع برمزٍ ثابت يصل في `error.message`؛ نلتقطه بالاحتواء (أمتن من المطابقة التامّة).
 */
export const RESERVATION_ERRORS: Record<string, string> = {
  NOT_AUTHENTICATED: "انتهت جلستك — سجّل الدخول ثانيةً.",
  NOT_AUTHORIZED: "لا تملك صلاحية هذا الإجراء.",
  RESERVATION_NOT_FOUND: "لم يُعثر على الحجز.",
  RESERVATION_LOCKED: "لا يُلغى حجزٌ سُجِّل حضوره أو صدرت شهادته.",
  RESERVATION_CANCELLED: "هذا الحجز ملغى.",
  ACTIVITY_NOT_FOUND: "لم يُعثر على الفعاليّة.",
  ACTIVITY_CANCELLED: "الفعاليّة ملغاة.",
  ACTIVITY_PAST: "انتهت الفعاليّة — لا يصحّ هذا الإجراء بعدها.",
  OUTSIDE_ATTENDANCE_WINDOW: "تسجيل الحضور متاح ضمن نافذة الفعاليّة فقط (من ساعة قبل بدايتها إلى ساعة بعد نهايتها).",
  REASON_REQUIRED: "سبب الإلغاء مطلوب.",
  CERTIFICATE_NOT_ISSUED: "لم تصدر شهادة لهذا الحجز بعد.",
  INVALID_STATUS: "حالة غير صالحة.",
};

export const reservationErrorMessage = (raw: string | null | undefined): string => {
  const code = Object.keys(RESERVATION_ERRORS).find((c) => (raw ?? "").includes(c));
  return code ? RESERVATION_ERRORS[code] : "تعذّر تنفيذ الإجراء — حاول مجدّدًا.";
};
