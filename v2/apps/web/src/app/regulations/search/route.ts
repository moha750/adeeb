import { searchRows } from "@/lib/regulations/data";

// فهرسُ البحث العامّ: سطرٌ لكلّ مادّة، يُطلب أوّلَ ما يُلمس حقلُ البحث في الفهرس.
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return Response.json(await searchRows());
}
