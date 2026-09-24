import { clientIp, visitorHash } from "@/lib/visitor";
import { normalizeCode } from "@/lib/watan/rules";
import { hashCode, hashToken, newToken, service, writeToken } from "@/lib/watan/player";
import { fail, json, readJson, sameOrigin } from "@/lib/watan/http";

/**
 * **الاسترجاعُ برمز:** اسمُك ونتائجُك إلى هذا المتصفّح.
 *
 * العلّةُ منشورُ الإعلان: من ضغط الرابطَ في إنستقرام أو إكس فتحه في متصفّح التطبيق، وهو
 * منفصلٌ عن سفاري. فلعب هناك، ثمّ فتح اللعبةَ من سفاري فوجد نفسه غريبًا واسمَه محجوزًا.
 *
 * **ينقل ولا ينسخ:** لهذا المتصفّح رمزُ جهازٍ جديد، والأوّلُ يخرج (انظر الترحيل
 * `watan_02_recovery`). **والتخمينُ محدود:** المحاولاتُ الخاطئةُ تُعَدّ ببصمة الزائر
 * اليوميّة، عشرون في الساعة. والعنوانُ لا يُخزَّن، بل بصمتُه الدوّارة.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "طلبٌ من خارج الموقع.");
  const body = await readJson(req, 1_000);
  if (!body) return fail(400, "طلبٌ غيرُ مفهوم.");

  const code = normalizeCode(body.code);
  if (!code) return fail(422, "الرمزُ عشرةُ أرقام.");

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const token = newToken();
  const { data, error } = await sb.rpc("watan_restore", {
    p_recovery_hash: hashCode(code),
    p_token_hash: hashToken(token),
    p_fp: visitorHash(clientIp(req.headers)),
  });
  if (error || !data) return fail(500, "تعذّر الاسترجاع. أعد المحاولة.");

  const res = data as { status: string; name?: string };
  if (res.status === "slow") return fail(429, "محاولاتٌ كثيرة. جرّب بعد ساعة.");
  if (res.status !== "ok" || !res.name) return fail(404, "الرمزُ غيرُ صحيح.");

  await writeToken(token);
  return json({ ok: true, name: res.name });
}
