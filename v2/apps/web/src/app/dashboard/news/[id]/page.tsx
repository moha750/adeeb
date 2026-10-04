import { Alert } from "@adeeb/design-system";
import { notFound } from "next/navigation";
import { getNewsroomActor } from "@/lib/news/authz";
import { getMemberOptions, getNewsDetail, getUnitOptions } from "../data";
import { getCreditPeople } from "@/lib/people";
import { NewsEditorView } from "./NewsEditorView";
import { NewsHead, NewsroomDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function NewsEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/news");
  if (denied) return denied;

  const actor = await getNewsroomActor();
  if (!actor) return <NewsroomDenied />;

  const { id } = await params;
  // بِركةُ النسبة تُجلب للكاتب أيضًا: «الكتّاب» و«مصوّر الغلاف» حقلا تكليفٍ قد يملكهما،
  // فلو قُصرت على رئيس التحرير لرأى الكاتبُ منتقيًا فارغًا لا يعرف أحدًا.
  const [{ detail, error }, members, units, people] = await Promise.all([
    getNewsDetail(id, actor),
    actor.isChief ? getMemberOptions() : Promise.resolve([]),
    actor.isChief ? getUnitOptions() : Promise.resolve([]),
    getCreditPeople(),
  ]);

  if (error) {
    return (
      <>
        <NewsHead />
        <Alert tone="warning" title="تعذّر جلب الخبر">{error}</Alert>
      </>
    );
  }
  // لا خبر — أو خبرٌ لا شأن لهذا الفاعل به. الجوابان واحد: لا نُفصح عن وجوده.
  if (!detail) notFound();

  return (
    <NewsEditorView
      detail={detail}
      members={members}
      units={units}
      people={people}
      isChief={actor.isChief}
      meId={actor.userId}
    />
  );
}
