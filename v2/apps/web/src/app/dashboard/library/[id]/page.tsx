import { notFound } from "next/navigation";
import { getBookEditor } from "../data";
import { BookEditorRoom } from "@/app/_ad/rooms/BookEditorRoom";
import { getLibraryManager } from "@/lib/library/authz";
import { LibraryDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { AdRoomError } from "@/app/_ad/states";

export default async function BookEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/library");
  if (denied) return denied;

  if (!(await getLibraryManager())) return <LibraryDenied />;

  const { id } = await params;
  const { book, pages, error } = await getBookEditor(id);

  // **بالقطعة لا بالتنبيه القديم** (٢٠٢٦-١١-١٧): لوحُ الغرفة، ورمزُ السحابة المنقطعة، و«إعادة المحاولة» و«أبلغ الدعم الفني»
  if (error) return <AdRoomError title="تحرير المنشور" navPath="/dashboard/library" what="المنشور" message={error} />;
  if (!book) notFound();

  // **المحرّرُ على المنضدة** (اعتمده محمد ٢٠٢٦-١١-١٦). و`BookEditorView` القديمُ نُقل للحذف بقراره (٢٠٢٦-١١-٢٠)
  return <BookEditorRoom book={book} initialPages={pages} />;
}
