/**
 * الرموزُ الديناميكيّة — **المنطقُ الخالص**: توليدُ الرمز القصير، وتصديقُ الوجهة، وقراءةُ
 * بصمةِ العميل. بلا React وبلا Supabase وبلا `server-only`، فيقرؤه الخادمُ والمتصفّحُ
 * والاختبارُ من نسخةٍ واحدة.
 *
 * **ولماذا رمزٌ قصيرٌ أصلًا؟** لأنّ الرمزَ المطبوع لا يُعدَّل. فيحمل رابطَنا نحن، وتبقى
 * الوجهةُ صفًّا في القاعدة يُبدَّل متى شئنا، ويمرّ كلُّ قاصدٍ بنا فيُعَدّ. والملصقُ في
 * الشارع لا يتغيّر أبدًا.
 */

/**
 * أبجديّةُ الرمز — **بلا محرفٍ ملتبِس**: لا `0` ولا `o`، ولا `1` ولا `l` ولا `i`.
 * والرمزُ يُقرأ بالعين ويُملى بالصوت أحيانًا، فالالتباسُ فيه عطبٌ لا ذوق.
 * إحدى وثلاثون محرفًا في سبعة مواضع: سبعةٌ وعشرون مليارَ احتمال، فلا يُخمَّن بالتجريب.
 */
export const QR_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

/** طولُ الرمز. يطابق قيدَ `code` في القاعدة، وتبديلُه يقتضي ترحيلًا. */
export const QR_CODE_LEN = 7;

/** أقصى طولٍ لاسم الرمز — يطابق قيدَ `title`. */
export const QR_TITLE_MAX = 120;

const CODE_RE = new RegExp(`^[${QR_ALPHABET}]{${QR_CODE_LEN}}$`);

/** هل هذا رمزٌ صالحُ الشكل؟ يُسأل قبل أيّ نداءِ قاعدة، فالخُردةُ تُردّ بلا استعلام. */
export function isQrCode(code: string): boolean {
  return CODE_RE.test(code);
}

/**
 * رمزٌ جديد من عشوائيّةِ التعمية لا من `Math.random`: الأخيرةُ تُتوقَّع من مخرجاتها،
 * ورمزٌ متوقَّعٌ يعني أنّ الغريب يعدّ مسحاتِ ملصقاتنا ويقرأ وجهاتِها قبل نشرها.
 */
export function newQrCode(): string {
  const bytes = new Uint8Array(QR_CODE_LEN);
  crypto.getRandomValues(bytes);
  let out = "";
  // القسمةُ الباقيةُ تُميل الاحتمالَ ميلًا طفيفًا (٢٥٦ لا تقبل القسمة على ٣١)، وهو هنا
  // مقبول: الرمزُ معرّفٌ لا سرٌّ تعمويّ، والانحيازُ لا يُقصّر مساحةَ التخمين عمليًّا.
  for (const b of bytes) out += QR_ALPHABET[b % QR_ALPHABET.length];
  return out;
}

/** مسارُ الرمز في موقعنا. مصدرٌ واحد: يقرؤه المولّدُ والمسارُ العلنيّ والاختبار. */
export const qrPath = (code: string): string => `/q/${code}`;

/** أصلُ الموقع كما يُبنى منه الرابطُ المطبوع. الافتراضُ نفسُه المستعمَل في `metadataBase`. */
export const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://adeeb.club";

/** الرابطُ الذي يُحفَر في الرمز. */
export const qrShortUrl = (code: string, origin: string = SITE_ORIGIN): string =>
  `${origin.replace(/\/+$/, "")}${qrPath(code)}`;

export type TargetCheck = { ok: true; url: string } | { ok: false; message: string };

/**
 * **تصديقُ الوجهة — لا تحويلَ مفتوح.**
 *
 * رمزٌ يحمل اسمَ أديب ويسوق ماسحَه إلى حيثُ شاء كاتبُه أداةُ تصيّدٍ نوقّعها بختمنا.
 * فالبروتوكولان وحدهما، ولا `javascript:` ولا `data:`. والقيدُ في القاعدة شبكةُ
 * أمانٍ أخيرة تحت هذا، لا بديلًا عنه.
 *
 * ويُردّ أيضًا رابطُ رمزٍ من رموزنا: رمزٌ يشير إلى رمزٍ يشير إليه دورةٌ لا تنتهي.
 */
export function checkTarget(raw: string, origin: string = SITE_ORIGIN): TargetCheck {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "اكتب وجهةَ الباركود." };
  if (trimmed.length > 2000) return { ok: false, message: "الوجهةُ أطولُ ممّا يُقبَل." };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    /* عازلا الاتّجاه (`\u2066` و`\u2069`) حول الرابط: بلا عزلٍ تُلحق الخوارزميّةُ ثنائيّةُ
       الاتّجاه محايداتِ «‏://» بالسياق العربيّ فترميها يسارَ الحروف، فيُقرأ الرمزُ مقلوبًا
       («‏://https»). ورُئي مقلوبًا في الحقل يوم صار الحقلُ لا يقبل إلّا رابطًا. */
    return { ok: false, message: "هذا ليس رابطًا صالحًا. المفترض أن يبدأ بـ \u2066https://\u2069" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, message: "الوجهةُ تكون رابطَ https أو http لا غير." };
  }
  if (!url.hostname.includes(".")) {
    return { ok: false, message: "اسمُ الموقع غيرُ مكتمل." };
  }

  let self: string | null = null;
  try {
    self = new URL(origin).hostname;
  } catch {
    self = null;
  }
  if (self && url.hostname === self && url.pathname.startsWith("/q/")) {
    return { ok: false, message: "لا يشير الباركود إلى باركودٍ آخر: تلك دورةٌ لا تنتهي." };
  }

  return { ok: true, url: url.toString() };
}

/* ── قراءةُ العميل ──────────────────────────────────────────────────────── */

export type QrDevice = "mobile" | "tablet" | "desktop" | "unknown";

/**
 * **الآلةُ تُفصَل عن الإنسان.** معاينةُ الروابط في واتساب وتويتر وفيسبوك تفتح الرابطَ
 * لتقرأ عنوانَه، ورقيبُ الشبكة كذلك. ولو عُدَّت لصار عدّادُ ملصقٍ لم يره أحدٌ عشرةً في
 * دقيقة، وهو أسوأُ من ألّا نعدّ: رقمٌ يُصدَّق وهو كاذب.
 *
 * والوسمُ لا يحذف الصفَّ بل يستثنيه من الرقم الظاهر: قائمةُ الأسماء تخطئ أحيانًا،
 * والصفُّ المحفوظ يُراجَع والمحذوفُ لا يعود.
 */
export function isBotAgent(ua: string | null): boolean {
  if (!ua) return true; // ماسحٌ بلا بصمةِ عميل ليس هاتفًا: كلُّ كاميرا تُعرّف نفسَها
  const s = ua.toLowerCase();
  return /bot|crawler|spider|crawl|slurp|preview|fetch|curl|wget|python|axios|headless|monitor|whatsapp|telegram|facebookexternalhit|twitterbot|discord|slackbot|linkedinbot|embedly|pingdom|uptime|lighthouse|vercel|screenshot/.test(s);
}

/** الجهازُ من بصمة العميل. تصنيفٌ خشنٌ بثلاثِ خاناتٍ يكفي سؤالَ «من أين يُمسح؟». */
export function deviceFrom(ua: string | null): QrDevice {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s)) return "mobile";
  if (/windows|macintosh|linux|cros/.test(s)) return "desktop";
  return "unknown";
}

/**
 * المُحيلُ مختصرًا إلى اسم موقعه. الرابطُ الكامل يحمل معاملاتٍ لا تعني القارئ وقد تحمل
 * ما لا يُشتهى نقلُه، والاسمُ وحدَه يجيب: من أين جاء؟
 */
export function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}
