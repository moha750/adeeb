import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * **حارسُ المنافذ التي تطرقها القاعدة** (`pg_cron` و`pg_net`) — منفذا الاستنزاف للإشعارات والبريد.
 *
 * يقبل ترويسة `x-cron-secret` إن ساوت:
 * - **سرًّا مشتقًّا من مفتاح الخدمة**: `HMAC-SHA256(SUPABASE_SERVICE_ROLE_KEY, label)`. المفتاحُ في Vercel
 *   أصلًا، فلا يحتاج فتحُ البابِ متغيّرًا جديدًا في لوحتها، ولا يسافر المفتاحُ نفسُه في نداء. والقاعدةُ
 *   تحمل المشتقَّ في Vault باسمٍ لكلّ منفذ. وتدويرُ مفتاح الخدمة يُبطله، فيُعاد اشتقاقُه في Vault.
 * - أو قيمةَ متغيّرٍ صريحٍ إن سُمّي (`NOTIFICATIONS_DRAIN_SECRET` سابقًا).
 *
 * وبلا شيءٍ منهما يُردّ كلُّ نداء: البابُ مغلقٌ حتّى يُفتح عمدًا.
 */
function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function derivedSecret(label: string): string | null {
  // تنقيةُ المفتاح كما في `notificationsDb`: سطرٌ زائدٌ في لوحة Vercel لا يُبدّل المشتقّ.
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return service ? createHmac("sha256", service).update(label).digest("hex") : null;
}

export function cronAllowed(request: Request, label: string, envName?: string): boolean {
  const given = request.headers.get("x-cron-secret")?.trim();
  if (!given) return false;
  const explicit = envName ? process.env[envName]?.trim() : undefined;
  if (explicit && same(given, explicit)) return true;
  const derived = derivedSecret(label);
  return !!derived && same(given, derived);
}
