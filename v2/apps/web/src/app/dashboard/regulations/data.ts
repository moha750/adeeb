import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@adeeb/core";
import { docs as publicDocs } from "@/lib/regulations/data";
import { changesFrom, stripAnchors, type ArticleChange, type DraftBody } from "@/lib/regulations/edit";
import { seatLabel, type PresidentSeat } from "@/lib/regulations/authz";
import { shortTitle } from "@/lib/regulations/text";
import type { RegChapter } from "@/lib/regulations/types";

// قراءاتُ غرفة التحرير، بعميل الخدمة بعد أن يتحقّق الحارسُ من القدرة. والمسودّةُ تُقرأ كاملةً
// بمراسيها، وتُعطى بصمتَها (`rev`) فلا يكتب أحدُ الرئيسين فوق ما كتبه الآخرُ دون أن يراه.

export const revOf = (body: unknown) => createHash("md5").update(JSON.stringify(body)).digest("hex");
/** يومُ الرياض: النفاذُ والسريانُ يُحسبان به كما تحسبهما القاعدة. */
export const riyadhToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());

type Reg = { id: number; slug: string; title: string; summary: string; position: number };
type Ver = {
  id: string;
  regulation_id: number;
  version_no: number;
  status: "draft" | "published";
  effective_from: string | null;
  change_note: string | null;
  approval_note: string | null;
  published_at: string | null;
};
const VER_COLS = "id, regulation_id, version_no, status, effective_from, change_note, approval_note, published_at";

export type RoomRow = {
  slug: string;
  title: string;
  current: { no: number; effectiveFrom: string } | null;
  scheduled: { no: number; effectiveFrom: string } | null;
  draft: { no: number; approvals: number } | null;
};

/** الوثائقُ السبع بحالها: النافذُ منها، والمجدولُ نفاذُه، والمسودّةُ وموافقاتُها. */
export async function getRoomIndex(sb: SupabaseClient): Promise<{ rows: RoomRow[]; launched: boolean } | { error: string }> {
  const [regs, vers, appr] = await Promise.all([
    sb.from("regulations").select("id, slug, title, summary, position").order("position"),
    sb.from("regulation_versions").select(VER_COLS),
    sb.from("regulation_version_approvals").select("version_id"),
  ]);
  if (regs.error || vers.error) return { error: (regs.error ?? vers.error)!.message };
  const today = riyadhToday();
  const count = new Map<string, number>();
  for (const a of appr.data ?? []) count.set(a.version_id as string, (count.get(a.version_id as string) ?? 0) + 1);
  const all = (vers.data ?? []) as Ver[];
  const rows = (regs.data as Reg[]).map((r): RoomRow => {
    const mine = all.filter((v) => v.regulation_id === r.id);
    const pub = mine.filter((v) => v.status === "published").sort((a, b) => b.version_no - a.version_no);
    const cur = pub.find((v) => v.effective_from! <= today) ?? null;
    const sch = pub.find((v) => v.effective_from! > today) ?? null;
    const d = mine.find((v) => v.status === "draft") ?? null;
    return {
      slug: r.slug,
      title: r.title,
      current: cur ? { no: cur.version_no, effectiveFrom: cur.effective_from! } : null,
      scheduled: sch ? { no: sch.version_no, effectiveFrom: sch.effective_from! } : null,
      draft: d ? { no: d.version_no, approvals: count.get(d.id) ?? 0 } : null,
    };
  });
  return { rows, launched: all.some((v) => v.status === "published") };
}

export type RoomVersion = {
  no: number;
  effectiveFrom: string;
  changeNote: string | null;
  approvalNote: string | null;
  publishedAt: string | null;
  state: "current" | "scheduled" | "past";
};
export type RoomApproval = { seat: PresidentSeat; label: string; name: string | null; at: string };
export type RoomDraft = {
  no: number;
  rev: string;
  approvals: RoomApproval[];
  changes: Record<number, ArticleChange>;
  removed: number[];
  chapters: number[];
};
export type RoomDoc = {
  slug: string;
  title: string;
  /** هل نُشر شيءٌ من الأنظمة بعد؟ وقبل الإطلاق يُنشر الإصدارُ الأوّل كلُّه معًا، فلا موافقةَ ولا نشرَ هنا. */
  launched: boolean;
  /** هل لهذه الوثيقة إصدارٌ منشور؟ وبلا منشورٍ لا يتغيّر ترقيمُها. */
  published: boolean;
  body: RegChapter[];
  draft: RoomDraft | null;
  versions: RoomVersion[];
  docNames: Record<string, string>;
  counts: Record<string, [number, number]>;
};

export type DraftRow = { id: string; version_no: number; body: DraftBody };

/** الوثيقةُ ومسودّتُها ومنشورُها الأخير — يقرؤها العارضُ والأفعالُ معًا. */
export async function loadDoc(sb: SupabaseClient, slug: string) {
  const reg = await sb.from("regulations").select("id, slug, title, summary, position").eq("slug", slug).maybeSingle();
  if (reg.error || !reg.data) return null;
  const r = reg.data as Reg;
  const [vers, draft, latest] = await Promise.all([
    sb.from("regulation_versions").select(VER_COLS).eq("regulation_id", r.id).eq("status", "published").order("version_no", { ascending: false }),
    sb.from("regulation_versions").select("id, version_no, body").eq("regulation_id", r.id).eq("status", "draft").maybeSingle(),
    sb.from("regulation_versions").select("id, version_no, body").eq("regulation_id", r.id).eq("status", "published").order("version_no", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    reg: r,
    versions: (vers.data ?? []) as Ver[],
    draft: (draft.data as DraftRow | null) ?? null,
    latest: (latest.data as { id: string; version_no: number; body: RegChapter[] } | null) ?? null,
  };
}

export async function getRoomDoc(sb: SupabaseClient, slug: string): Promise<RoomDoc | null> {
  const d = await loadDoc(sb, slug);
  if (!d) return null;
  const [anyPub, all] = await Promise.all([
    sb.from("regulation_versions").select("id", { count: "exact", head: true }).eq("status", "published"),
    publicDocs(),
  ]);
  const today = riyadhToday();
  const curNo = d.versions.find((v) => v.effective_from! <= today)?.version_no ?? null;

  let draft: RoomDraft | null = null;
  if (d.draft) {
    const ap = await sb.from("regulation_version_approvals").select("role_name, user_id, approved_at").eq("version_id", d.draft.id);
    const ids = (ap.data ?? []).map((a) => a.user_id).filter(Boolean) as string[];
    const people = ids.length ? await sb.from("profiles").select("id, full_name, gender").in("id", ids) : { data: [] };
    const who = new Map((people.data ?? []).map((p) => [p.id as string, p as { full_name: string | null; gender: "male" | "female" | null }]));
    const ch = d.latest ? changesFrom(d.latest.body, d.draft.body) : { changes: {}, removed: [], chapters: [] };
    draft = {
      no: d.draft.version_no,
      rev: revOf(d.draft.body),
      approvals: (ap.data ?? []).map((a) => {
        const p = a.user_id ? who.get(a.user_id as string) : undefined;
        return { seat: a.role_name as PresidentSeat, label: seatLabel(a.role_name as PresidentSeat, p?.gender ?? null), name: p?.full_name ?? null, at: a.approved_at as string };
      }),
      ...ch,
    };
  }

  const body = d.draft ? stripAnchors(d.draft.body) : (d.latest?.body ?? []);
  const counts = Object.fromEntries(all.map((x) => [x.slug, [x.chapters.reduce((s, c) => s + c.articles.length, 0), x.chapters.length] as [number, number]]));
  counts[slug] = [body.reduce((s, c) => s + c.articles.length, 0), body.length];
  return {
    slug,
    title: d.reg.title,
    launched: (anyPub.count ?? 0) > 0,
    published: d.versions.length > 0,
    body,
    draft,
    versions: d.versions.map((v) => ({
      no: v.version_no,
      effectiveFrom: v.effective_from!,
      changeNote: v.change_note,
      approvalNote: v.approval_note,
      publishedAt: v.published_at,
      state: v.version_no === curNo ? "current" : v.effective_from! > today ? "scheduled" : "past",
    })),
    docNames: Object.fromEntries(all.map((x) => [x.slug, shortTitle(x)])),
    counts,
  };
}
