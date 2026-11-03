import { notFound } from "next/navigation";
import { getPublicVision } from "@/lib/vision/data";
import { VisionPage, visionMetadata } from "../_parts/VisionPage";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

const SLUG = /^[a-z0-9-]{2,40}$/;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return SLUG.test(slug) ? visionMetadata(slug) : {};
}

/** **رؤيةٌ بعينها** من «رؤى أدِيب» — سارية أو منتهية — بالقالب نفسِه. والمسوّدةُ لا تُنشر (الدالّةُ لا تُخرجها). */
export default async function VisionBySlug({ params }: Props) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();
  const { data, error } = await getPublicVision(slug);
  if (!data && !error) notFound();
  return <VisionPage slug={slug} />;
}
