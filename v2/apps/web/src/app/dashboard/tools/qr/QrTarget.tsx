import { qrFileType, targetHost, type QrKind } from "@/lib/qrLinks";

/**
 * **الوجهةُ في خانة جدولٍ أو كرت — مصدرٌ واحد** (م٢١ وم٢٤).
 *
 * الرابطُ مضيفُه (`targetHost`) بخطٍّ لاتينيّ، والملفُّ يُسمّى بنوعه: «صورة» أو «ملف PDF». فوجهتُه
 * المخزونةُ صفحتُه عندنا (`‎/q/<code>/view`)، ولو عُرضت كما الروابط لقال كلُّ ملفٍّ «adeeb.club» وهي
 * ليست وجهةً يقصدها أحد. وكان مضيفُ الوجهة يُكتب بيده في ثلاث شاشات، فلمّا وُلد النوعُ الثاني
 * جُمع ههنا.
 */
export function qrFileLabel(path: string | null): string {
  return path && qrFileType(path) === "pdf" ? "ملف PDF" : "صورة";
}

export function QrTarget({ kind, targetUrl, filePath }: { kind: QrKind; targetUrl: string; filePath: string | null }) {
  if (kind === "file") return <span className="txt">{qrFileLabel(filePath)}</span>;
  return <span className="txt font-latin" dir="ltr">{targetHost(targetUrl)}</span>;
}
