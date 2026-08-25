/**
 * الرموزُ الديناميكيّة — **المنطقُ الخالص**: توليدُ الرمز القصير، وتصديقُ الوجهة، وقراءةُ
 * بصمةِ العميل. بلا React وبلا Supabase وبلا `server-only`، فيقرؤه الخادمُ والمتصفّحُ
 * والاختبارُ من نسخةٍ واحدة.
 *
 * **ولماذا رمزٌ قصيرٌ أصلًا؟** لأنّ الرمزَ المطبوع لا يُعدَّل. فيحمل رابطَنا نحن، وتبقى
 * الوجهةُ صفًّا في القاعدة يُبدَّل متى شئنا، ويمرّ كلُّ قاصدٍ بنا فيُعَدّ. والملصقُ في
 * الشارع لا يتغيّر أبدًا.
 */

import { LINK_ALPHABET, codeShapeGuard, randomCode } from "@/lib/shortCode";

/**
 * أبجديّةُ الرمز — **بلا محرفٍ ملتبِس**: لا `0` ولا `o`، ولا `1` ولا `l` ولا `i`.
 * والرمزُ يُقرأ بالعين ويُملى بالصوت أحيانًا، فالالتباسُ فيه عطبٌ لا ذوق.
 * إحدى وثلاثون محرفًا في سبعة مواضع: سبعةٌ وعشرون مليارَ احتمال، فلا يُخمَّن بالتجريب.
 *
 * **والآليّةُ انتقلت إلى `lib/shortCode`** يومَ طلبتها رموزُ غرف اللعب؛ والاسمُ يبقى
 * هنا لأنّ مستوردَه لا شأنَ له بالانتقال. (سابقةُ `visitorHash` حين خرجت من ديبو.)
 */
export const QR_ALPHABET = LINK_ALPHABET;

/** طولُ الرمز. يطابق قيدَ `code` في القاعدة، وتبديلُه يقتضي ترحيلًا. */
export const QR_CODE_LEN = 7;

/** أقصى طولٍ لاسم الرمز — يطابق قيدَ `title`. */
export const QR_TITLE_MAX = 120;

/** هل هذا رمزٌ صالحُ الشكل؟ يُسأل قبل أيّ نداءِ قاعدة، فالخُردةُ تُردّ بلا استعلام. */
export const isQrCode = codeShapeGuard(QR_CODE_LEN, QR_ALPHABET);

/**
 * رمزٌ جديد من عشوائيّةِ التعمية لا من `Math.random`: الأخيرةُ تُتوقَّع من مخرجاتها،
 * ورمزٌ متوقَّعٌ يعني أنّ الغريب يعدّ مسحاتِ ملصقاتنا ويقرأ وجهاتِها قبل نشرها.
 */
export function newQrCode(): string {
  return randomCode(QR_CODE_LEN, QR_ALPHABET);
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
/** عنوانُ الجهاز نفسِه: يقرؤه كلُّ جهازٍ على أنّه هو، فلا يصل إليه أحدٌ سواك. */
function isLoopback(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h === "0.0.0.0") return true;
  return /^127\./.test(h);
}

/**
 * **عنوانٌ لا يغادر الشبكة**: نطاقاتُ العناوين الخاصّة (`10.x` و`172.16‑31` و`192.168`)،
 * وعناوينُ الوصلة (`169.254`)، وأسماءُ `‎.local` التي تُعلنها الأجهزةُ على الشبكة نفسِها.
 *
 * وكانت مقبولةً بحجّة أنّها «طريقُ التجربة من هاتفٍ حقيقيّ»، فرُدّت بأمر المالك
 * ٢٠٢٥-٠٨-٢٥: الباركودُ يُطبَع ليمسحه **غريبٌ في مكانٍ آخر**، وعنوانٌ لا يصل إليه إلّا من
 * كان على شبكتك ليس وجهةً تُطبَع بالألف.
 */
function isPrivateNetwork(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h.endsWith(".local")) return true;
  if (/^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return true;
  return /^172\.(1[6-9]|2\d|3[01])\./.test(h);
}

/**
 * **اسمُ موقعٍ مكتمل**: لبِنتان فأكثر، وآخرتُها امتدادٌ حقيقيّ (حرفان فأكثر من الحروف، أو
 * لبِنةُ `xn--` للنطاقات العربيّة بعد ترميزها).
 *
 * وكان الفحصُ «هل فيه نقطة؟»، فمرّ `‎https://adeeb.` بنقطةٍ في آخره ولا امتدادَ بعدها
 * (رآه المالك). واللبِنةُ الفارغةُ تسقط هنا، ومعها اسمٌ آخرُه رقمٌ أو شرطة.
 */
function hasRealTld(host: string): boolean {
  const labels = host.toLowerCase().split(".");
  if (labels.length < 2) return false;
  if (labels.some((l) => l === "")) return false;
  const tld = labels[labels.length - 1];
  return /^[a-z]{2,}$/.test(tld) || /^xn--[a-z0-9-]{2,}$/.test(tld);
}

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
  /**
   * **سببان، رسالتان.** كانت الحالتان تخرجان برسالةٍ واحدة («اسمُ الموقع غيرُ مكتمل»)،
   * وهي تصدق في الناقص وتكذب في عنوان الجهاز: من كتب `localhost` اسمُه عنده مكتملٌ صحيح،
   * وعلّتُه أنّه **لا يعني شيئًا في هاتفٍ آخر**. فبحث عن حرفٍ نسيه ولم ينسَ حرفًا.
   */
  if (isLoopback(url.hostname)) {
    return { ok: false, message: "هذا عنوانُ جهازك نفسِه ولا أحد يستطيع الوصول إليه غيرك." };
  }
  if (isPrivateNetwork(url.hostname)) {
    return { ok: false, message: "هذا عنوانٌ في شبكتك ولا يصل إليه أحدٌ من خارجها." };
  }
  if (!hasRealTld(url.hostname)) {
    return { ok: false, message: "اسمُ الموقع غيرُ مكتمل: يلزمه امتدادٌ مثل ‎.club أو ‎.com" };
  }

  let self: string | null = null;
  try {
    self = new URL(origin).hostname;
  } catch {
    self = null;
  }
  if (self && url.hostname === self && url.pathname.startsWith("/q/")) {
    return { ok: false, message: "هذا رابط لباركود آخر." };
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

/**
 * **وجهةُ الرمز مختصرةً إلى اسم موقعها** — نظيرُ `referrerHost` لسؤالٍ معاكس: ذاك «من أين
 * جاء» وهذا «إلى أين يذهب». والحاجةُ إليه من الكرت (٢٠٢٦-٠٨-٢٥): عرضُه ٣٩٠ ورابطُ نموذجٍ
 * من قوقل يزيد على مئةٍ وثلاثين محرفًا، فيلتفّ ستّةَ أسطرٍ ويُغرق الكرتَ في مسارٍ لا يُقرأ.
 * والمضيفُ وحده يجيب. والرابطُ الكامل باقٍ في الجدول وفي صفحة الرمز.
 */
export function targetHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url.replace(/^https?:\/\//, "");
  }
}
