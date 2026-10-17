/**
 * **وجها رسائل أدِيب — للعرض لا للإرسال** (٢٠٢٦-١٠-١٧، مرحلةُ التصميم في `v2/EMAIL-SYSTEM.md`).
 *
 * الجولةُ الثانية. الأولى («الترويسة» و«الرسالة») ردّها محمد: «متواضعان جدًّا، أريد جمالًا يبقى بسيطًا».
 * فهذان يأخذان جمالَهما من الهويّة نفسِها لا من الزخرفة المكتوبة بالأنماط: النقشُ الخطّيّ، والختمُ
 * الدائريّ، والريشة، مخبوزةً صورًا (`scripts/mail-art.mjs`) تظهر في كلّ برنامجٍ كما هي.
 *
 * **ولكلّ رسالةٍ جهتُها** (طلب محمد): «إدارة الموارد البشرية» لبريد المناصب، و«قسم نظم المعلومات» لبريد
 * الدخول، وهكذا (`unit` في `EmailContent`). تظهر عنوانًا صغيرًا فوق الرسالة، وتوقيعًا في آخرها.
 *
 * يُعرضان في `/ui/emails`. والمُرسِلُ لا يقرأ هذا الملفّ إلّا لرسالة التجربة (`system.look_test`). فإذا
 * اختير وجهٌ حلّ محلَّ الثوب المؤقّت في `layout.ts`، وحُذف هذا الملفُّ ووجهُه الآخر.
 *
 * **قيودُ البريد** (لا ذوقُنا): جداولُ بأنماطٍ مضمَّنة، فـOutlook يُسقط الـflex وكثيرٌ يُسقط `<style>`.
 * والخطُّ «Lyon Arabic» يظهر في بريد أبل، ويسقط في Gmail على الحاسوب إلى خطّه. والصورُ PNG/JPEG، فـGmail
 * لا يعرض SVG. والألوانُ قيمٌ من سلّمَي العلامة في `tokens.css` حرفًا، فالبريدُ لا يقرأ متغيّراتنا.
 */
import { absoluteUrl, esc, SITE, type EmailContent } from "./layout";

export type Look = "ink" | "seal";

export const LOOKS: Record<Look, { name: string; idea: string }> = {
  ink: {
    name: "الحِبر",
    idea: "رأسٌ بتدرّج الهويّة يسري فيه النقشُ الخطّيّ همسًا ويحمل الشعار، ثمّ ورقةٌ بيضاء تبدأ باسم الجهة، وتنتهي بتوقيعها والريشة.",
  },
  seal: {
    name: "الختم",
    idea: "ورقةٌ بيضاء يتوسّطها ختمُ أدِيب الدائريّ، واسمُ الجهة بين خطّين، وحاشيةٌ من النقش الخطّيّ تختمها.",
  },
};

// سلّما العلامة (tokens.css): الكحليّ والفولاذيّ والمحايد.
const C = {
  navy900: "#16263a",
  navy700: "#274060",
  navy200: "#bcc9dc",
  navy100: "#dde3ed",
  navy50: "#eff2f7",
  steel600: "#335c81",
  steel400: "#5e88ab",
  n50: "#f6f7fa",
  n100: "#eceef2",
  n200: "#dce0e7",
  n500: "#6f7789",
  n600: "#545c6d",
  n700: "#414857",
  bg: "#eef1f6",
  white: "#ffffff",
};

const FONT = "font-family:'Lyon Arabic',Tahoma,Arial,sans-serif;";
const MONO = "font-family:'Courier New',Courier,monospace;";
const ART = `${SITE}/brand/mail`;

/** الخطُّ من موقعنا لمن يقبله، وهوامشُ أضيق على الجوّال لمن يقرأ `<style>`. */
const HEAD_STYLE = `<style>
@font-face{font-family:'Lyon Arabic';font-weight:400 600;src:url(${SITE}/fonts/lyon-arabic-medium.woff2) format('woff2');}
@font-face{font-family:'Lyon Arabic';font-weight:700 900;src:url(${SITE}/fonts/lyon-arabic-bold.woff2) format('woff2');}
@media (max-width:480px){.px{padding-left:24px!important;padding-right:24px!important}.wrap{padding:12px 6px!important}}
</style>`;

const lines = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

type Align = "right" | "center";
const cell = (inner: string, pad: string, style: string, align: Align = "right") =>
  `<tr><td class="px" dir="rtl" align="${align}" style="padding:${pad};${FONT}text-align:${align};${style}">${inner}</td></tr>`;

function shell(c: EmailContent, bg: string, card: string, after = ""): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(c.subject)}</title>${HEAD_STYLE}</head>
<body style="margin:0;padding:0;background:${bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};">
<tr><td class="wrap" align="center" style="padding:32px 16px;">
${card}
${after}
</td></tr>
</table>
</body>
</html>`;
}

// ══ ما يشترك فيه الوجهان ════════════════════════════════════════════════════

/** الرمزُ خاناتٌ منفصلة: يُقرأ رقمًا رقمًا ولا يلتبس، ويبقى نصًّا يُنسخ. */
function codeCells(code: string): string {
  const cells = [...code]
    .map(
      (ch) =>
        `<td style="padding:0 4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" width="44" height="56" style="width:44px;height:56px;border:1px solid ${C.navy200};border-radius:12px;background:${C.navy50};${MONO}font-size:28px;font-weight:bold;color:${C.navy700};">${esc(ch)}</td></tr></table></td>`,
    )
    .join("");
  return `<tr><td class="px" align="center" style="padding:24px 24px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" dir="ltr"><tr>${cells}</tr></table></td></tr>`;
}

function body(c: EmailContent, pad: number) {
  const paras = c.paragraphs
    .filter((p) => p.trim())
    .map((p) => cell(lines(p), `12px ${pad}px 0`, `color:${C.n700};font-size:16px;line-height:1.95;`))
    .join("");
  const quote = c.quote
    ? `<tr><td class="px" dir="rtl" style="padding:20px ${pad}px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.n50};border-right:3px solid ${C.steel400};border-radius:10px;"><tr><td dir="rtl" style="padding:14px 18px;${FONT}text-align:right;"><div style="color:${C.n500};font-size:12px;margin-bottom:6px;">${esc(c.quote.label)}</div><div style="color:${C.n600};font-size:15px;line-height:1.85;">${lines(c.quote.text)}</div></td></tr></table></td></tr>`
    : "";
  const code = c.code ? codeCells(c.code) : "";
  const signature = c.signature
    ? cell(lines(c.signature), `24px ${pad}px 0`, `color:${C.navy700};font-size:15px;font-weight:bold;line-height:1.85;`)
    : "";
  return { paras, quote, code, signature };
}

function button(c: EmailContent, align: Align, pad: number): string {
  if (!c.cta) return "";
  return `<tr><td class="px" align="${align}" style="padding:28px ${pad}px 0;text-align:${align};"><a href="${esc(absoluteUrl(c.cta.href))}" style="display:inline-block;background:${C.navy700};color:${C.white};text-decoration:none;${FONT}font-size:16px;font-weight:bold;padding:14px 34px;border-radius:12px;">${esc(c.cta.label)}</a></td></tr>`;
}

const UNIT_FALLBACK = "نادي أدِيب";

// ══ الوجه الأوّل: الحِبر ═════════════════════════════════════════════════════

function ink(c: EmailContent): string {
  const P = 40;
  const unit = c.unit ?? UNIT_FALLBACK;
  const { paras, quote, code, signature } = body(c, P);

  // اسمُ الجهة عنوانٌ صغيرٌ يسبقه خطٌّ فولاذيّ قصير في أوّل السطر.
  const eyebrow = `<tr><td class="px" dir="rtl" style="padding:30px ${P}px 0;"><table role="presentation" dir="rtl" cellpadding="0" cellspacing="0"><tr><td width="22" valign="middle" style="width:22px;"><div style="height:2px;line-height:2px;font-size:0;background:${C.steel400};border-radius:2px;">&nbsp;</div></td><td dir="rtl" style="padding-right:10px;${FONT}color:${C.steel600};font-size:13px;font-weight:bold;letter-spacing:.3px;">${esc(unit)}</td></tr></table></td></tr>`;

  const note = c.note
    ? cell(`<div style="border-top:1px solid ${C.n100};padding-top:16px;">${esc(c.note)}</div>`, `26px ${P}px 0`, `color:${C.n500};font-size:13px;line-height:1.85;`)
    : "";

  // التوقيع: الريشةُ ثمّ الجهةُ والنادي.
  const signOff = `<tr><td class="px" dir="rtl" style="padding:30px ${P}px 34px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.n100};"><tr><td style="padding-top:20px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="26" valign="middle" style="width:26px;"><img src="${SITE}/brand/quill-96.png" width="22" height="29" alt="" style="display:block;border:0;width:22px;height:29px;"></td><td dir="rtl" valign="middle" style="padding-right:10px;${FONT}text-align:right;"><div style="color:${C.navy700};font-size:14px;font-weight:bold;line-height:1.6;">${esc(unit)}</div><div style="color:${C.n500};font-size:12px;line-height:1.6;">نادي أدِيب، جامعة الملك فيصل</div></td></tr></table></td></tr></table></td></tr>`;

  const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border-radius:18px;">
<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${ART}/header-ink.jpg" width="600" alt="نادي أدِيب" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:18px 18px 0 0;"></td></tr>
${eyebrow}
${cell(esc(c.title), `10px ${P}px 2px`, `color:${C.navy900};font-size:25px;line-height:1.55;font-weight:bold;`)}
${paras}${quote}${code}${button(c, "right", P)}${note}${signature}
${signOff}
</table>`;

  const footer = `<p dir="rtl" style="margin:18px 0 0;${FONT}font-size:12px;line-height:1.9;color:${C.n500};text-align:center;"><a href="${SITE}" style="color:${C.n500};text-decoration:none;">adeeb.club</a></p>`;

  return shell(c, C.bg, card, footer);
}

// ══ الوجه الثاني: الختم ══════════════════════════════════════════════════════

function seal(c: EmailContent): string {
  const P = 44;
  const unit = c.unit ?? UNIT_FALLBACK;
  const { paras, quote, code, signature } = body(c, P);

  // اسمُ الجهة بين خطّين، في وسط الورقة.
  const rule = `<td valign="middle"><div style="height:1px;line-height:1px;font-size:0;background:${C.navy200};">&nbsp;</div></td>`;
  const eyebrow = `<tr><td class="px" style="padding:18px ${P}px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${rule}<td dir="rtl" align="center" style="padding:0 14px;white-space:nowrap;${FONT}color:${C.steel600};font-size:13px;font-weight:bold;" width="1">${esc(unit)}</td>${rule}</tr></table></td></tr>`;

  const note = c.note ? cell(esc(c.note), `22px ${P}px 0`, `color:${C.n500};font-size:13px;line-height:1.9;`, "center") : "";

  const card = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.white};border-radius:10px;border:1px solid ${C.n200};">
<tr><td align="center" style="padding:36px 24px 0;"><img src="${ART}/seal.png" width="144" height="144" alt="نادي أدِيب" style="display:block;border:0;width:144px;height:144px;"></td></tr>
${eyebrow}
${cell(esc(c.title), `18px ${P}px 4px`, `color:${C.navy900};font-size:26px;line-height:1.55;font-weight:bold;`, "center")}
${paras}${quote}${code}${button(c, "center", P)}${note}${signature}
${cell(`<div style="color:${C.navy700};font-size:14px;font-weight:bold;">${esc(unit)}</div><div style="color:${C.n500};font-size:12px;">نادي أدِيب، جامعة الملك فيصل</div>`, `34px ${P}px 14px`, "line-height:1.7;", "center")}
<tr><td align="center" style="padding:0 20px;font-size:0;line-height:0;"><img src="${ART}/ornament.png" width="560" alt="" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></td></tr>
${cell(`<a href="${SITE}" style="color:${C.n500};text-decoration:none;">adeeb.club</a>`, `12px ${P}px 26px`, `color:${C.n500};font-size:12px;line-height:1.8;`, "center")}
</table>`;

  return shell(c, C.n50, card);
}

/**
 * **بأيّ خطٍّ تُقرأ** — البريدُ لا يضمن خطَّنا، فالمعرضُ يُري الرسالةَ بما يحلّ محلَّه (طلب محمد ٢٠٢٦-١٠-١٧:
 * «أريد أن أرى الخطّ الذي سيُعرَض»). والرسالةُ المُرسَلة واحدةٌ في الثلاثة، والفرقُ في برنامج القارئ:
 * - `adeeb`: يقبل `@font-face` (بريدُ أبل): خطُّ أدِيب.
 * - `desktop`: يُسقطه وعلى الجهاز Tahoma (Gmail في متصفّح الحاسوب): Tahoma.
 * - `phone`: يُسقطه ولا Tahoma على الجهاز (تطبيقُ Gmail على الآيفون): خطُّ النظام العربيّ. ويُحاكى هنا
 *   بـ`system-ui`، فهو على الآيفون والماك خطُّ النظام نفسُه. وعلى أندرويد خطٌّ آخر (Noto) لا يُحاكى.
 */
export type FontView = "adeeb" | "desktop" | "phone";

export function renderLook(c: EmailContent, look: Look, font: FontView = "adeeb"): string {
  const html = look === "ink" ? ink(c) : seal(c);
  if (font === "adeeb") return html;
  const bare = html.replace(/@font-face\{[^}]*\}\n?/g, "");
  return font === "desktop"
    ? bare.replaceAll("'Lyon Arabic',", "")
    : bare.replaceAll("'Lyon Arabic',Tahoma,Arial,", "system-ui,");
}
