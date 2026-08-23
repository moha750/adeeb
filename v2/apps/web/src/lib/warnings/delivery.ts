/**
 * مفردات تسليم الإشعار — **المصدر الواحد** بوجهه العميليّ. ووجهُه الآخر قيدُ `status`
 * و`channel` في `notification_deliveries`؛ فمن زاد حالةً زادها في القيد وهنا معًا.
 *
 * وفيه لغةُ الشاشة عن القناة: **الإنذار واقعةٌ، ووصولُه خبرٌ آخر**، فالشارةُ تقول أين بلغ
 * الخبرُ لا ما إذا كان الإنذارُ صحيحًا.
 */

export const DELIVERY_STATUSES = [
  { value: "pending", label: "بانتظار الإرسال" },
  { value: "processing", label: "جارٍ الإرسال" },
  { value: "sent", label: "أُرسل" },
  { value: "delivered", label: "وصل" },
  { value: "read", label: "قُرئ" },
  { value: "failed", label: "لم يصل" },
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]["value"];

export type DeliveryChannel = "whatsapp" | "email" | "in_app";

const LABEL = new Map<string, string>(DELIVERY_STATUSES.map((s) => [s.value, s.label]));

/** حالُ التسليم عربيًّا. والمجهولُ يُقال كما هو لا يُخفى. */
export const deliveryLabel = (status: string): string => LABEL.get(status) ?? status;

/** نغمةُ الشارة — الوصولُ خبرٌ سارّ، والفشلُ خطرٌ يُرى، وما بينهما محايد. */
export function deliveryTone(status: string): "success" | "danger" | "info" | "neutral" {
  if (status === "read" || status === "delivered") return "success";
  if (status === "failed") return "danger";
  if (status === "sent" || status === "processing") return "info";
  return "neutral";
}

/**
 * **رتبةُ الحال — والحالُ تتقدّم ولا ترجع.**
 *
 * وثيقةُ YCloud تقول صراحةً إنّ ترتيبَ أحداث `whatsapp.message.updated` **غيرُ مضمون**:
 * قد يصل «فشل» بعد «سُلّم»، وقد تصل «سُلّم» بعد «قُرئ». فلو كُتبت الحالُ كما وصلت
 * لانحدر السجلُّ وكذب على قارئه.
 *
 * **وموضعُ `failed` بين `sent` و`delivered` هو الحكمُ كلُّه** (قرار المالك ٢٠٢٦-٠٨-٢١):
 *   · `sent` ⇐ يصير `failed` أو `delivered` أو `read`
 *   · `failed` ⇐ يصير `delivered` أو `read` (فشلٌ متأخّرٌ سبقته حقيقةُ الوصول)
 *   · `delivered` ⇐ يصير `read` وحده
 *   · `read` نهائيّةٌ لا يعلوها شيء
 * **و`failed` لا يُنزِل `delivered` ولا `read` أبدًا**: ما وصل قد وصل، وخبرُ فشلٍ جاء
 * بعده خبرٌ تأخّر عن الحقيقة لا حقيقةٌ جديدة.
 *
 * **وتوأمُها** في `supabase/functions/whatsapp-webhook/index.ts` — فمن غيّر ترتيبَ
 * هذا الجدول غيّره هناك، ومِعيارُ هذا الملفّ هو الحارس.
 */
export const DELIVERY_RANK: Record<string, number> = {
  pending: 0,
  processing: 1,
  sent: 2,
  failed: 3,
  delivered: 4,
  read: 5,
};

/** أتتقدّم الحالُ الواردةُ على المكتوبة؟ فإن لم تتقدّم لم تُكتب. */
export function advancesTo(current: string, incoming: string): boolean {
  const from = DELIVERY_RANK[current];
  const to = DELIVERY_RANK[incoming];
  // حالٌ لا نعرفها لا تُكتب: الصمتُ خيرٌ من كتابةِ ما لا يُفهَم
  if (from === undefined || to === undefined) return false;
  return to > from;
}

/**
 * عمرُ المِطالبة بالدقائق. **توأمُ** `STALE_CLAIM_MINUTES` في
 * `supabase/functions/send-warning-whatsapp/index.ts`: نداءٌ مات بعد أن طالبَ الصفَّ
 * يترك `processing` معلّقةً، فلو لم تعرف الواجهةُ القاعدةَ نفسَها لعطّلت الزرّ أبدًا على
 * صفٍّ تقبله القاعدةُ للإرسال.
 */
export const STALE_CLAIM_MINUTES = 10;

/**
 * هل يجوز الإرسال الآن؟ **`pending` و`failed`** ومطالَبٌ متروك — والمُرسَلُ لا يُبعث
 * ثانيةً بضغطةٍ ساهية.
 *
 * وهذا **وجهُ القفل الذي في القاعدة** لا حكمٌ مستقلٌّ عنه: القفلُ الحقيقيّ
 * `unique(warning_id, channel)` ومِطالبةُ `claim_notification_delivery` الذرّيّة. وما
 * ههنا تعطيلُ زرٍّ قبل رحلةٍ تعود بالجواب نفسه.
 */
export function maySend(status: string | null, updatedAt?: string | null): boolean {
  if (status === null || status === "pending" || status === "failed") return true;
  if (status !== "processing") return false;
  if (!updatedAt) return false;
  const age = Date.now() - new Date(updatedAt).getTime();
  return Number.isFinite(age) && age > STALE_CLAIM_MINUTES * 60_000;
}

/** أُرسل ولم يصل بعدُ خبرُ تسليمه: زرُّ الإعادة يُعطَّل، والشاشةُ تقول لماذا. */
export const sendBlockedWhy = (status: string): string =>
  status === "processing"
    ? "الإرسال جارٍ الآن."
    : `أُرسل هذا الإنذار من قبل (${deliveryLabel(status)})، فلا يُرسَل مرّتين.`;

/* ══ الإنذارُ الأخير وقالبُه ═══════════════════════════════════════════════════
   للإنذارات قالبان لا واحد (٢٠٢٦-٠٨-٢١): قالبُ العامّة يقول «وقد بقي لك… قبل بلوغ
   الحدّ»، وهي جملةٌ كاذبةٌ على من سُحبت عضويّتُه؛ فللأخير قالبُه
   (`YCLOUD_FINAL_WARNING_TEMPLATE`) بثلاثة معاملاتٍ لا أربعة.

   **ولا تُعطَّل الشاشةُ لأجل هذا.** كان ههنا `templateCoversWarning` يمنع الزرَّ عن
   البالغِ الحدّ، وقد سقط: الحكمُ صار **على الإعداد لا على الحال**، والإعدادُ سرٌّ في
   دوالّ الحافة لا يبلغه المتصفّح. فلا يُخمَّن ما لا يُعرَف: يُنادى الخادمُ، فإن كان
   السرُّ غائبًا ردّ `FINAL_WARNING_NO_TEMPLATE` وقيلت الجملةُ أدناه. */

/** ما يُقال لصاحب اللوحة حين يبلغ الإنذارُ الحدَّ ولا قالبَ لأخيرِه. */
export const FINAL_NO_TEMPLATE_WHY =
  "بلغ العضو حدّ الإنذارات وسُحبت عضويّته، ولم يُضبَط قالبُ الإنذار الأخير. نزّل الخطاب وأرسِله يدويًّا.";
