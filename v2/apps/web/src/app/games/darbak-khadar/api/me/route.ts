import { service, who } from "@/lib/darb/player";
import { fail, json } from "@/lib/darb/http";

/**
 * **حالُ اللاعب:** اسمُه، وترتيبُه وقيمتُه في اللوحتين، وقيمةُ من فوقه، وأهو محفوظٌ بحساب.
 * ومن لم يسجّل بعدُ يعود `name: null` فتعرض اللعبةُ شاشةَ الاسم.
 *
 * **ومعه نافذةُ المسابقة** (`contest`: متى تبدأ ومتى تنتهي) لكلّ سائل، مسجّلًا كان أو لا:
 * اللعبةُ تعرضها على شاشة البدء، والخادمُ وحدَه يحكم بها عند كلّ جولة (`darb_finish_run`).
 */
export async function GET() {
  const { hash, user } = await who();
  // «داخلٌ في الموقع» يُعاد مع كلّ جواب: اللعبةُ تعرض زرَّ الحفظ بالحساب لمن ليس داخلًا وحدَه.
  const loggedIn = user !== null;

  const sb = service();
  if (!sb) return fail(503, "الخادمُ غيرُ مهيّأ بعد.");

  const [me, win] = await Promise.all([
    hash || user ? sb.rpc("darb_me", { p_token_hash: hash, p_user: user }) : Promise.resolve({ data: null, error: null }),
    sb.rpc("darb_contest_window"),
  ]);
  const contest = (win.data as { startsAt: string; endsAt: string } | null) ?? null;
  if (me.error) return fail(500, "تعذّرت قراءةُ حالك.");
  if (!me.data) return json({ ok: true, name: null, loggedIn, contest });
  return json({ ok: true, loggedIn, contest, ...(me.data as Record<string, unknown>) });
}
