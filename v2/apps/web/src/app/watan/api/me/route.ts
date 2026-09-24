import { service, who } from "@/lib/watan/player";
import { fail, json } from "@/lib/watan/http";

/**
 * **حالُ اللاعب:** اسمُه، وترتيبُه وقيمتُه في اللوحتين، وقيمةُ من فوقه، وأهو محفوظٌ بحساب.
 * ومن لم يسجّل بعدُ يعود `name: null` فتعرض اللعبةُ شاشةَ الاسم.
 */
export async function GET() {
  const { hash, user } = await who();
  // «داخلٌ في الموقع» يُعاد مع كلّ جواب: اللعبةُ تعرض زرَّ الحفظ بالحساب لمن ليس داخلًا وحدَه.
  const loggedIn = user !== null;
  if (!hash && !user) return json({ ok: true, name: null, loggedIn });

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const { data, error } = await sb.rpc("watan_me", { p_token_hash: hash, p_user: user });
  if (error) return fail(500, "تعذّرت قراءةُ حالك.");
  if (!data) return json({ ok: true, name: null, loggedIn });
  return json({ ok: true, loggedIn, ...(data as Record<string, unknown>) });
}
