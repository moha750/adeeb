import { notFound } from "next/navigation";
import { Alert } from "@adeeb/design-system";
import { getBookEditor } from "../data";
import { BookEditorView } from "./BookEditorView";
import { getLibraryManager } from "@/lib/library/authz";
import { LibraryDenied } from "../_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";

export default async function BookEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const denied = await denyUnless("/dashboard/library");
  if (denied) return denied;

  if (!(await getLibraryManager())) return <LibraryDenied />;

  const { id } = await params;
  const { book, pages, error } = await getBookEditor(id);

  if (error) {
    return (
      <>
        <PageHeader title="تحرير المنشور" crumbLeaf="تحرير" />
        <Alert tone="warning" title="تعذّر جلب المنشور">{error}</Alert>
      </>
    );
  }
  if (!book) notFound();

  return <BookEditorView book={book} initialPages={pages} />;
}
