/**
 * كاتبُ PDF أدنى — صفحاتٌ تحمل كلٌّ منها صورةً واحدة. عميليّ (يُستدعى بعد الرسم في المتصفّح).
 *
 * **لماذا بلا حزمة؟** ما نحتاجه سطرٌ من مواصفة PDF لا مكتبةُ تنضيد: صفحةٌ بمقاسٍ ثابت،
 * وصورةُ JPEG تُدرَج كما هي (`DCTDecode` يقبل بايتات JPEG بلا إعادة ترميز). فحزمةٌ كاملة
 * (jsPDF ≈ 350ك) لأجل ذلك ثقلٌ بلا مقابل — والملفّ هنا ثمانون سطرًا مقروءة.
 *
 * **ولماذا JPEG لا PNG؟** إدراجُ PNG في PDF يوجب فكّ ضغطه وإعادةَ ترميزه (Flate بمتنبّئات)،
 * وJPEG يُدرَج بايتًا ببايت. والورقة صورةٌ فوتوغرافيّة الأصل (ورقٌ مجعّد)، فالجودة لا تُمَسّ.
 *
 * ولمن أراد التوسعة يومًا: البنية أدناه ستّةُ كائنات مرقّمة، وجدولُ `xref` يذكر إزاحةَ كلٍّ
 * منها بالبايت — فمن زاد كائنًا زاد سطرَه في الجدول وعدَّ `Size`.
 */

/** مقاس صفحة PDF بالنقاط (72 نقطة = بوصة). A4 عرضيّ = 841.89 × 595.28. */
export type PdfPage = { w: number; h: number };

/** A4 عرضيّ — مقاس ورقة الشهادة (3508×2480 بكسل عند 300dpi هو هذا بعينه). */
export const A4_LANDSCAPE: PdfPage = { w: 841.89, h: 595.28 };

const ascii = (s: string): Uint8Array => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

/**
 * يبني PDF من صورة JPEG: صفحةٌ واحدة بمقاس `page`، والصورةُ تملؤها.
 *
 * `size` مقاسُ الصورة بالبكسل — يُكتب في الكائن ولا يغيّر العرض (الصورة تُمدّ على الصفحة
 * كاملةً)، لكنّه لازمٌ لقارئ الـPDF كي يفكّ الترميز.
 */
export function imagePdf(jpeg: Uint8Array, size: { w: number; h: number }, page: PdfPage = A4_LANDSCAPE): Blob {
  return imagesPdf([{ jpeg, size }], page);
}

/**
 * **صفحاتٌ عدّة**، لكلّ صفحةٍ صورتُها (٢٠٢٦-١٠-٢٣، للبيانات الرسميّة): البنيةُ نفسُها بثلاثة كائناتٍ لكلّ
 * صفحة (الصفحةُ وصورتُها ومحتواها) بعد الفهرس وشجرة الصفحات. والصفحةُ الواحدة حالةٌ منها لا مسارٌ ثانٍ.
 */
export function imagesPdf(images: { jpeg: Uint8Array; size: { w: number; h: number } }[], page: PdfPage = A4_LANDSCAPE): Blob {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;

  const push = (chunk: Uint8Array) => { parts.push(chunk); length += chunk.length; };
  const text = (s: string) => push(ascii(s));
  /** يبدأ كائنًا مرقّمًا ويسجّل إزاحته — الجدول أدناه يقرأ هذه الإزاحات. */
  const obj = (n: number, body: string) => { offsets[n] = length; text(`${n} 0 obj\n${body}\n`); };

  const content = `q ${page.w.toFixed(2)} 0 0 ${page.h.toFixed(2)} 0 0 cm /Im0 Do Q`;
  // لكلّ صفحةٍ ثلاثةُ كائنات تبدأ من 3: الصفحة (3+3i)، صورتُها (4+3i)، محتواها (5+3i)
  const pageRef = (i: number) => 3 + 3 * i;
  const total = 2 + 3 * images.length;

  text("%PDF-1.4\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  obj(2, `<< /Type /Pages /Kids [${images.map((_, i) => `${pageRef(i)} 0 R`).join(" ")}] /Count ${images.length} >>\nendobj`);

  images.forEach(({ jpeg, size }, i) => {
    const pg = pageRef(i), im = pg + 1, ct = pg + 2;
    obj(pg,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.w.toFixed(2)} ${page.h.toFixed(2)}]`
      + ` /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>\nendobj`);

    // كائن الصورة: ترويسةٌ ثمّ بايتات JPEG كما هي ثمّ ختام
    offsets[im] = length;
    text(
      `${im} 0 obj\n<< /Type /XObject /Subtype /Image`
      + ` /Width ${size.w} /Height ${size.h}`
      + ` /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    );
    push(jpeg);
    text("\nendstream\nendobj\n");

    obj(ct, `<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj`);
  });

  const xref = length;
  let table = `xref\n0 ${total + 1}\n0000000000 65535 f \n`;
  for (let n = 1; n <= total; n++) table += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  text(table);
  text(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const bytes = new Uint8Array(length);
  let at = 0;
  for (const p of parts) { bytes.set(p, at); at += p.length; }
  return new Blob([bytes], { type: "application/pdf" });
}
