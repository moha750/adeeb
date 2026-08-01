import { Alert } from "@adeeb/design-system";

export const NewsHead = ({ crumb = "الأخبار" }: { crumb?: string }) => (
  <div className="ash-phead">
    <div>
      <div className="ash-crumb">أديب › المحتوى › <b>{crumb}</b></div>
      <h1>غرفة تحرير أدِيب</h1>
    </div>
  </div>
);

/**
 * تنبيه «لا صلاحية» لصفحات الأخبار — يُعرض لمن لا يملك `manage_news` ولا `write_news`
 * (ولو كان من الإدارة العليا: الرتبة لا تعني الوصول، القدرة وحدها تعنيه).
 *
 * و`write_news` **تُمنح بالتكليف**: أوّل خبرٍ يُكلَّف به العضو يفتح له الغرفة.
 */
export function NewsroomDenied() {
  return (
    <>
      <NewsHead />
      <Alert tone="warning" title="لا تملك صلاحية دخول غرفة التحرير">
        هذه الصفحة لمن مُنحت له قدرة «إدارة الأخبار» أو «كتابة الأخبار». وقدرة الكتابة
        تُمنح بالتكليف — فحين يكلّفك رئيس التحرير بخبرٍ فُتحت لك الغرفة تلقائيًّا.
      </Alert>
    </>
  );
}
