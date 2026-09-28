import { service, who } from "@/lib/darb/player";
import { Board, type BoardContest, type BoardData, type BoardRow, type Cups, type Recap, type Standing, type Winner } from "./_components/Board";
import { tabOf } from "./_components/tabs";

/**
 * **لوحةُ الصدارة** — تُقرأ في الخادم كلَّ طلب: اللوحتان (خمسون لكلٍّ) وحالُ «أنت»، وذكرى المسابقة
 * (موعدُها وفائزوها وأرقامُها، ثابتةٌ منذ أُقفلت).
 *
 * بمفتاح الخدمة لا بالمفتاح العلنيّ: الجدولان بلا سياسةٍ تحت RLS، والدوالُّ لـ`service_role`
 * وحده (ترحيلُ اللوحة الأوّل `20260924132938` في `supabase/migrations`). وما يصل الصفحةَ اسمٌ
 * مستعارٌ ورقمٌ وترتيبٌ فقط. والفشلُ لا يُسقط الصفحة: تظهر فارغةً بجملةٍ تقول ذلك.
 *
 * **والتبويبُ من الرابط** (`?tab=`، ٢٠٢٦-٠٩-٢٥): يُرسَم من أوّل طلب، فمن جاء من «احفظ تقدّمك»
 * بعد الدخول يرى «حسابي» لا الصدارة. ومعه `loggedIn` لذلك التبويب.
 */
export const dynamic = "force-dynamic";

type Raw = { rank: number | string; nickname: string; value: number };
const rows = (x: unknown): BoardRow[] =>
  ((x as Raw[] | null) ?? []).map((r) => ({ rank: Number(r.rank), name: r.nickname, value: r.value }));

/** الموعدُ بتوقيت الرياض: «الجمعة 6:30 م»، بأرقامٍ غربيّةٍ كاللوحة. */
const when = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", {
  weekday: "long",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Riyadh",
});

/** موعدا المسابقة مكتوبَين، من القاعدة لا من هنا. */
function windowOf(w: unknown): BoardContest {
  const o = w as { startsAt?: string; endsAt?: string } | null;
  const s = Date.parse(o?.startsAt ?? ""), e = Date.parse(o?.endsAt ?? "");
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return { starts: when.format(s), ends: when.format(e) };
}

/** أرقامُ المسابقة كما أعادتها `darb_contest_recap`. */
function recapOf(raw: unknown): Recap | null {
  const o = raw as Partial<Recap> | null;
  if (!o || typeof o.players !== "number") return null;
  return { players: o.players, runs: Number(o.runs ?? 0), cups: Number(o.cups ?? 0), minutes: Number(o.minutes ?? 0) };
}

/** الفائزون كما أعادتهم `darb_winners`: الاسمُ المستعار وأرقامُه، ولا شيءَ يدلّ على صاحبه. */
function winnersOf(raw: unknown): Winner[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x: { rank?: number; nickname?: string; cups?: number; best_dist?: number; runs?: number; minutes?: number }) => ({
    rank: Number(x.rank ?? 0),
    name: String(x.nickname ?? ""),
    cups: Number(x.cups ?? 0),
    dist: Number(x.best_dist ?? 0),
    runs: Number(x.runs ?? 0),
    minutes: Number(x.minutes ?? 0),
  })).filter((x) => x.rank > 0 && x.name);
}

const standing = (s: unknown): Standing => {
  const o = (s ?? {}) as { value?: number; rank?: number | null; above?: number | null };
  return { value: o.value ?? 0, rank: o.rank ?? null, above: o.above ?? null };
};

/** أكوابُه ذكرى: `candy` ترتيبُه في المسابقة، و`cupsTotal` أكوابُه كلُّها، و`contestOf` من جمع أكوابًا فيها. */
const cupsOf = (me: { candy?: unknown; cupsTotal?: unknown; contestOf?: unknown }): Cups => {
  const c = standing(me.candy);
  return { total: Number(me.cupsTotal ?? 0), contest: c.value, rank: c.rank, of: Number(me.contestOf ?? 0) };
};

export default async function DarbPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const tab = tabOf((await searchParams).tab);
  const sb = service();
  const { hash, user } = await who();
  let data: BoardData = { dist: [], tamr: [], me: null, failed: !sb, loggedIn: user !== null };

  if (sb) {
    const [d, t, m, w, win, rc] = await Promise.all([
      sb.rpc("darb_board", { p_kind: "dist", p_limit: 50 }),
      sb.rpc("darb_board", { p_kind: "tamr", p_limit: 50 }),
      hash || user
        ? sb.rpc("darb_me", { p_token_hash: hash, p_user: user })
        : Promise.resolve({ data: null, error: null }),
      sb.rpc("darb_contest_window"),
      sb.rpc("darb_winners", { p_limit: 3 }),
      sb.rpc("darb_contest_recap"),
    ]);
    const me = m.data as
      | { name?: string; dist?: unknown; tamr?: unknown; candy?: unknown; cupsTotal?: unknown; contestOf?: unknown; account?: unknown }
      | null;
    data = {
      dist: rows(d.data),
      tamr: rows(t.data),
      me: me?.name
        ? { name: me.name, dist: standing(me.dist), tamr: standing(me.tamr), cups: cupsOf(me), account: me.account === true }
        : null,
      contest: windowOf(w.data),
      failed: Boolean(d.error || t.error),
      loggedIn: user !== null,
      winners: winnersOf(win.data),
      recap: recapOf(rc.data),
    };
  }

  return <Board data={data} tab={tab} />;
}
