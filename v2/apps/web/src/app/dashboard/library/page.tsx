import { Alert } from "@adeeb/design-system";
import { getBooks } from "./data";
import { LibraryView } from "./LibraryView";
import { getLibraryManager } from "@/lib/library/authz";
import { LibraryDenied } from "./_guard";
import { denyUnless } from "@/app/dashboard/_shell/guard";

export default async function LibraryPage() {
  const denied = await denyUnless("/dashboard/library");
  if (denied) return denied;

  if (!(await getLibraryManager())) return <LibraryDenied />;

  const { books, error } = await getBooks();

  if (error) {
    return (
      <>
        <div className="ash-phead">
          <div>
            <div className="ash-crumb">أديب › المحتوى › <b>المكتبة</b></div>
            <h1>مكتبة «إرثٌ يُروى»</h1>
          </div>
        </div>
        <Alert tone="warning" title="تعذّر جلب المنشورات">{error}</Alert>
      </>
    );
  }

  return <LibraryView books={books} />;
}
