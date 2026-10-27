import { formatBytesAr } from "./bytes";

/**
 * **قانونُ المرفقات — مصدرٌ واحدٌ لكلّ رفعٍ في الموقع.**
 *
 * كان في اللوحة عشرةُ مواضعِ رفع، كلٌّ يفحص بطريقته ويتكلّم بلغته: «الصورة أكبر من ١٥
 * ميغابايت» و«حجم الشعار يتجاوز ٥ ميغابايت» و«الملفّ أكبر من ٥١٢ كيلوبايت» — ولا واحدةٌ
 * منها تذكر الحدَّ قبل الاختيار ولا حجمَ ملفّ صاحبها. فجُمعت الوصفاتُ والجملُ هنا.
 *
 * **ثلاثُ قواعدَ يطبّقها هذا الملفّ:**
 * 1. **الحدُّ يُقال قبل الاختيار** — `attachHint` تُكتب في كلّ زرِّ رفع، فلا يُصدَم بحدٍّ لم يعرفه.
 * 2. **الرسالةُ تقول حجمَ ملفِّه لا الحدَّ وحده** — «كم زاد» هو ما يقرّر أيضغطه أم يستبدله.
 * 3. **الرفضُ عند الاختيار لا بعد الرفع** — `checkFile` تُنادى ساعةَ يختار، فلا ينتظر رفعَ
 *    عشرين ميغابايت ليُقال له إنّها كثيرة.
 *
 * والجملُ **بلا تذكيرٍ ولا تأنيث** («الحجمُ… الصيغةُ…») كي تصلح للملفّ والصورة والمقطع بلا
 * ثلاث نسخ. وأينَ تُعرَض الرسالة قاعدةٌ أخرى: **الزرُّ يصف المرفَق، والتوستُ يصف المحاولة**
 * (فمن معه مرفَقٌ صالح لا تُهدَم حالتُه لأجل محاولةٍ فاشلة).
 */
export type UploadRule = {
  /** أقصى حجمٍ بالبايت — رقمُ الدلو نفسِه لا رقمًا مستقلًّا يفترق عنه. */
  maxBytes: number;
  /** أنواعُ MIME المقبولة، وتقبل الشاملَ مثل `image/*`. */
  mimes: readonly string[];
  /** سمةُ `accept` لنافذة الاختيار — فلترةٌ تُريح لا حارسٌ يُعتمد عليه. */
  accept: string;
  /** الصيغُ كما تُقال للناس لا كما تُكتب للآلة. */
  formats: string;
  /** المرفَقُ اختياريّ: فيُذكر في الرفض أنّ له أن يتابع بلا مرفَق. */
  optional?: boolean;
  /** أطولُ ضلعٍ للصورة بعد التصغير في المتصفّح قبل رفعها (`shrinkImage`) — للصور المعروضة في الموقع. */
  maxSide?: number;
};

const MB = 1024 * 1024;

/** وصفةُ كلّ مرفَقٍ في الموقع. الرقمُ هنا هو رقمُ دلوِه — إن تغيّر الدلو فهذا موضعُ التغيير. */
export const UPLOAD_RULES = {
  /** ملفُّ الترشّح (دلو election-files). */
  candidacyFile: {
    maxBytes: 5 * MB,
    mimes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/png", "image/jpeg"],
    accept: ".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg",
    formats: "PDF أو Word أو نصّ أو صورة",
    optional: true,
  },
  /** صورةُ غلافٍ أو شعارٍ في اللوحة (دلو images). */
  siteImage: {
    maxBytes: 5 * MB,
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    accept: "image/jpeg,image/png,image/webp,image/gif",
    formats: "JPG أو PNG أو WEBP أو GIF",
    maxSide: 1600,
  },
  /** صورُ الأخبار (غلافًا ومعرضًا). */
  newsImage: {
    maxBytes: 5 * MB,
    mimes: ["image/webp", "image/jpeg", "image/jpg", "image/png"],
    accept: "image/webp,image/jpeg,image/png",
    formats: "WEBP أو JPG أو PNG",
    maxSide: 1600,
  },
  /** صفحاتُ كتابٍ في المكتبة (دلو library). */
  libraryPage: {
    maxBytes: 15 * MB,
    mimes: ["image/webp", "image/jpeg", "image/jpg", "image/png"],
    accept: "image/webp,image/jpeg,image/png",
    formats: "WEBP أو JPG أو PNG",
  },
  /** أصلُ الأفتار قبل القصّ — يُقصّ ويُصغَّر عندنا، فالسقفُ رحبٌ للمصادر الخام. */
  avatarSource: {
    maxBytes: 15 * MB,
    mimes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"],
    accept: "image/jpeg,image/png,image/webp,image/gif,image/bmp",
    formats: "JPG أو PNG أو WEBP أو GIF أو BMP",
  },
  /**
   * الأفتارُ **بعد** القصّ (دلو avatars) — غيرُ `avatarSource`: ذاك أصلٌ خامٌ يدخل المتصفّح،
   * وهذا ناتجٌ ‎512×512‎ يخرج منه WEBP نحو ٦٠ كيلوبايت. حدّان لشيئين لا لشيءٍ واحد.
   */
  avatarStored: {
    maxBytes: 2 * MB,
    mimes: ["image/webp", "image/jpeg", "image/png"],
    accept: "image/webp,image/jpeg,image/png",
    formats: "WEBP أو JPG أو PNG",
  },
  /** شعارُ الإذاعة أو البرنامج (مخزن R2). */
  radioLogo: {
    maxBytes: 8 * MB,
    mimes: ["image/webp", "image/jpeg", "image/png"],
    accept: "image/webp,image/jpeg,image/png",
    formats: "WEBP أو JPG أو PNG",
  },
  /** صوتُ الحلقة (مخزن R2) — السقفُ رحبٌ لأنّ الحلقة ساعة. */
  radioAudio: {
    maxBytes: 150 * MB,
    mimes: ["audio/mpeg", "audio/mp4", "audio/aac", "audio/x-m4a"],
    accept: "audio/mpeg,audio/mp4,audio/aac,audio/x-m4a",
    formats: "MP3 أو M4A",
  },
  /**
   * شعارٌ يُضمَّن في قلب الباركود. وحدُّه رحبٌ (٥ ميغابايت) لأنّ **المرفوعَ ليس المحفوظ**:
   * المتصفّحُ يصغّره إلى ٦٤٠ بكسلًا ويعيد ترميزه WEBP قبل أن يُضمَّن (`shrinkLogo` في
   * محرّر الباركود)، فيبقى الصفُّ في القاعدة خفيفًا مهما ثقُل الملفّ الذي اختاره صاحبُه.
   */
  qrLogo: {
    maxBytes: 5 * MB,
    mimes: ["image/png", "image/svg+xml", "image/webp", "image/jpeg"],
    accept: "image/png,image/svg+xml,image/webp,image/jpeg",
    formats: "PNG أو SVG أو WEBP أو JPG",
  },
  /**
   * **ملفُّ الباركود كما يُختار: صورةٌ أو PDF** (م٢٤). نوعٌ واحدٌ في الشاشة («ملف»)، والفحصُ يفرّق:
   * الصورةُ تُصغَّر قبل الرفع فحدُّها حدُّ الأصل الخام، والـPDF يُرفع كما هو فحدُّه حدُّ الدلو.
   * فهذا حدُّ **الأرحب** (الصورة الخامّ)، و`checkQrFile` في `lib/qrFile` يقول حدَّ الـPDF.
   *
   * **ولا `image/heic` في القائمة عمدًا**: آيفون يحوّل صورَ الألبوم إلى JPEG حين لا يُذكر
   * HEIC في `accept`، ولو ذُكر لسلّمها كما هي فعجز اللوحُ عن فكّها في غير سفاري.
   */
  qrFile: {
    maxBytes: 20 * MB,
    mimes: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    accept: "image/jpeg,image/png,image/webp,application/pdf",
    formats: "JPG أو PNG أو WEBP أو PDF",
  },
  /**
   * والملفُّ **كما يُحفَظ** (دلو qr-files): الصورةُ بعد التصغير، والـPDF كما هو. ورقمُ الدلو هو
   * حدُّ الـPDF نفسُه، يقرؤه الخادمُ قبل أن يصكّ رابطَ الرفع.
   */
  qrFileStored: {
    maxBytes: 10 * MB,
    mimes: ["image/webp", "image/jpeg", "image/png", "application/pdf"],
    accept: "image/webp,image/jpeg,image/png,application/pdf",
    formats: "WEBP أو JPG أو PNG أو PDF",
  },
  /**
   * **مقطعُ شاشة الكابينة** (دلو games، ٢٠٢٦-١٠-١٧) — يدور بلا صوتٍ في شاشة اللعبة بصالة `/games`.
   * وصورتُه الثابتةُ تُقتطع منه في المتصفّح (`dashboard/games/media.ts`)، فلا وصفةَ لها هنا.
   */
  gameVideo: {
    maxBytes: 15 * MB,
    mimes: ["video/mp4", "video/webm"],
    accept: "video/mp4,video/webm",
    formats: "MP4 أو WEBM",
  },
} as const satisfies Record<string, UploadRule>;

/** «حتّى ٥ ميغابايت» — الحدُّ كما يُقرأ. */
export const limitText = (rule: UploadRule): string => `حتّى ${formatBytesAr(rule.maxBytes)}`;

/** تلميحُ الزرّ قبل الاختيار: «PDF أو Word أو نصّ أو صورة، حتّى ٥ ميغابايت». */
export const attachHint = (rule: UploadRule): string => `${rule.formats}، ${limitText(rule)}`;

/**
 * نوعُ ملفٍّ مرفوعٍ كما يُقال للناس («PDF» · «مستند Word» · «صورة») — لغةُ المرفقات هنا لا في
 * الشاشات. ويُستعمل حيث **يُوصف الملفُّ ولا يُسمّى**: بطاقةُ الاقتراع تقول نوعَه وحجمَه ولا
 * تقول اسمَه، فاسمُ الملفّ قد يحمل اسمَ صاحبه فيكسر تعميةَ الاقتراع.
 */
export function fileKindAr(mime: string | null | undefined): string {
  const m = mime ?? "";
  if (m === "application/pdf") return "PDF";
  if (m.startsWith("image/")) return "صورة";
  if (m === "text/plain") return "ملفّ نصّيّ";
  if (m.includes("word") || m === "application/msword") return "مستند Word";
  return "ملفّ";
}

/** وصفُ مرفَقٍ في سطرٍ واحد: «PDF، ١٫٢ ميغابايت» — وبلا حجمٍ معلومٍ يبقى النوعُ وحدَه. */
export const fileMeta = (mime: string | null | undefined, bytes: number | null | undefined): string => {
  const size = formatBytesAr(bytes);
  return size ? `${fileKindAr(mime)}، ${size}` : fileKindAr(mime);
};

const mimeAllowed = (type: string, mimes: readonly string[]): boolean =>
  mimes.some((m) => (m.endsWith("/*") ? type.startsWith(m.slice(0, -1)) : m === type));

/**
 * فحصُ ملفٍّ قبل رفعه — يُرجع **سببَ الرفض جملةً جاهزةً للعرض**، أو `null` إن قُبل.
 *
 * والنوعُ لا يُفحَص حين يأتي المتصفّحُ بنوعٍ فارغ (يقع في بعض `.doc` وفي أنظمةٍ لا تعرف
 * الامتداد): الحارسُ الحقيقيُّ هو الدلو، وردُّ ملفٍّ سليمٍ بظنٍّ أسوأُ من تمريره إليه.
 */
export function checkFile(file: File, rule: UploadRule): string | null {
  if (file.size > rule.maxBytes) {
    const size = formatBytesAr(file.size);
    const limit = formatBytesAr(rule.maxBytes);
    // «٦ ميغابايت والحدُّ ٥» لا «٦ ميغابايت والحدُّ ٥ ميغابايت»: الوحدةُ تُقال مرّةً إن اتّحدت
    const [num, unit] = limit.split(" ");
    const limitText_ = size.endsWith(unit) ? num : limit;
    const exit = rule.optional ? "اختر أصغر أو تابع بلا مرفَق" : "اختر أصغر منه";
    return `الحجمُ ${size} والحدُّ ${limitText_} : ${exit}`;
  }
  if (file.type && !mimeAllowed(file.type, rule.mimes)) {
    return `الصيغةُ غير مدعومة، المدعوم ${rule.formats}`;
  }
  return null;
}

/**
 * **تصغيرُ الصورة في المتصفّح قبل رفعها** (٢٠٢٦-١٠-٢٧) — للمتصفّح وحده (يستعمل canvas).
 *
 * كانت الصورُ تُرفع بمقاس الكاميرا (حتى ٣٨٤٠ بكسل و٣ ميغابايت) وتُعرض أصغرَ بكثير، فبلغت
 * الرئيسيّةُ ‎٨٫٦‎ ميغابايت على الجوّال وتأخّر كودُها خلفها (قياس Lighthouse). فصُغِّر ما في
 * التخزين مرّةً (‏‎٤١٫٧ ← ١٢٫٦‎ ميغابايت، والأصولُ محفوظةٌ في `Claude outputs/storage-backup-2026-10-27`)،
 * وهذا يمنع عودتها: يُحدّ أطولُ ضلعٍ بـ`rule.maxSide`، وتُكتب WEBP حيث يكتبها المتصفّح.
 *
 * - **لا يكسر شيئًا إن عجز:** صيغةٌ أخرى (GIF متحرّك) أو فكٌّ فاشل أو ناتجٌ أكبر ⇒ يُعاد الأصلُ كما هو.
 * - **سفاري لا يكتب WEBP** من canvas (يرجع PNG بصمت): يُفحص نوعُ الناتج، فيُكتب JPEG بدلها
 *   لمصدرٍ لا شفافيّة فيه، ويُترك الأصلُ لما فيه شفافيّة.
 * - **امتدادُ الاسم يتبع النوع:** المسارُ في الخادم يُشتقّ من النوع (`EXT_BY_MIME`/`IMAGE_EXT`)، والاسمُ
 *   يُصحَّح ليقول ما يقوله النوع.
 */
export async function shrinkImage(file: File, rule: UploadRule, quality = 0.82): Promise<File> {
  const max = rule.maxSide;
  if (!max || !/^image\/(jpeg|png|webp)$/.test(file.type) || typeof document === "undefined") return file;
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, quality));
  let blob = await encode("image/webp");
  if (!blob || blob.type !== "image/webp") blob = file.type === "image/png" ? null : await encode("image/jpeg");
  if (!blob || blob.size >= file.size) return file;
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return new File([blob], name, { type: blob.type, lastModified: file.lastModified });
}
