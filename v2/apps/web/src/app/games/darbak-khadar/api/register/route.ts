import { checkName } from "@/lib/darb/rules";
import { BLOCKED } from "@/lib/darb/blocked";
import { hashToken, newToken, readToken, service, who, writeToken } from "@/lib/darb/player";
import { fail, json, readJson, sameOrigin } from "@/lib/darb/http";

/**
 * **التسجيلُ باسمٍ مستعار** — وهو نفسُه تبديلُ الاسم لمن سجّل من قبل.
 *
 * الاسمُ يُنظَّف ويُفحَص هنا (`checkName` والقائمةُ المحجوبة)، وتفرّدُه في القاعدة
 * (`nickname_key` فريد): فحصٌ هنا ثمّ إدراجٌ هناك يتسابقان، والقيدُ لا يتسابق.
 *
 * **ولا درعَ Turnstile هنا، عن قصد** — خلافًا لسائر أبواب المجهولين في الموقع. الدرعُ
 * ودجةٌ تُحمَّل من كلاودفلير داخل اللعبة، واللعبةُ ملفٌّ مكتفٍ بنفسه لا يطلب من الشبكة
 * شيئًا غيرَ أبوابه (قرارٌ فيها من يومها الأوّل). وما يحرسه الدرعُ هنا قليل: التسجيلُ لا
 * يعطي إلّا اسمًا، والاسمُ لا يظهر في اللوحة إلّا بجولةٍ أعادها الخادمُ فصحّت. وبلا
 * جوائز لا يُغري إغراقُ الأسماء أحدًا. فإن وقع، فالحجبُ من القاعدة، ثمّ الدرعُ إن لزم.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(403, "طلبٌ من خارج الموقع.");
  const body = await readJson(req, 4_000);
  if (!body) return fail(400, "طلبٌ غيرُ مفهوم.");

  const check = checkName(body.name, BLOCKED);
  if (!check.ok) return fail(422, check.message);

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const existing = await readToken();
  const token = existing ?? newToken();
  const { user } = await who();
  // بلا رمز استرجاع (أُزيل ٢٠٢٦-٠٩-٢٥): ما يحفظ الاسمَ خارج هذا المتصفّح حسابُ أدِيب وحدَه.
  const { error } = await sb.rpc("darb_register", {
    p_token_hash: hashToken(token),
    p_user: user,
    p_nickname: check.name,
    p_key: check.key,
  });
  if (error) {
    if (error.message.includes("darb_name_taken")) return fail(409, "هذا الاسمُ مأخوذ. جرّب غيره.");
    return fail(500, "تعذّر حفظُ الاسم. أعد المحاولة.");
  }

  if (!existing) await writeToken(token);
  return json({ ok: true, name: check.name });
}
