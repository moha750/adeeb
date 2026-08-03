// تنزيل Blob ملفًّا — **مصدرٌ واحد** لكلّ تنزيلٍ يولّده المتصفّح (بطاقة تهنئة · شهادة خبرة · خطاب إنذار · CSV).
//
// لماذا موضعٌ واحد؟ لأنّ التنزيل كان مكتوبًا ثلاث مرّات، وفي ثلاثتها العيب نفسه: `URL.revokeObjectURL`
// يُستدعى في نفس اللحظة بعد `a.click()`. كروم وفَيَرفُكس يمسكان الـblob تزامنيًّا أثناء إرسال النقرة
// فلا يضرّهما الإبطال، أمّا WebKit (سفاري iOS) فيجدول القراءة في مهمّةٍ لاحقة — فيجد العنوان مُبطَلًا
// ويردّ صفحةَ فشل: «تعذّر إكمال العملية (خطأ 1 في WebKitBlobResource)».
//
// فالإبطال هنا **مؤجَّل**: العنوان يحيا حتّى يفرغ المتصفّح من قراءته، ثمّ يُحرَّر. وإلحاق الرابط
// بالمستند شرطٌ آخر يفرضه سفاري (رابطٌ خارج الشجرة لا يُفعِّل التنزيل).

/** مهلة حياة عنوان الـblob بعد النقرة — سخيّة عمدًا؛ التحرير تنظيفٌ لا شرطُ صحّة. */
const REVOKE_AFTER_MS = 60_000;

/** المحارف الممنوعة في أسماء ملفّات ويندوز/ماك — تُنزَع فيبقى الاسم العربيّ سليمًا. */
function safeName(filename: string, fallback: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, "").trim() || fallback;
}

/** ينزّل Blob ملفًّا باسمٍ عربيّ. آمنٌ في سفاري iOS (إبطالٌ مؤجَّل + رابطٌ داخل المستند). */
export function downloadBlob(blob: Blob, filename: string, fallback = "ملف"): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName(filename, fallback);
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
}
