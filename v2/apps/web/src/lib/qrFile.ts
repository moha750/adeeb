import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { formatBytesAr } from "@/lib/bytes";

/**
 * **ملفُّ الباركود قبل أن يُرفع — صورةٌ أو PDF** (م٢١ وم٢٤). المرفوعُ ليس المحفوظ.
 *
 * **الصورةُ تُصغَّر في المتصفّح**: صورةُ الجوّال الخامُ بين ثلاثةٍ وعشرة ميغابايت، ومن يمسح
 * الملصقَ يفتحها في الغالب ببيانات جوّاله لا بشبكةٍ منزليّة. فتُصغَّر إلى ضلعٍ أقصاه ٢٠٤٨ (مقاسُ
 * تصدير الباركود نفسُه: يكفي شاشةً كاملةً وطباعةً صغيرة) ويُعاد ترميزُها، فتصل الدلوَ خفيفةً ولا
 * يُطلب من صاحبها أن يضغطها بيده.
 *
 * **والترميزُ WEBP أوّلًا ثمّ JPEG**: سفاري لا يكتب WEBP من اللوح، فيُسلّم PNG ثقيلًا بصمتٍ
 * بدل أن يخطئ. فيُسأل الناتجُ عن نوعه، ويُعاد بـJPEG على أرضٍ بيضاء (لا شفافيّةَ فيه، فالشفّافُ
 * يصير أسودَ بلا أرض).
 *
 * **والـPDF يمرّ كما هو**: لا يُضغط في المتصفّح بلا مكتبةٍ ثقيلة، فحدُّه حدُّ الدلو نفسُه.
 */

/** أطولُ ضلعٍ يُحفَظ للصورة. */
export const QR_IMAGE_SIDE = 2048;

const PICK = UPLOAD_RULES.qrFile;
const STORED = UPLOAD_RULES.qrFileStored;

/** صورةٌ بهذا الحجم فما دونه، وضلعُها في الحدّ، تمرّ كما هي: إعادةُ ترميزها قد تُثقلها. */
const PASS_BYTES = 1024 * 1024;
const PASS_TYPES = ["image/webp", "image/jpeg", "image/png"];

export const isPdf = (file: { type: string }) => file.type === "application/pdf";

/**
 * **فحصُ الملفّ ساعةَ يُختار** — جملةُ رفضٍ جاهزةٌ أو `null`. حدّان لا حدٌّ واحد: الصورةُ بحدّ
 * أصلها الخام (تُصغَّر بعدُ)، والـPDF بحدّ الدلو (لا يُصغَّر). والجملةُ جملةُ قانون المرفقات.
 */
export function checkQrFile(file: File): string | null {
  const why = checkFile(file, PICK);
  if (why) return why;
  if (isPdf(file) && file.size > STORED.maxBytes) {
    return `الحجمُ ${formatBytesAr(file.size)} وحدُّ ملفّ PDF ${formatBytesAr(STORED.maxBytes)} : اختر أصغر منه`;
  }
  return null;
}

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/** **الملفُّ كما يُرفع**: الـPDF كما هو، والصورةُ مصغَّرةً معادةَ الترميز. */
export async function prepareQrFile(file: File): Promise<Blob> {
  if (isPdf(file)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    // `decode` يرمي على ما لا يُقرأ (HEIC في غير سفاري، أو ملفٌّ تالف): يُلتقط عند المستدعي
    await img.decode();

    const side = Math.max(img.naturalWidth, img.naturalHeight);
    const k = Math.min(1, QR_IMAGE_SIDE / side);
    if (k === 1 && file.size <= PASS_BYTES && PASS_TYPES.includes(file.type)) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * k));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * k));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const webp = await encode(canvas, "image/webp", 0.86);
    if (webp && webp.type === "image/webp") return webp;

    // سفاري: أرضٌ بيضاءُ تحت الصورة ثمّ JPEG
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const jpeg = await encode(canvas, "image/jpeg", 0.86);
    if (!jpeg) throw new Error("encode");
    return jpeg;
  } finally {
    URL.revokeObjectURL(url);
  }
}
