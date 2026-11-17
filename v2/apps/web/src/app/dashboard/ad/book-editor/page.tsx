import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getBookEditor, service } from "@/app/dashboard/library/data";
import { BookEditorRoom } from "@/app/_ad/rooms/BookEditorRoom";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٦): **محرّرُ الكتيّب على المنضدة** بكتيّبٍ حقيقيّ (`?id=`، وبلاه أوّلُ كتيّب)، وكلُّ فعلٍ فيه لا يُحفظ.
 * والحاليُّ للمقارنة: `/dashboard/library/<id>`. و`?s=draft` حالُ المسوّدة، و`?s=empty` كتيّبٌ بلا صفحات.
 */
export const metadata = { title: "محرّر الكتيّب: المنضدة" };

export default async function BookEditorLab({ searchParams }: { searchParams: Promise<{ id?: string; s?: string }> }) {
  const denied = await denyUnless("/dashboard/library");
  if (denied) return denied;
  const { id, s } = await searchParams;
  const pick = id ?? (await service()?.from("library_books").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle())?.data?.id;
  if (!pick) return <p>لا كتيّب.</p>;
  const { book, pages, error } = await getBookEditor(pick);
  if (error || !book) return <p>{error ?? "لا كتيّب بهذا المعرّف."}</p>;
  // `?s=draft` يعرض حالَ المسوّدة (الكتيّبُ الوحيدُ منشور)، و`?s=empty` الكتيّبَ بلا صفحات
  return <BookEditorRoom book={s === "draft" || s === "empty" ? { ...book, status: "draft" } : book} initialPages={s === "empty" ? [] : pages} dry />;
}
