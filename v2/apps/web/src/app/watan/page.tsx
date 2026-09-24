import { service, who } from "@/lib/watan/player";
import { Board, type BoardData, type BoardRow, type Standing } from "./_components/Board";

/**
 * **لوحةُ الصدارة** — تُقرأ في الخادم كلَّ طلب: اللوحتان (خمسون لكلٍّ) وحالُ «أنت».
 *
 * بمفتاح الخدمة لا بالمفتاح العلنيّ: الجدولان بلا سياسةٍ تحت RLS، والدوالُّ لـ`service_role`
 * وحده (`supabase/migrations/20260924132938_watan_01_board.sql`). وما يصل الصفحةَ اسمٌ
 * مستعارٌ ورقمٌ وترتيبٌ فقط. والفشلُ لا يُسقط الصفحة: تظهر فارغةً بجملةٍ تقول ذلك.
 */
export const dynamic = "force-dynamic";

type Raw = { rank: number | string; nickname: string; value: number };
const rows = (x: unknown): BoardRow[] =>
  ((x as Raw[] | null) ?? []).map((r) => ({ rank: Number(r.rank), name: r.nickname, value: r.value }));

const standing = (s: unknown): Standing => {
  const o = (s ?? {}) as { value?: number; rank?: number | null; above?: number | null };
  return { value: o.value ?? 0, rank: o.rank ?? null, above: o.above ?? null };
};

export default async function WatanPage() {
  const sb = service();
  const { hash, user } = await who();
  let data: BoardData = { dist: [], candy: [], me: null, failed: !sb };

  if (sb) {
    const [d, c, m] = await Promise.all([
      sb.rpc("watan_board", { p_kind: "dist", p_limit: 50 }),
      sb.rpc("watan_board", { p_kind: "candy", p_limit: 50 }),
      hash || user
        ? sb.rpc("watan_me", { p_token_hash: hash, p_user: user })
        : Promise.resolve({ data: null, error: null }),
    ]);
    const me = m.data as { name?: string; dist?: unknown; candy?: unknown } | null;
    data = {
      dist: rows(d.data),
      candy: rows(c.data),
      me: me?.name ? { name: me.name, dist: standing(me.dist), candy: standing(me.candy) } : null,
      failed: Boolean(d.error || c.error),
    };
  }

  return <Board data={data} />;
}
