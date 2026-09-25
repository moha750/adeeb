/**
 * أدواتُ أبواب «دربك خضر» المشتركة: الردُّ بصيغةٍ واحدة، وقراءةُ جسمٍ محدودِ الطول،
 * وردُّ ما جاء من خارج الموقع.
 */
import "server-only";

/** كلُّ ردٍّ غيرُ مخزَّن: فيه حالُ لاعبٍ بعينه، ونسخةٌ مخزَّنةٌ منه تُري لاعبًا حالَ غيره. */
export function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export const fail = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  json({ ok: false, message, ...extra }, status);

/**
 * **الطلبُ الكاتبُ من الموقع نفسِه فقط.** كوكيزُ اللاعب `sameSite=lax` فلا تُرسَل مع
 * طلبٍ كاتبٍ من موقعٍ آخر أصلًا، وهذا حارسٌ ثانٍ لا يتّكل على سلوك المتصفّح وحده.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // المتصفّحاتُ ترسلها مع كلّ POST من صفحة؛ وغيابُها طلبٌ من غير متصفّح، والكوكيزُ حارسُه.
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** يقرأ JSON لا يتجاوز `max` بايتًا، أو `null`. السجلُّ أطولُ ما يصل، وسقفُه معروف. */
export async function readJson(req: Request, max: number): Promise<Record<string, unknown> | null> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > max) return null;
  try {
    const text = await req.text();
    if (text.length > max) return null;
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const isUuid = (v: unknown): v is string =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
