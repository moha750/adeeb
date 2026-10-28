import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import type { Block, Signer, StatementDoc } from "@/lib/statements/paper";

/** بيانٌ صادر كما يُعرض في السجلّ — ومعه ما يُعاد رسمُه منه. */
export type IssuedStatement = StatementDoc & {
  id: number;
  number: string;
  pages: number;
  issuedAt: string;
  issuerName: string | null;
  issuerFemale: boolean;
};

type Row = {
  id: number; year: number; seq: number; title: string; body: string; blocks: Block[] | null; signers: StatementDoc["signers"];
  signer_names: Partial<StatementDoc["names"]> | null; pages: number; issued_at: string; issued_by: string | null;
};

const EMPTY: Signer = { title: "", name: "" };

/**
 * غرفةُ البيانات: الموقّعان اليوم (اسمُ كلٍّ الثلاثيّ ومسمّاه بجنسه) والسجلّ. والاسمُ الثلاثيّ من
 * `member_details` إن وُجد وإلّا اسمُ الحساب — قاعدةُ شهادة الخبرة نفسُها.
 */
export async function getStatementsRoom(): Promise<{ signers: StatementDoc["names"]; statements: IssuedStatement[]; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  const blank = { signers: { president: EMPTY, ceo: EMPTY }, statements: [] };
  if (!url || !key) return { ...blank, error: "إعداد الخادم ناقص (مفتاح الخدمة)." };
  const sb = createAdeebServiceClient(url, key);

  const [seats, rows] = await Promise.all([
    sb.from("user_roles").select("user_id, role_name, is_acting").eq("is_active", true).in("role_name", ["club_president", "executive_council_president"]),
    sb.from("statements").select("id, year, seq, title, body, blocks, signers, signer_names, pages, issued_at, issued_by").order("issued_at", { ascending: false }).limit(200),
  ]);
  if (seats.error || rows.error) return { ...blank, error: (seats.error ?? rows.error)!.message };

  const ids = [...new Set([...(seats.data ?? []).map((s) => s.user_id), ...((rows.data ?? []) as Row[]).map((r) => r.issued_by).filter((x): x is string => !!x)])];
  const [people, details] = await Promise.all([
    ids.length ? sb.from("profiles").select("id, full_name, gender").in("id", ids) : Promise.resolve({ data: [], error: null }),
    ids.length ? sb.from("member_details").select("user_id, full_name_triple").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
  ]);
  const person = new Map((people.data ?? []).map((p) => [p.id, p]));
  const triple = new Map((details.data ?? []).map((d) => [d.user_id, d.full_name_triple]));
  const nameOf = (id: string) => (triple.get(id) || person.get(id)?.full_name || "").trim();

  // الأصيلُ أوّلًا، فإن غاب فالمكلَّفُ بالمقعد
  const holder = (role: string) => {
    const list = (seats.data ?? []).filter((s) => s.role_name === role);
    return (list.find((s) => !s.is_acting) ?? list[0])?.user_id ?? null;
  };
  const p = holder("club_president");
  const c = holder("executive_council_president");
  const her = (id: string | null) => !!id && person.get(id)?.gender === "female";
  const signers: StatementDoc["names"] = {
    president: { title: her(p) ? "رئيسة أدِيب" : "رئيس أدِيب", name: p ? nameOf(p) : "" },
    ceo: { title: her(c) ? "الرئيسة التنفيذية" : "الرئيس التنفيذي", name: c ? nameOf(c) : "" },
  };

  const statements = ((rows.data ?? []) as Row[]).map((r) => ({
    id: r.id,
    number: `${r.year}/${r.seq}`,
    title: r.title,
    // الكتلُ مصدرُ الرسم؛ وإن غابت فالمتنُ فقراتٍ بأسطره
    blocks: r.blocks?.length ? r.blocks : r.body.split(/\n+/).filter(Boolean).map((text) => ({ kind: "p" as const, text })),
    signers: r.signers,
    names: { president: r.signer_names?.president ?? EMPTY, ceo: r.signer_names?.ceo ?? EMPTY },
    pages: r.pages,
    issuedAt: r.issued_at,
    issuerName: r.issued_by ? person.get(r.issued_by)?.full_name ?? null : null,
    issuerFemale: !!r.issued_by && person.get(r.issued_by)?.gender === "female",
  }));
  return { signers, statements, error: null };
}
