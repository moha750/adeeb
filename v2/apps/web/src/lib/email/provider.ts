import "server-only";

/**
 * **مزوّدُ البريد — الملفُّ الوحيدُ الذي يعرف Resend** (٢٠٢٦-١٠-١٧).
 *
 * لا شيءَ في النظام يكلّم المزوّد إلّا من هنا. فإن انتقل أدِيب يومًا إلى Postmark أو Amazon SES تبدّل
 * هذا الملفُّ وسجلّاتُ النطاق، ولم يُمَسّ قالبٌ ولا طابورٌ ولا شاشة (قرار محمد: Resend الآن، والبابُ
 * مفتوحٌ للانتقال).
 *
 * ويقول لكلّ إرسالٍ أعابرٌ سقوطُه أم نهائيّ: الزحامُ (٤٢٩) وأعطالُ الخادم (٥xx) وانقطاعُ الشبكة تُعاد،
 * وما سواها (عنوانٌ مرفوض، نطاقٌ غيرُ موثّق، مفتاحٌ خاطئ) يموت ولا يُطرَق ستَّ مرّات.
 */

export const EMAIL_FROM = "نادي أدِيب <noreply@adeeb.club>";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  /** يمنع المزوّدَ من إخراج الرسالة مرّتين إن أُعيد الطلبُ نفسُه. */
  idempotencyKey: string;
};

export type SendOutcome =
  | { ok: true; provider: string; id: string | null }
  | { ok: false; provider: string; error: string; retryable: boolean };

const PROVIDER = "resend";

export function providerConfigured(): boolean {
  return !!process.env.RESEND_API_KEY?.trim();
}

export async function sendEmail(mail: OutgoingEmail): Promise<SendOutcome> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, provider: PROVIDER, error: "RESEND_API_KEY غيرُ مضبوطٍ في الخادم", retryable: true };

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": mail.idempotencyKey,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (e) {
    return { ok: false, provider: PROVIDER, error: `network: ${e instanceof Error ? e.message : String(e)}`, retryable: true };
  }

  const body = await res.text();
  if (res.ok) {
    let id: string | null = null;
    try { id = (JSON.parse(body) as { id?: string }).id ?? null; } catch { /* جسمٌ غيرُ متوقَّع: خرجت الرسالة ولا معرّف */ }
    return { ok: true, provider: PROVIDER, id };
  }
  return {
    ok: false,
    provider: PROVIDER,
    error: `${res.status}: ${body.slice(0, 300)}`,
    retryable: res.status === 429 || res.status >= 500,
  };
}
