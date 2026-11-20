import "server-only";
import { createHmac } from "node:crypto";

/**
 * **مفتاحُ «المعاينة كـ» القصير** (قرار محمد ٢٠٢٦-١١-٢٠: «أميل إلى الحل الثاني… دعها معاينة كاملة حتى مع التصرف»).
 *
 * كانت المعاينةُ تستعير الهويّةَ في طبقة الموقع وحدها، والقاعدةُ تعرف صاحبَ الجلسة: كلُّ ما تحسبه بـ`auth.uid()` (الصلاحياتُ والفلاترُ
 * و«من يدير هذا الانتخاب») يخرج بحسابه هو. فظهر لمحمد معاينًا فاطمة المرزوق زرُّ «إغلاق باب الترشّح» في انتخابٍ لا تديره.
 * والعلاجُ من أصله: الخادمُ يكلّم القاعدةَ أثناء المعاينة برمزٍ باسم المُعايَن، فتعامله كما تعامله هو بالضبط.
 *
 * يُوقَّع بسرّ المشروع القديم (`SUPABASE_JWT_SECRET`، HS256) الذي ما زالت القاعدةُ تقبله بجانب المفتاح الجديد (ES256)؛ فإن أُبطل
 * في Supabase عادت المعاينةُ كما كانت (هويّةً في الموقع وحده) ولم ينكسر شيء. **وهو للخادم وحده**: لا يُستورد في عميل، ولا يُعاد
 * إلى المتصفّح، ويُصدَر لكلّ طلبٍ من جديد بعمرٍ قصير. ولا يُصدَر إلّا لمن تملك جلستُه الحقيقيّة قدرةَ المعاينة (`getCurrentAdmin`).
 */
const LIFETIME_S = 600;

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

export function previewSecret(): string | null {
  const s = process.env.SUPABASE_JWT_SECRET?.trim();
  return s ? s : null;
}

export type PreviewToken = { token: string; claims: Record<string, unknown> };

export function mintPreviewToken(subject: { id: string; email: string | null }, previewedBy: string): PreviewToken | null {
  const secret = previewSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = {
    iss: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "")}/auth/v1`,
    aud: "authenticated",
    role: "authenticated",
    sub: subject.id,
    email: subject.email ?? undefined,
    iat: now,
    exp: now + LIFETIME_S,
    // أنّه رمزُ معاينة، ومن عاين: لا يغيّر شيئًا في الصلاحيات، ويقرؤه من أراد أن يعرف
    is_preview: true,
    previewed_by: previewedBy,
  };
  const head = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const sig = b64url(createHmac("sha256", secret).update(`${head}.${body}`).digest());
  return { token: `${head}.${body}.${sig}`, claims };
}
