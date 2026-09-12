import { fmtStamp } from "@/lib/dates";
import { SITE_ORIGIN, targetHost } from "@/lib/qrLinks";

/**
 * **نصُّ تنبيه تبديل الوجهة** — مصدرٌ واحدٌ يقرؤه منفذُ الإرسال وصفحةُ المعاينة.
 *
 * وغرضُه أن يُقرأ في ثانيتين على شاشة قفل ثمّ يُفتَح: **ما جرى، ومن فعله، وأين يُوقَف**.
 * فلا شعارَ ولا زخرف، والوجهةُ تُقال **باسم موقعها** أوّلًا (`example.com`) لأنّه ما يُدرَك
 * بلمحة، ورابطُها كاملًا في الذيل لمن أراد التحقّق.
 *
 * **ولا يُنقَر رابطُ الوجهة**: بريدٌ ينبّه من تصيّدٍ لا يضع رابطَ المُتصيَّد قابلًا للنقر.
 */
export type QrAlertInput = {
  link: { id: string; title: string; code: string };
  ev: { old_value: string | null; new_value: string | null; at: string };
  actor: string | null;
};

export function qrAlertMail({ link, ev, actor }: QrAlertInput): { subject: string; html: string } {
  const page = `${SITE_ORIGIN}/dashboard/tools/qr/${link.id}`;
  const oldHost = ev.old_value ? targetHost(ev.old_value) : "غير معروفة";
  const newHost = ev.new_value ? targetHost(ev.new_value) : "غير معروفة";

  const html = `<div dir="rtl" style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.9;color:#1b2836;background:#f4f6f9;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #dbe3ec;border-radius:16px;padding:24px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;color:#64748b">نادي أَدِيب</p>
    <h2 style="margin:0 0 14px;font-size:20px">تبدّلت وجهةُ باركود</h2>

    <p style="margin:0 0 4px;font-size:16px"><b>${esc(link.title)}</b></p>
    <p style="margin:0 0 16px;font-size:13px;color:#64748b" dir="ltr">${SITE_ORIGIN.replace(/^https?:\/\//, "")}/q/${esc(link.code)}</p>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:96px">كانت</td><td style="padding:6px 0"><b dir="ltr">${esc(oldHost)}</b></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">صارت</td><td style="padding:6px 0"><b dir="ltr">${esc(newHost)}</b></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">بيد</td><td style="padding:6px 0">${esc(actor ?? "غير معروف")}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">الوقت</td><td style="padding:6px 0">${esc(fmtStamp(ev.at))}</td></tr>
    </table>

    <p style="margin:20px 0 0">
      <a href="${page}" style="display:inline-block;background:#274060;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:12px;font-weight:700">افتح صفحة الباركود</a>
    </p>
    <p style="margin:14px 0 0;font-size:12px;color:#64748b">
      إن لم تكن تعرف هذا التغيير فأوقِف الباركود من صفحته، ثمّ راجِع صاحبَه.
    </p>
    <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;word-break:break-all">
      الوجهةُ الجديدة كاملةً: ${esc(ev.new_value ?? "")}
    </p>
  </div>
</div>`;

  return { subject: `تبدّلت وجهةُ باركود: ${link.title}`, html };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
