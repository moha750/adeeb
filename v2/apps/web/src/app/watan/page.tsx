import { service, who } from "@/lib/watan/player";
import { Board, type BoardContest, type BoardData, type BoardRow, type Standing } from "./_components/Board";
import { tabOf } from "./_components/tabs";

/**
 * **لوحةُ الصدارة** — تُقرأ في الخادم كلَّ طلب: اللوحتان (خمسون لكلٍّ) وحالُ «أنت».
 *
 * بمفتاح الخدمة لا بالمفتاح العلنيّ: الجدولان بلا سياسةٍ تحت RLS، والدوالُّ لـ`service_role`
 * وحده (`supabase/migrations/20260924132938_watan_01_board.sql`). وما يصل الصفحةَ اسمٌ
 * مستعارٌ ورقمٌ وترتيبٌ فقط. والفشلُ لا يُسقط الصفحة: تظهر فارغةً بجملةٍ تقول ذلك.
 *
 * **والتبويبُ من الرابط** (`?tab=`، ٢٠٢٦-٠٩-٢٥): يُرسَم من أوّل طلب، فمن جاء من «احفظ تقدّمك»
 * بعد الدخول يرى «حسابي» لا الصدارة. ومعه `loggedIn` لذلك التبويب.
 */
export const dynamic = "force-dynamic";

type Raw = { rank: number | string; nickname: string; value: number };
const rows = (x: unknown): BoardRow[] =>
  ((x as Raw[] | null) ?? []).map((r) => ({ rank: Number(r.rank), name: r.nickname, value: r.value }));

/** الموعدُ بتوقيت الرياض: «الجمعة 3:00 م»، بأرقامٍ غربيّةٍ كاللوحة. */
const when = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", {
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Riyadh",
});

/** طورُ المسابقة يُحسب هنا بساعة الخادم، فلا يختلف ما رُسم في الخادم عمّا يظهر في الجهاز. */
function phaseOf(w: unknown): BoardContest {
  const o = w as { startsAt?: string; endsAt?: string } | null;
  const s = Date.parse(o?.startsAt ?? ""), e = Date.parse(o?.endsAt ?? "");
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  const now = Date.now();
  return {
    phase: now < s ? "before" : now < e ? "open" : "after",
    starts: when.format(s),
    ends: when.format(e),
    startsAt: s,
    endsAt: e,
  };
}

const standing = (s: unknown): Standing => {
  const o = (s ?? {}) as { value?: number; rank?: number | null; above?: number | null };
  return { value: o.value ?? 0, rank: o.rank ?? null, above: o.above ?? null };
};

export default async function WatanPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = tabOf((await searchParams).tab);
  const sb = service();
  const { hash, user } = await who();
  let data: BoardData = { dist: [], candy: [], me: null, failed: !sb, loggedIn: user !== null };

  if (sb) {
    const [d, c, m, w] = await Promise.all([
      sb.rpc("watan_board", { p_kind: "dist", p_limit: 50 }),
      sb.rpc("watan_board", { p_kind: "candy", p_limit: 50 }),
      hash || user
        ? sb.rpc("watan_me", { p_token_hash: hash, p_user: user })
        : Promise.resolve({ data: null, error: null }),
      sb.rpc("watan_contest_window"),
    ]);
    const me = m.data as { name?: string; dist?: unknown; candy?: unknown; account?: unknown } | null;
    data = {
      dist: rows(d.data),
      candy: rows(c.data),
      me: me?.name
        ? { name: me.name, dist: standing(me.dist), candy: standing(me.candy), account: me.account === true }
        : null,
      contest: phaseOf(w.data),
      failed: Boolean(d.error || c.error),
      loggedIn: user !== null,
    };
  }

  return <Board data={data} tab={tab} />;
}
