/**
 * الرفعُ إلى المخزن **بتقدّمٍ معلوم**.
 *
 * ولمَ `XMLHttpRequest` لا `fetch`؟ لأنّ `fetch` **لا يكشف تقدّمَ الرفع**:
 * جسمُ الطلب يُبتلع ولا حدثَ يقول كم مضى منه (وما يُتاح في المواصفة يلزمه
 * تدفّقٌ ثنائيُّ الاتّجاه لا تسنده كلُّ المتصفّحات). و`XHR` يملك
 * `upload.onprogress` منذ عقدين. فالقديمُ هنا أصدق.
 *
 * وملفُّ الحلقة عشراتُ الميغابايت يمشي من جهاز المستخدم إلى R2 مباشرةً، فسطرٌ
 * يقول «جارٍ» بلا رقم يترك صاحبَه لا يدري: أوشك أم تعلّق؟
 */

export type PutResult = { ok: true } | { ok: false; message: string };

/** يردّ نجاحًا أو **رسالةَ عطبٍ عربيّةً تسمّي العلّة**، ولا يرمي. */
export function putWithProgress(
  url: string,
  file: File,
  onProgress: (fraction: number) => void,
): Promise<PutResult> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(1); resolve({ ok: true }); return; }
      resolve({ ok: false, message: `ردّ المخزن ${xhr.status}. أعِد المحاولة.` });
    };

    // الحالةُ صفرٌ = لم يصل الطلبُ أصلًا، وأشهرُ أسبابه أنّ الدلو لا يأذن لأصلنا.
    xhr.onerror = () => resolve({
      ok: false,
      message: "تعذّر الوصول إلى المخزن. غالبًا أنّ الدلو لا يأذن لهذا الأصل: شغّل «pnpm r2:cors» بتوكن R2 إداريّ.",
    });
    xhr.onabort = () => resolve({ ok: false, message: "أُلغي الرفع." });

    xhr.send(file);
  });
}
