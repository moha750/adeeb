import { randomInt } from "node:crypto";
import { CORE_VERSION } from "@/lib/watan/core";
import { service, who } from "@/lib/watan/player";
import { fail, json, readJson, sameOrigin } from "@/lib/watan/http";

/**
 * **بدءُ جولة: الخادمُ يعطي البذرة ورقمَ تذكرةٍ لا يُستعمل إلّا مرّة.**
 *
 * لماذا لا يختار الجهازُ بذرته: لأنّه حينها يجرّب البذورَ حتّى يجد أسهلَها. ولماذا
 * التذكرة: لوحةُ المصّاص **مجموعُ الجولات**، فجولةٌ واحدةٌ صحيحةٌ تُرسَل مئةَ مرّةٍ
 * تجمع مئةَ ضعف. والتذكرةُ تُغلَق عند أوّل إرسال، ويُقاس بها الزمنُ الحقيقيّ للجولة.
 *
 * وبصمةُ اللبّ تُقارَن هنا قبل أن يبدأ اللعب: جهازٌ بنسخةٍ قديمةٍ يُطلب منه التحديثُ
 * الآن، لا بعد جولةٍ طويلةٍ تُرَدّ.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "طلبٌ من خارج الموقع.");
  const body = await readJson(req, 1_000);
  if (!body) return fail(400, "طلبٌ غيرُ مفهوم.");
  if (body.core !== CORE_VERSION) return fail(409, "نسخةُ اللعبة قديمة. حدّث الصفحة.", { stale: true });

  const { hash, user } = await who();
  if (!hash && !user) return fail(401, "اختر اسمَك أوّلًا.", { needName: true });

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const seed = randomInt(0, 2 ** 32);
  const { data, error } = await sb.rpc("watan_start_run", {
    p_token_hash: hash,
    p_user: user,
    p_seed: seed,
    p_core: CORE_VERSION,
  });
  if (error) {
    if (error.message.includes("watan_no_player")) return fail(401, "اختر اسمَك أوّلًا.", { needName: true });
    if (error.message.includes("watan_too_many")) return fail(429, "جولاتٌ كثيرةٌ في وقتٍ قصير. خذ نفَسًا.");
    return fail(500, "تعذّر بدءُ الجولة.");
  }
  return json({ ok: true, run: data as string, seed });
}
