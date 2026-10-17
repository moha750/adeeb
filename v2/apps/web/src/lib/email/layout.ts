/**
 * **ثوبُ رسائل أدِيب** — قالبٌ واحدٌ تلبسه كلُّ رسالة، وكلُّ نوعٍ يكتب نصَّه فقط (`kinds.ts`).
 *
 * جدولٌ بأنماطٍ مضمَّنة: البريدُ لا يقرأ أوراقَنا ولا متغيّراتها، وOutlook يُسقط `<style>` والـflex.
 * والألوانُ لذلك حرفيّةٌ هنا وحدها في المستودع. **والتصميمُ مؤقّت**: مرحلةُ التصميم تعرض الوجوه على
 * `/ui` قبل البناء، وحينها يُبدَّل هذا الملفُّ وحده.
 *
 * وكلُّ ما يدخل الرسالةَ من الحقائق يُهرَّب: الأسماءُ والعناوين كتبها بشر.
 */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://adeeb.club").replace(/\/+$/, "");

export type EmailContent = {
  subject: string;
  /** العنوانُ الكبير في الرسالة. والأصلُ أنّه الموضوعُ نفسُه. */
  title: string;
  /** فِقَرٌ نصّيّة، كلٌّ في سطر. وسطورُ الفقرة الواحدة تبقى سطورًا (نصٌّ كتبه إنسان). */
  paragraphs: string[];
  /** اقتباسٌ في إطار: نصُّ رسالةٍ يُردّ عليها، تحت عنوانٍ صغير. */
  quote?: { label: string; text: string } | null;
  /** التوقيعُ في آخر الرسالة («مع التحيّة، …»). */
  signature?: string | null;
  /** رمزٌ يُعرَض بارزًا (رمزُ الدخول). أرقامٌ لاتينيّة. */
  code?: string | null;
  /** زرٌّ واحد: نصُّه ووِجهتُه (مسارٌ داخليّ أو رابطٌ كامل). */
  cta?: { label: string; href: string } | null;
  /** سطرٌ صغيرٌ تحت الزرّ (عمرُ الرابط، أو «إن لم تطلبه فتجاهله»). */
  note?: string | null;
  /**
   * **وجهٌ من وجهي التصميم بدل هذا الثوب** — لرسالة تجربة الوجهين وحدها (`system.look_test`)، كي يراهما
   * محمد في صندوقه لا في المعرض فقط. مؤقّتٌ: يُحذف مع `looks.ts` حين يُختار الوجه.
   */
  look?: "band" | "letter";
};

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function absoluteUrl(href: string): string {
  return /^https?:\/\//.test(href) ? href : `${SITE}${href.startsWith("/") ? "" : "/"}${href}`;
}

const FONT = "font-family:Tahoma,Arial,sans-serif;";

/** سطرٌ في النصّ يبقى سطرًا في الرسالة. */
const lines = (s: string) => esc(s).replace(/\r?\n/g, "<br>");

export function renderLayout(c: EmailContent): { html: string; text: string } {
  const paras = c.paragraphs
    .filter((p) => p.trim())
    .map((p) => `<tr><td dir="rtl" style="padding:8px 32px 0;${FONT}text-align:right;color:#475569;font-size:16px;line-height:1.9;">${lines(p)}</td></tr>`)
    .join("");
  const quote = c.quote
    ? `<tr><td dir="rtl" style="padding:20px 32px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;"><tr><td dir="rtl" style="padding:14px 18px;${FONT}text-align:right;"><div style="color:#64748b;font-size:12px;margin-bottom:6px;">${esc(c.quote.label)}</div><div style="color:#475569;font-size:14px;line-height:1.8;">${lines(c.quote.text)}</div></td></tr></table></td></tr>`
    : "";
  const signature = c.signature
    ? `<tr><td dir="rtl" style="padding:24px 32px 0;${FONT}text-align:right;color:#274060;font-size:15px;font-weight:bold;line-height:1.8;">${lines(c.signature)}</td></tr>`
    : "";
  const code = c.code
    ? `<tr><td dir="ltr" style="padding:20px 32px 4px;${FONT}text-align:center;"><span style="display:inline-block;font-family:'Courier New',monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#274060;background:#f1f5f9;border-radius:12px;padding:14px 24px;">${esc(c.code)}</span></td></tr>`
    : "";
  const cta = c.cta
    ? `<tr><td dir="rtl" style="padding:24px 32px 0;text-align:right;"><a href="${esc(absoluteUrl(c.cta.href))}" style="display:inline-block;background:#274060;color:#ffffff;text-decoration:none;${FONT}font-size:15px;font-weight:bold;padding:12px 28px;border-radius:10px;">${esc(c.cta.label)}</a></td></tr>`
    : "";
  const note = c.note
    ? `<tr><td dir="rtl" style="padding:16px 32px 0;${FONT}text-align:right;color:#64748b;font-size:13px;line-height:1.8;">${esc(c.note)}</td></tr>`
    : "";

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #dbe3ec;">
<tr><td dir="rtl" style="padding:28px 32px 8px;${FONT}text-align:right;color:#274060;font-size:15px;font-weight:bold;">نادي أدِيب</td></tr>
<tr><td dir="rtl" style="padding:8px 32px 0;${FONT}text-align:right;color:#1e293b;font-size:20px;line-height:1.7;font-weight:bold;">${esc(c.title)}</td></tr>
${paras}${quote}${code}${cta}${note}${signature}
<tr><td style="height:32px;font-size:0;line-height:0;">&nbsp;</td></tr>
</table>
<p dir="rtl" style="margin:16px 0 0;${FONT}font-size:12px;line-height:1.8;color:#64748b;text-align:center;">وصلتك هذه الرسالة من بوّابة نادي أدِيب.<br><a href="${SITE}" style="color:#64748b;">adeeb.club</a></p>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    c.title,
    ...c.paragraphs.filter((p) => p.trim()),
    c.quote ? `\n${c.quote.label}:\n${c.quote.text}\n` : "",
    c.code ? `\n${c.code}\n` : "",
    c.cta ? `${c.cta.label}: ${absoluteUrl(c.cta.href)}` : "",
    c.note ?? "",
    c.signature ? `\n${c.signature}` : "",
    "",
    "نادي أدِيب، adeeb.club",
  ].filter((x, i, a) => x !== "" || (i > 0 && a[i - 1] !== "")).join("\n");

  return { html, text };
}
