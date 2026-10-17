/**
 * **ثوبُ رسائل أدِيب: «ديبو»** — قالبٌ واحدٌ تلبسه كلُّ رسالة، وكلُّ نوعٍ يكتب محتواه فقط (`kinds.ts`).
 *
 * **اعتمده محمد ٢٠٢٦-١٠-١٧** في الجولة الرابعة من التصميم («جدًّا أهنّئك على فكرة ديبو، واو»)، بعد ثلاث
 * جولاتٍ رُدّت: الترويسةُ والرسالة («متواضعان»)، والحِبرُ والختمُ بالنقش («سيّئة»)، واللوحُ والميزانُ بسُلّم
 * الخطّ وحده («الأسوأ»). ووصفُه لما يريد: **«واضحٌ يسرد البيانات ببساطة، بقوّةٍ تصميميّة».**
 *
 * فالرسالةُ لحظةٌ واحدةٌ صريحة ثمّ هدوء:
 * - **ديبو يقدّمها بمزاجها** (`mood`: واثقٌ يحرس الرمز، يحتفل بالمنصب، يكتب الردّ)، كما تفعل Duolingo
 *   ببومتها، والعنوانُ في فقاعة كلامه. و**الجهةُ المسؤولة** (`unit`، طلب محمد) في ختام الرسالة.
 * - ثمّ بطاقةٌ بيضاء هادئة: التحيّة، والرمزُ أو **البياناتُ سطورًا** (`facts`)، وزرٌّ واحد، وتوقيعُ الجهة.
 *
 * **قيودُ البريد** (لا ذوقُنا): جداولُ بأنماطٍ مضمَّنة، فـOutlook يُسقط الـflex وكثيرٌ يُسقط `<style>`.
 * والصورُ PNG (`public/deebo/mail`، يخبزها `scripts/mail-art.mjs`)، فـGmail لا يعرض SVG وOutlook لا يعرض
 * WebP. والخطُّ «Lyon Arabic» يظهر في بريد أبل، ويسقط في Gmail إلى خطّه (والمعرضُ `/ui/emails` يُري
 * الحالين). والكلامُ كلُّه نصٌّ يُنسخ ويُقرأ ويبقى إن حُجبت الصور. والألوانُ قيمٌ من سلّمَي العلامة في
 * `tokens.css` مكتوبةً حرفًا، فالبريدُ لا يقرأ متغيّراتنا، وهذا الملفُّ وحدَه يُستثنى من قاعدة الهيكس.
 *
 * **ولماذا التحيّةُ والتوقيع في كلّ رسالة**: تجربةُ ٢٠٢٦-١٠-١٧ في Gmail محمد: رسالةٌ قصيرةٌ بزرٍّ كبيرٍ
 * بلا تحيّةٍ ولا توقيع وقعت في «الترويجيّة»، ورسالةٌ فيها تحيّةٌ ونصٌّ شخصيٌّ وتوقيعٌ وقعت في «الوارد».
 * Gmail يحكم على الكلام لا على الصور.
 *
 * وكلُّ ما يدخل الرسالةَ من الحقائق يُهرَّب: الأسماءُ والعناوين كتبها بشر.
 */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://adeeb.club").replace(/\/+$/, "");

/**
 * وجوهُ ديبو في البريد. أسماؤها أسماءُ ملفّاتها في `public/deebo` (ومنها تُخبز نسخُ البريد PNG).
 * ولكلٍّ حالٌ يقولها، لا قرعة (سُنّةُ `lib/deebo/mood.ts`).
 */
export const MAIL_MOODS = {
  confident: "ديبو واثقٌ مكتوفُ الذراعين",
  "customer-support": "ديبو بسمّاعة الدعم",
  explaining: "ديبو يشرح",
  welcome: "ديبو يفتح ذراعيه مرحّبًا",
  congratulations: "ديبو يحتفل",
  announcement: "ديبو يُعلن بمكبّر الصوت",
  writing: "ديبو يكتب بالريشة",
  reminder: "ديبو يُنبّه",
  "thumbs-up": "ديبو يرفع إبهامه",
} as const;

export type MailMood = keyof typeof MAIL_MOODS;

export type Fact = { label: string; value: string; ltr?: boolean };

export type EmailContent = {
  subject: string;
  /** العنوانُ في فقاعة ديبو. والأصلُ أنّه الموضوعُ نفسُه. */
  title: string;
  /** فِقَرٌ نصّيّة، كلٌّ في سطر. وسطورُ الفقرة الواحدة تبقى سطورًا (نصٌّ كتبه إنسان). */
  paragraphs: string[];
  /** اقتباسٌ في إطار: نصُّ رسالةٍ يُردّ عليها، تحت عنوانٍ صغير. */
  quote?: { label: string; text: string } | null;
  /** التوقيعُ الشخصيّ («مع التحيّة، …»)، قبل توقيع الجهة. */
  signature?: string | null;
  /** رمزٌ يُعرَض بارزًا (رمزُ الدخول). أرقامٌ لاتينيّة. */
  code?: string | null;
  /** زرٌّ واحد: نصُّه ووِجهتُه (مسارٌ داخليّ أو رابطٌ كامل). */
  cta?: { label: string; href: string } | null;
  /** سطرٌ صغيرٌ تحت الزرّ («إن لم تطلبه فتجاهله»). */
  note?: string | null;
  /** **مزاجُ ديبو** في الرسالة. والأصلُ أنّه يُعلن. */
  mood?: MailMood;
  /**
   * **الجهةُ المسؤولة عن الرسالة** (طلب محمد ٢٠٢٦-١٠-١٧): «إدارة الموارد البشرية» لبريد المناصب، و«قسم
   * نظم المعلومات» لبريد الدخول. تظهر توقيعًا في ختام الرسالة.
   */
  unit?: string | null;
  /**
   * **البياناتُ سطورًا** (طلب محمد: «يسرد البيانات ببساطة»): عنوانٌ وقيمته، كالمنصب والتاريخ ومدّة
   * الصلاحية. و`ltr` لقيمةٍ لاتينيّة (بريدٌ، رابط) تُعزَل باتّجاهها.
   */
  facts?: Fact[] | null;
};

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function absoluteUrl(href: string): string {
  return /^https?:\/\//.test(href) ? href : `${SITE}${href.startsWith("/") ? "" : "/"}${href}`;
}

// سلّما العلامة (tokens.css): الكحليّ والفولاذيّ والمحايد.
const C = {
  navy900: "#16263a",
  navy800: "#1e3350",
  navy700: "#274060",
  navy500: "#456691",
  navy100: "#dde3ed",
  steel600: "#335c81",
  steel400: "#5e88ab",
  steel200: "#bccfe0",
  steel100: "#dce5ef",
  steel50: "#eef3f8",
  n100: "#eceef2",
  n500: "#6f7789",
  n600: "#545c6d",
  n700: "#414857",
  tile: "#f5f7fb",
  tileLine: "#e4e9f1",
  white: "#ffffff",
};

const FONT = "font-family:'Lyon Arabic',Tahoma,Arial,sans-serif;";
const LATIN = "font-family:Arial,Helvetica,sans-serif;";
/** سطرُ الحقوق في الختام (قرار محمد ٢٠٢٦-١٠-١٧: «أزِل جامعة الملك فيصل، وضع جميع الحقوق محفوظة لنادي أدِيب»). */
const RIGHTS = "جميع الحقوق محفوظة لنادي أدِيب";
const P = 36;

/**
 * **الصنعة: «النهار» بفقاعة الكلام** (الجولة الخامسة، ٢٠٢٦-١٠-١٧). قال محمد في «ديبو» الأولى: «الهيكلُ رائعٌ
 * جدًّا، والتصميمُ بدائيٌّ جدًّا». فبقي الهيكل ورُفعت الصنعة في تنفيذين، «الليل» برأسٍ كحليّ و«النهار» برأسٍ
 * فاتح، فاختار «النهار» («جميلٌ جدًّا، رائعٌ صراحة») وطلب أن تعود **فقاعةُ الكلام** من الأولى: «كانت جدًّا رائعة».
 */
/** الخطُّ من موقعنا لمن يقبله، وهوامشُ أضيق على الجوّال لمن يقرأ `<style>`. */
const HEAD_STYLE = `<style>
@font-face{font-family:'Lyon Arabic';font-weight:400 600;src:url(${SITE}/fonts/lyon-arabic-medium.woff2) format('woff2');}
@font-face{font-family:'Lyon Arabic';font-weight:700 900;src:url(${SITE}/fonts/lyon-arabic-bold.woff2) format('woff2');}
@media (max-width:480px){.px{padding-left:20px!important;padding-right:20px!important}.wrap{padding:12px 6px!important}.hero-t{font-size:19px!important}.deebo{width:116px!important;height:116px!important}.deebo-td{width:116px!important}.hero{padding:16px 8px 0 12px!important}.bub{padding:14px 16px!important}.digit{width:38px!important;height:50px!important;font-size:24px!important}}
</style>`;

/** سطرٌ في النصّ يبقى سطرًا في الرسالة. */
const lines = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

const cell = (inner: string, pad: string, style: string, align: "right" | "center" = "right") =>
  `<tr><td class="px" dir="rtl" align="${align}" style="padding:${pad};${FONT}text-align:${align};${style}">${inner}</td></tr>`;

const factValue = (f: Fact) =>
  f.ltr ? `<span dir="ltr" style="${LATIN}unicode-bidi:isolate;">${esc(f.value)}</span>` : esc(f.value);

/** البياناتُ بلاطاتٌ متجاورة: عنوانٌ صغيرٌ فوق قيمةٍ كبيرة، اثنتين في السطر، والوترُ يأخذ السطرَ كلَّه. */
function factTiles(facts: Fact[]): string {
  const tile = (f: Fact, span = 1) =>
    `<td dir="rtl" valign="top" colspan="${span}" width="${span === 2 ? "100%" : "50%"}" style="padding:5px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td dir="rtl" style="background:${C.tile};border:1px solid ${C.tileLine};border-radius:14px;padding:14px 16px;${FONT}text-align:right;"><div style="color:${C.steel600};font-size:12px;font-weight:bold;line-height:1.6;">${esc(f.label)}</div><div style="color:${C.navy900};font-size:17px;font-weight:bold;line-height:1.55;">${factValue(f)}</div></td></tr></table></td>`;
  const rows: string[] = [];
  for (let i = 0; i < facts.length; i += 2) {
    rows.push(facts[i + 1] ? `<tr>${tile(facts[i])}${tile(facts[i + 1])}</tr>` : `<tr>${tile(facts[i], 2)}</tr>`);
  }
  return `<tr><td class="px" style="padding:18px ${P - 5}px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table></td></tr>`;
}

/** الرمزُ خاناتٌ كحليّة بأرقامٍ بيضاء: يُقرأ رقمًا رقمًا، ويبقى نصًّا يُنسخ. */
function codeTiles(code: string): string {
  const digits = [...code]
    .map(
      (ch) =>
        `<td style="padding:0 3px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td class="digit" align="center" valign="middle" width="46" height="60" style="width:46px;height:60px;background:${C.navy800};background-image:linear-gradient(160deg,${C.navy500},${C.navy900});border-radius:12px;${LATIN}font-size:28px;font-weight:bold;color:${C.white};">${esc(ch)}</td></tr></table></td>`,
    )
    .join("");
  return `<tr><td class="px" align="center" style="padding:24px 16px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" dir="ltr"><tr>${digits}</tr></table></td></tr>`;
}

function body(c: EmailContent, unit: string): string {
  const [first, ...rest] = c.paragraphs.filter((p) => p.trim());
  // السطرُ الأوّل تحيّةٌ بالاسم: يُكتب أثقلَ ما في الجسد، فالرسالةُ إلى إنسان.
  const greet = first ? cell(lines(first), `32px ${P}px 0`, `color:${C.navy900};font-size:18px;font-weight:bold;line-height:1.7;`) : "";
  const paras = rest.map((p) => cell(lines(p), `8px ${P}px 0`, `color:${C.n700};font-size:16px;line-height:1.95;`)).join("");

  const quote = c.quote
    ? `<tr><td class="px" dir="rtl" style="padding:20px ${P}px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td dir="rtl" style="background:${C.steel50};border-right:3px solid ${C.steel400};border-radius:14px;padding:16px 20px;${FONT}text-align:right;"><div style="color:${C.steel600};font-size:12px;font-weight:bold;margin-bottom:6px;">${esc(c.quote.label)}</div><div style="color:${C.n600};font-size:15px;line-height:1.85;">${lines(c.quote.text)}</div></td></tr></table></td></tr>`
    : "";

  const button = c.cta
    ? `<tr><td class="px" style="padding:26px ${P}px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:${C.navy700};background-image:linear-gradient(135deg,${C.steel400},${C.navy800});border-radius:14px;"><a href="${esc(absoluteUrl(c.cta.href))}" style="display:block;padding:17px 20px;${FONT}font-size:17px;font-weight:bold;color:${C.white};text-decoration:none;text-align:center;">${esc(c.cta.label)}</a></td></tr></table></td></tr>`
    : "";

  const note = c.note ? cell(esc(c.note), `20px ${P}px 0`, `color:${C.n500};font-size:13px;line-height:1.85;`) : "";
  const signature = c.signature
    ? cell(lines(c.signature), `24px ${P}px 0`, `color:${C.navy700};font-size:15px;font-weight:bold;line-height:1.85;`)
    : "";

  // ختمُ الرسالة: شريطٌ هادئٌ بالجهة والنادي، والشعارُ الملوّن في آخره.
  const signOff = `<tr><td style="padding:32px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="px" style="background:${C.tile};border-top:1px solid ${C.tileLine};padding:18px ${P}px;border-radius:0 0 24px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td dir="rtl" valign="middle" style="${FONT}text-align:right;color:${C.n500};font-size:12px;line-height:1.8;"><span style="color:${C.navy700};font-size:13px;font-weight:bold;">${esc(unit)}</span><br>${RIGHTS}</td>
<td width="76" align="left" valign="middle" style="width:76px;"><img src="${SITE}/brand/logo-horizontal.png" width="76" height="45" alt="نادي أدِيب" style="display:block;border:0;width:76px;height:45px;"></td>
</tr></table></td></tr></table></td></tr>`;

  return `${greet}${paras}${c.code ? codeTiles(c.code) : ""}${c.facts?.length ? factTiles(c.facts) : ""}${quote}${button}${note}${signature}${signOff}`;
}

/**
 * الرأس: سماءٌ فاتحةٌ بتدرّج الفولاذيّ، وديبو في هالته **على اليمين** (أوّلُ ما تقع عليه العينُ العربيّة،
 * قرار محمد ٢٠٢٦-١٠-١٧: «أغلبُ مستخدمينا بالعربيّة»)، وفقاعةُ كلامه البيضاء إلى يساره وطرفُها المدبّبُ نحوه،
 * فيها العنوانُ وحده (أُزيلت منها شارةُ الجهة بقرار محمد، والجهةُ في ختام الرسالة). والجدولُ يُصرَّح باتّجاهه (`dir="rtl"`) فلا يقلبه برنامجٌ أسقط اتّجاهَ الصفحة.
 * والتدرّجُ فوق لونٍ صلبٍ يبقى لمن يُسقطه.
 */
function hero(c: EmailContent, mood: MailMood): string {
  return `<tr><td class="hero" style="background:${C.steel50};background-image:linear-gradient(180deg,${C.steel100} 0%,${C.steel50} 60%,${C.white} 100%);border-radius:24px 24px 0 0;padding:22px 16px 0 20px;">
<table role="presentation" dir="rtl" width="100%" cellpadding="0" cellspacing="0"><tr>
<td class="deebo-td" width="180" valign="bottom" style="width:180px;font-size:0;line-height:0;padding-left:4px;"><img class="deebo" src="${SITE}/deebo/mail/${mood}.png" width="180" height="180" alt="${MAIL_MOODS[mood]}" style="display:block;border:0;width:180px;height:180px;"></td>
<td dir="rtl" valign="middle" style="padding:0 0 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="bub" dir="rtl" style="background:${C.white};border:1px solid ${C.steel100};border-radius:22px 22px 4px 22px;padding:18px 22px;${FONT}text-align:right;">
    <div class="hero-t" style="color:${C.navy900};font-size:22px;font-weight:bold;line-height:1.5;">${esc(c.title)}</div>
  </td></tr></table>
</td>
</tr></table></td></tr>`;
}

export function renderLayout(c: EmailContent): { html: string; text: string } {
  const unit = c.unit?.trim() || "نادي أدِيب";
  const mood = c.mood ?? "announcement";
  const page = C.steel50;

  const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border-radius:24px;">
${hero(c, mood)}
${body(c, unit)}
</table>`;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title>${HEAD_STYLE}</head>
<body style="margin:0;padding:0;background:${page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${page};">
<tr><td class="wrap" align="center" style="padding:32px 16px;">
${card}
<p dir="ltr" style="margin:16px 0 0;${LATIN}font-size:12px;color:${C.n500};text-align:center;"><a href="${SITE}" style="color:${C.n500};text-decoration:none;">adeeb.club</a></p>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    unit,
    c.title,
    "",
    ...c.paragraphs.filter((p) => p.trim()),
    ...(c.facts ?? []).map((f) => `${f.label}: ${f.value}`),
    c.quote ? `\n${c.quote.label}:\n${c.quote.text}\n` : "",
    c.code ? `\n${c.code}\n` : "",
    c.cta ? `${c.cta.label}: ${absoluteUrl(c.cta.href)}` : "",
    c.note ?? "",
    c.signature ? `\n${c.signature}` : "",
    "",
    unit,
    RIGHTS,
    "adeeb.club",
  ].filter((x, i, a) => x !== "" || (i > 0 && a[i - 1] !== "")).join("\n");

  return { html, text };
}

/**
 * **بأيّ خطٍّ تُقرأ** — البريدُ لا يضمن خطَّنا، فالمعرضُ (`/ui/emails`) يُري الرسالةَ بما يحلّ محلَّه
 * (طلب محمد ٢٠٢٦-١٠-١٧: «أريد أن أرى الخطّ الذي سيُعرَض»). والرسالةُ المُرسَلة واحدةٌ في الثلاثة:
 * - `adeeb`: يقبل `@font-face` (بريدُ أبل): خطُّ أدِيب.
 * - `desktop`: يُسقطه وعلى الجهاز Tahoma (Gmail في متصفّح الحاسوب): Tahoma.
 * - `phone`: يُسقطه ولا Tahoma على الجهاز (تطبيقُ Gmail على الآيفون): خطُّ النظام العربيّ، يُحاكى بـ
 *   `system-ui`. وعلى أندرويد خطٌّ آخر (Noto) لا يُحاكى.
 */
export type FontView = "adeeb" | "desktop" | "phone";

export function asSeenIn(html: string, font: FontView): string {
  if (font === "adeeb") return html;
  const bare = html.replace(/@font-face\{[^}]*\}\n?/g, "");
  return font === "desktop" ? bare.replaceAll("'Lyon Arabic',", "") : bare.replaceAll("'Lyon Arabic',Tahoma,Arial,", "system-ui,");
}
