import { decodeInput, MAX_INPUT_CHARS, replay } from "@/lib/watan/rules";
import { service, who } from "@/lib/watan/player";
import { fail, isCount, isUuid, json, readJson, sameOrigin } from "@/lib/watan/http";

/**
 * **نهايةُ جولة: الخادمُ يعيدها ويحكم.**
 *
 * يصل رقمُ التذكرة والضغطاتُ بلحظاتها، ومعها ما رآه الجهاز (المسافةُ والمصّاصُ
 * والتكّات) **للمقارنة لا للحكم**. فتُقرأ البذرةُ من التذكرة، وتُعاد الجولةُ باللبّ،
 * وما يُحفَظ هو ما حسبه الخادم.
 *
 * وثلاثُ علاماتٍ تُسجَّل مع الجولة:
 * - `cap`: بلغت الحدَّ التقنيّ حيّةً ← تُحفَظ **ولا تدخل اللوحة** حتّى تُراجَع.
 * - `mismatch`: ما حسبه الخادمُ غيرُ ما رآه الجهاز ← تُحتسَب بحساب الخادم، والعلامةُ
 *   لنا: إمّا عبثٌ بالأرقام، وإمّا (وهو الأخطر) محرّكٌ يحسب غيرَ ما يحسبه الخادم.
 * - وفي القاعدة `fast`: جولةٌ زمنُ لعبها أطولُ من الزمن الذي مضى منذ التذكرة ← تُلغى.
 *   الإيقافُ يطيل الزمنَ الحقيقيّ ولا يقصّره، فالأسرعُ من الساعة حسابٌ لا لعب.
 * - وفيها `out`: جولةٌ خارج نافذة المسابقة ← تُحفَظ ولا تُحسَب، ويعود `window`
 *   (`before` أو `after`) فتقول اللعبةُ لماذا.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "طلبٌ من خارج الموقع.");
  const body = await readJson(req, MAX_INPUT_CHARS + 1_000);
  if (!body) return fail(400, "طلبٌ غيرُ مفهوم.");
  if (!isUuid(body.run)) return fail(400, "تذكرةُ الجولة ناقصة.");

  const presses = decodeInput(body.input);
  if (!presses) return fail(422, "سجلُّ الجولة غيرُ صالح.");

  const { hash, user } = await who();
  if (!hash && !user) return fail(401, "اختر اسمَك أوّلًا.", { needName: true });

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const { data: ticket, error: tErr } = await sb.rpc("watan_run_ticket", { p_token_hash: hash, p_user: user, p_run: body.run });
  const t = Array.isArray(ticket) ? ticket[0] : ticket;
  if (tErr || !t) return fail(404, "لم نجد هذه الجولة.");
  if (t.status !== "open") return fail(409, "أُرسلت هذه الجولةُ من قبل.");

  const r = replay(Number(t.seed), presses);
  if (!r) return fail(422, "سجلُّ الجولة لا يطابق اللعبة.");

  const seen = { ticks: body.ticks, dist: body.dist, candies: body.candies };
  const agrees =
    isCount(seen.ticks) && isCount(seen.dist) && isCount(seen.candies) &&
    seen.ticks === r.ticks && seen.dist === r.dist && seen.candies === r.candies;
  const flag = r.capped ? "cap" : agrees ? null : "mismatch";

  const { data, error } = await sb.rpc("watan_finish_run", {
    p_token_hash: hash,
    p_user: user,
    p_run: body.run,
    p_ticks: r.ticks,
    p_dist: r.dist,
    p_candies: r.candies,
    p_input: body.input,
    p_flag: flag,
  });
  if (error || !data) return fail(500, "تعذّر حفظُ الجولة.");

  const res = data as { status: string; counted?: boolean; window?: "before" | "after"; best_dist?: number; candy_total?: number };
  if (res.status === "closed") return fail(409, "أُرسلت هذه الجولةُ من قبل.");
  if (res.status === "expired") return fail(410, "انتهت مهلةُ هذه الجولة.");
  if (res.status === "fast") return fail(422, "زمنُ الجولة لا يطابق زمنَها الحقيقيّ.");
  if (res.status !== "ok") return fail(404, "لم نجد هذه الجولة.");

  return json({
    ok: true,
    dist: r.dist,
    candies: r.candies,
    counted: res.counted === true,
    held: r.capped,
    window: res.window,
    best: res.best_dist ?? 0,
    candyTotal: res.candy_total ?? 0,
  });
}
