import { redirect } from "next/navigation";
import { createAdeebServerClient } from "@adeeb/core";
import { isQrCode, isQrFilePath, qrFileSaveUrl, qrFileType, qrFileUrl } from "@/lib/qrLinks";
import { QrImageView, QrPdfView } from "../../_view/QrFileView";

/**
 * **صفحةُ الباركود الذي وجهتُه ملف** (م٢١ وم٢٤) — حيث يصل الماسحُ بعد أن يعدّه بابُ الرمز.
 *
 * بابُ الرمز (`‎/q/<code>`) يعدّ ويحوّل إلى هنا كما يحوّل إلى أيّ رابط، فلا يعرف أنّه ملف.
 * وهذه تسأل القاعدةَ عن الملفّ بدالّةٍ لا ترجع إلّا مسارَه (`qr_file_of`): لا اسمَ الباركود
 * (الاسمُ لصاحبه وحدَه) ولا مالكَه ولا عدّادَه. ومن فتحها مباشرةً لم يُعَدّ، وهو الصواب: العدُّ
 * للمسح لا للصفحة. ونوعُ الملفّ من امتداده: صورةٌ تُعرَض، وPDF تُقدَّم بطاقتُه.
 *
 * **ديناميّةٌ لا ساكنة**: الملفُّ يُستبدَل والباركودُ يُوقف أو يتحوّل رابطًا، وصفحةٌ مخبّأةٌ تعرض
 * القديم. والموقوفُ والمجهولُ يخرجان من بابٍ واحد (`‎/q/unavailable`) كما في بابه.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "نادي أدِيب",
  robots: { index: false, follow: false },
};

export default async function QrFilePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isQrCode(code)) redirect("/q/unavailable");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) redirect("/q/unavailable");

  const { data, error } = await createAdeebServerClient(url, key).rpc("qr_file_of", { p_code: code });
  if (error || typeof data !== "string" || !isQrFilePath(data)) redirect("/q/unavailable");

  const props = { src: qrFileUrl(data), save: qrFileSaveUrl(data) };
  return qrFileType(data) === "pdf" ? <QrPdfView {...props} /> : <QrImageView {...props} />;
}
