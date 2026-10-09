import { QrImageView, QrPdfView } from "@/app/q/_view/QrFileView";

/**
 * **نافذةُ المعرض** — الصفحةُ العلنيّةُ بهيئتها، تُفتح داخل `iframe` في `/ui/qr-image`.
 *
 * نافذةٌ حقيقيّة لا صندوق: الهيئةُ تقيس ارتفاعَ **النافذة** (`svh`)، وصندوقٌ داخل شاشةٍ عريضة
 * يكذب في ذلك (سابقةُ `/ui/qr-dock`). والصورتان من أصول الموقع: طوليّةٌ كالملصق، وعرضيّةٌ
 * كالشريحة، لأنّ الهيئةَ تُحكَم بأسوأ ما يُرفع لا بأجمله. و`pic=pdf` بطاقةُ الـPDF.
 */

export const metadata = { title: "ملف الباركود، معرض أدِيب", robots: { index: false, follow: false } };

const PICS = {
  tall: "/games/cabinets/darbak-khadar.jpg",
  wide: "/share/adeeb.png",
} as const;

export default async function QrFileScreen({ searchParams }: { searchParams: Promise<{ pic?: string }> }) {
  const { pic } = await searchParams;
  if (pic === "pdf") return <QrPdfView src="#" save="#" />;
  const src = PICS[pic === "wide" ? "wide" : "tall"];
  return <QrImageView src={src} save={src} />;
}
