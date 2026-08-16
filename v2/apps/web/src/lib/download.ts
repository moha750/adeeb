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

/* ── الحفظ في الاستوديو ───────────────────────────────────────────────────
   لا تملك الويب بابًا يكتب في ألبوم الصور مباشرةً — لا في iOS ولا في أندرويد؛ فما ينزّله
   المتصفّح يقع في «الملفّات». الطريق الوحيد هو **ورقة المشاركة** (`navigator.share`)
   بملفٍّ حقيقيّ: يفتحها النظام فيظهر فيها «حفظ الصورة»/«حفظ في الصور» إلى جانب واتساب
   وسواه، فيختار المستخدم الاستوديو. هكذا تفعل المواقع التي تحفظ في الاستوديو، لا بغيره.

   وشرطان يحكمانها:
   • الحاسب يبقى على التنزيل — ورقة مشاركة ويندوز لا تعرف استوديو، والتنزيل أصحّ هناك.
   • الورقة تطلب «إذن لمسةٍ حيّ»؛ وقد يُنقض بعد انتظارٍ طويل (توليد البطاقة). فإن رُدّت
     بـNotAllowedError ارتددنا إلى التنزيل — والإلغاء (AbortError) قرارُ مستخدمٍ لا عطب،
     فلا يُنزَّل شيء بعده ولا يُبشَّر بنجاح. */

export type SaveResult = "shared" | "downloaded" | "cancelled";

/** ورقة المشاركة متاحة لهذا الملفّ؟ (الهاتف واللوح وحدهما.) */
function canShareFile(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
  if (!window.matchMedia("(pointer: coarse)").matches) return false;
  return navigator.canShare({ files: [file] });
}

/**
 * يعرض الملفّ في ورقة مشاركة النظام (فيُحفظ في الاستوديو أو يُرسَل)، وإلّا ينزّله.
 * ينبغي أن يُنادى من نقرةِ مستخدمٍ مباشرة — وكلّما طال التوليد قبله ضَعُف إذن اللمسة.
 */
export async function shareOrDownloadBlob(blob: Blob, filename: string, fallback = "ملف", text?: string): Promise<SaveResult> {
  const name = safeName(filename, fallback);
  const file = new File([blob], name, { type: blob.type || "application/octet-stream" });

  if (canShareFile(file)) {
    try {
      // النصُّ المرافق **رجاءٌ لا ضمان**: بعض التطبيقات (واتساب منها) تُسقطه حين تستقبل صورة.
      // فمن أراد يقينًا نسخَ النصّ فله زرُّ نسخٍ في شاشته، وهذا لا يضرّ إن سقط.
      await navigator.share({ files: [file], ...(text ? { text } : {}) });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
      /* NotAllowedError أو أيّ عطبٍ آخر ⇒ التنزيل أدناه */
    }
  }

  downloadBlob(blob, name, fallback);
  return "downloaded";
}
