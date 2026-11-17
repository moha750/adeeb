import { notFound } from "next/navigation";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getRegEditor } from "@/lib/regulations/authz";
import { docContext, docs } from "@/lib/regulations/data";
import { getRoomDoc, riyadhToday, type RoomDoc } from "@/app/dashboard/regulations/data";
import { RegEditorRoom } from "@/app/_ad/rooms/RegEditorRoom";
import { requestNow } from "@/app/_ad/now";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٦): **محرّرُ النظام على المنضدة** بنظامٍ حقيقيّ (`?slug=`، وبلاه نظامُ الانتخابات)، وكلُّ فعلٍ فيه لا يُحفظ.
 * والحالُ اليوم «قبل الإطلاق» (لا منشورَ بعد)، فتُرسم الأحوالُ الأخرى بـ`?s=`: `none` منشورٌ بلا مسوّدة، و`draft` مسوّدةٌ وافق عليها رئيسٌ
 * واحد، و`both` وافق الاثنان. والحاليُّ للمقارنة: `/dashboard/regulations/<slug>`.
 */
export const metadata = { title: "محرّر النظام: المنضدة" };

export default async function RegEditorLab({ searchParams }: { searchParams: Promise<{ slug?: string; s?: string }> }) {
  const denied = await denyUnless("/dashboard/regulations");
  if (denied) return denied;
  const ed = await getRegEditor();
  if (!ed) return <p>لا تملك تحرير الأنظمة.</p>;
  const { slug = "elections", s } = await searchParams;
  const real = await getRoomDoc(ed.sb, slug);
  if (!real) notFound();
  const today = riyadhToday();
  const past = (n: number) => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
  const v1 = { no: 1, effectiveFrom: past(30), changeNote: "الإصدار الأوّل.", approvalNote: "أقرّه الرئيسان بعد عرضه على المجلس الإداري.", publishedAt: `${past(30)}T09:00:00Z`, state: "current" as const };
  const first = real.body.flatMap((c) => c.articles);
  const appr = (seat: "club_president" | "executive_council_president") => ({ seat, label: seat === "club_president" ? "رئيس أدِيب" : "الرئيسة التنفيذية", name: seat === "club_president" ? "محمد إسماعيل المطر" : "بشائر", at: `${today}T08:00:00Z` });
  const doc: RoomDoc = s === "none" ? { ...real, launched: true, published: true, draft: null, versions: [v1] }
    : s === "draft" || s === "both" ? { ...real, launched: true, published: true, versions: [v1], draft: {
      no: 2, rev: real.draft?.rev ?? "lab", approvals: s === "both" ? [appr("club_president"), appr("executive_council_president")] : [appr("club_president")],
      changes: { ...(first[18] ? { [first[18].no]: "edited" as const } : {}), ...(first[22] ? { [first[22].no]: "new" as const } : {}) }, removed: [], chapters: [],
    } }
    : real;
  const all = await docs();
  const pub = all.find((d) => d.slug === slug);
  const asDoc = { slug, title: real.title, summary: pub?.summary ?? "", note: pub?.note ?? "", chapters: real.body };
  const { previews, cited, docNames, counts, next } = docContext(asDoc, all.map((d) => (d.slug === slug ? asDoc : d)));
  return <RegEditorRoom doc={doc} seat={ed.seat} today={today} summary={asDoc.summary} note={asDoc.note}
    ctx={{ previews, cited, docNames, counts, next }} serverNow={await requestNow()} dry />;
}
