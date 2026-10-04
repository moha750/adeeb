/**
 * **ما يعرفه المتصفّح عن نفسه** — جهازٌ وهيئةٌ وقدرة (٢٠٢٦-١٠-٠٣). للعميل وحده.
 *
 * والفرقُ الذي يحكم كلَّ شيء: **آيفون لا يعطي الإشعارات إلّا لتطبيقٍ مثبَّت** (iOS 16.4+)،
 * فـ`PushManager` غائبٌ في تبويب سفاري ولو كان النظامُ حديثًا. وأندرويد والحاسوب يعطيانها
 * في المتصفّح نفسه، والتثبيتُ عندهما راحةٌ لا شرط.
 */

export type DevicePlatform = "ios" | "android" | "desktop";

export function devicePlatform(): DevicePlatform {
  const ua = navigator.userAgent;
  // آيباد منذ iPadOS 13 يتنكّر بماك في هويّته، ويُعرف باللمس.
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

/** مفتوحٌ من أيقونة الشاشة الرئيسيّة لا من تبويب. (`navigator.standalone` لآيفون قبل دعمه الاستعلام.) */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** مفتاحُ خادمنا العامّ بالصيغة التي يطلبها `pushManager.subscribe`. `null` إن لم يُضبَط. */
export function vapidKey(): Uint8Array<ArrayBuffer> | null {
  const k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!k) return null;
  const b64 = (k + "=".repeat((4 - (k.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * **تسجيلُ عاملنا دائمًا، ثمّ انتظارُ أن ينشط.**
 *
 * لا «اقرأ المسجَّلَ إن وُجد»: النسخةُ الأولى من الموقع سجّلت على النطاق نفسِه عاملًا آخر
 * (`/service-worker.js`، يخبّئ ولا يعرف الإشعارات)، وما زال حيًّا في متصفّحات من استعملها.
 * فلو قُرئ المسجَّلُ لَاشترك الجهازُ عند عاملٍ لا يُظهر شيئًا، وآيفون يعدّ الدفعةَ التي لا
 * يتبعها إشعارٌ صامتةً فيُسقط الاشتراك. والتسجيلُ بسكربتٍ جديد على النطاق نفسِه **يستبدل**
 * القديم، والمتصفّحُ لا يعيد تثبيت سكربتٍ لم يتبدّل، فالنداءُ في كلّ مرّةٍ رخيص.
 *
 * و`ready` لا التسجيل: `subscribe` على تسجيلٍ لم ينشط عاملُه يُرمى بـ`InvalidStateError`.
 * و`updateViaCache: "none"` كي يُسأل الخادمُ عن `sw.js` ولا تُجيب ذاكرةُ المتصفّح.
 */
export async function swRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/** هل وُلد هذا الاشتراكُ بمفتاحنا الحاليّ؟ اشتراكٌ بمفتاحٍ آخر تردّه خدمةُ الدفع ولو بدا قائمًا. */
export function sameKey(sub: PushSubscription, key: Uint8Array): boolean {
  const k = sub.options?.applicationServerKey;
  if (!k) return true; // متصفّحٌ لا يكشفه: لا يُحكم عليه بما لا يُعرف
  const a = new Uint8Array(k);
  return a.length === key.length && a.every((b, i) => b === key[i]);
}
