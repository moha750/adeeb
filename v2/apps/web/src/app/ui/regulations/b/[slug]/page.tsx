import { redirect } from "next/navigation";

// رابطُ الخيار «ب» القديم (٢٠٢٦-١٠-١٢) يُحوَّل إلى صفحة الوثيقة العلنيّة: بقي له تبويبٌ مفتوحٌ
// يُبقي خادمَ التطوير يبني ملفَّه المحذوف فيُظهر خطأً على كلّ الصفحات. يُحذف متى أُذن بالحذف.
export default async function OldOptionB({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/regulations/${slug}`);
}
