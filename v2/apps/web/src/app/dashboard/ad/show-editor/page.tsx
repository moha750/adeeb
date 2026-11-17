import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getRadioManager } from "@/lib/radio/authz";
import { getMemberOptions, getShowEditor, getShows } from "@/app/dashboard/radio/data";
import { ShowEditorRoom } from "@/app/_ad/rooms/ShowEditorRoom";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٦): **محرّرُ البرنامج على المنضدة** ببرنامجٍ حقيقيّ (`?id=`، وبلاه أوّلُ برنامج)، وكلُّ فعلٍ فيه لا يُحفظ
 * (فتحُ الحلقة يقرأ نصوصَها الحقيقيّة). والحاليُّ للمقارنة: `/dashboard/radio/<id>`. و`?s=draft` حالُ البرنامج مسوّدةً، و`?s=empty` بلا حلقات.
 */
export const metadata = { title: "محرّر البرنامج: المنضدة" };

export default async function ShowEditorLab({ searchParams }: { searchParams: Promise<{ id?: string; s?: string }> }) {
  const denied = await denyUnless("/dashboard/radio");
  if (denied) return denied;
  if (!(await getRadioManager())) return <p>لا تملك إدارة الإذاعة.</p>;
  const { id, s } = await searchParams;
  const pick = id ?? (await getShows()).shows[0]?.id;
  if (!pick) return <p>لا برنامج.</p>;
  const [{ data, error }, members] = await Promise.all([getShowEditor(pick), getMemberOptions()]);
  if (error || !data) return <p>{error ?? "لا برنامج بهذا المعرّف."}</p>;
  return <ShowEditorRoom show={s === "draft" || s === "empty" ? { ...data.show, status: "draft" } : data.show} episodes={s === "empty" ? [] : data.episodes}
    platforms={data.platforms} members={members} showTalkStart={data.showTalkStart} dry />;
}
