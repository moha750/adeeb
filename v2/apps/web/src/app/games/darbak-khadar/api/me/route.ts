import { service, who } from "@/lib/darb/player";
import { fail, json } from "@/lib/darb/http";

/**
 * **حالُ اللاعب:** اسمُه، وترتيبُه وقيمتُه في اللوحتين (المسافةُ والتمر)، وقيمةُ من فوقه، وأهو محفوظٌ بحساب،
 * وأكوابُه من المسابقة ذكرى (`cupsTotal`، ومنها رسالةُ المرّة الواحدة في اللعبة).
 * ومن لم يسجّل بعدُ يعود `name: null` فتعرض اللعبةُ شاشةَ الاسم.
 */
export async function GET() {
  const { hash, user } = await who();
  // «داخلٌ في الموقع» يُعاد مع كلّ جواب: اللعبةُ تعرض زرَّ الحفظ بالحساب لمن ليس داخلًا وحدَه.
  const loggedIn = user !== null;

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const me = hash || user ? await sb.rpc("darb_me", { p_token_hash: hash, p_user: user }) : { data: null, error: null };
  if (me.error) return fail(500, "تعذّرت قراءةُ حالك.");
  if (!me.data) return json({ ok: true, name: null, loggedIn });
  return json({ ok: true, loggedIn, ...(me.data as Record<string, unknown>) });
}
