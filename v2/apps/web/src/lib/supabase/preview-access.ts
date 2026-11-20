/**
 * **رمزُ المعاينة في المتصفّح** (محمد ٢٠٢٦-١١-٢٠: «لماذا لا تكون بهوية المعاين في كل شيء بلا استثناء؟»). ما يقرؤه المتصفّحُ من
 * القاعدة مباشرةً (الحجزُ، والملفُّ، والجرسُ الحيّ، والرفع) يقرؤه بهويّة المُعايَن كالخادم. والرمزُ يصل إلى متصفّح صاحب المعاينة
 * وحده، بعمرٍ قصيرٍ يُجدَّد، ويُمحى حين تنتهي المعاينة (`ViewAsBar`). وما يخصّ الجلسةَ نفسَها (`/auth/v1`) لا يُعار.
 */
type Access = { token: string; exp: number; userId: string };

declare global {
  interface Window { __adeebPreview?: Access | null }
}

export function setPreviewAccess(a: Access | null) {
  if (typeof window !== "undefined") window.__adeebPreview = a;
}

/** الرمزُ ما دام حيًّا، وإلّا `null` (فيعود المتصفّحُ إلى جلسة صاحبه) */
export function previewAccess(): Access | null {
  if (typeof window === "undefined") return null;
  const a = window.__adeebPreview;
  return a && a.exp * 1000 > Date.now() + 5_000 ? a : null;
}
