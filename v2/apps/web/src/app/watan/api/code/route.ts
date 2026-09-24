import { hashCode, newCode, service, who } from "@/lib/watan/player";
import { fail, json, sameOrigin } from "@/lib/watan/http";

/**
 * **رمزُ استرجاعٍ جديد** لمن ما زال في متصفّحه وفقد رمزَه (أو سجّل قبل أن يوجد الرمز).
 * والقديمُ يسقط بظهور الجديد: رمزان صالحان لاسمٍ واحدٍ بابان لا يُعرف أيُّهما تسرّب.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "طلبٌ من خارج الموقع.");
  const { hash, user } = await who();
  if (!hash && !user) return fail(401, "اختر اسمَك أوّلًا.", { needName: true });

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const code = newCode();
  const { data, error } = await sb.rpc("watan_set_code", { p_token_hash: hash, p_user: user, p_recovery_hash: hashCode(code) });
  if (error) return fail(500, "تعذّر إنشاءُ الرمز.");
  if (data !== true) return fail(401, "اختر اسمَك أوّلًا.", { needName: true });
  return json({ ok: true, code });
}
