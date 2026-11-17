import { notFound } from "next/navigation";
import { AdRoomDenied } from "@/app/_ad/states";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getRegEditor } from "@/lib/regulations/authz";
import { docContext, docs } from "@/lib/regulations/data";
import { RegEditorRoom } from "@/app/_ad/rooms/RegEditorRoom";
import { requestNow } from "@/app/_ad/now";
import { getRoomDoc, riyadhToday } from "../data";

/**
 * **محرّرُ النظام على المنضدة** (`RegEditorRoom`، اعتمده محمد ٢٠٢٦-١١-١٦ بعد المختبر `/dashboard/ad/reg-editor`): الموادُّ قطعٌ تُحرَّر في
 * موضعها بالمحرّر المرئيّ، والمنضدةُ تُري الوثيقةَ كما ستُقرأ. وما يحتاجه العارضُ العامّ (المعاينات، ومن يُحال إليه) يُحسب هنا كما في صفحة القراءة.
 */
export default async function RegulationEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const denied = await denyUnless("/dashboard/regulations");
  if (denied) return denied;
  const ed = await getRegEditor();
  if (!ed) return <AdRoomDenied title="أنظمة أدِيب" navPath="/dashboard/regulations" what="تحرير الأنظمة" desc="هذه الغرفة لرئيس أدِيب والرئيس التنفيذي." />;
  const { slug } = await params;
  const doc = await getRoomDoc(ed.sb, slug);
  if (!doc) notFound();
  const all = await docs();
  const pub = all.find((d) => d.slug === slug);
  // المنضدةُ تقرأ الوثيقةَ بمسوّدتها، وسائرُ الوثائق كما نُشرت: فالإحالاتُ إلى موادّ هذه تُقرأ بأرقام المسوّدة
  const asDoc = { slug, title: doc.title, summary: pub?.summary ?? "", note: pub?.note ?? "", chapters: doc.body };
  const { previews, cited, docNames, counts, next } = docContext(asDoc, all.map((d) => (d.slug === slug ? asDoc : d)));
  return <RegEditorRoom doc={doc} seat={ed.seat} today={riyadhToday()} summary={asDoc.summary} note={asDoc.note}
    ctx={{ previews, cited, docNames, counts, next }} serverNow={await requestNow()} />;
}
