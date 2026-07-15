import Link from "next/link";
import { createAdeebServerClient } from "@adeeb/core";
import { WorksWall } from "./WorksWall";
import type { Work } from "./WorkLightbox";

/** قسم حيّ: مختارات من أعمال أديب (works) كجدار حيّ بأعمدة متعاكسة — تعريفٌ لا أرشيف. */
export async function WorksGallery() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("works")
    .select("id,title,category,image_url,link_url")
    .order("order", { ascending: true })
    .limit(24)
    .returns<Work[]>();

  if (error) {
    return <p className="text-danger">تعذّر جلب الأعمال: {error.message}</p>;
  }
  if (!data || data.length === 0) {
    return <p className="text-content-muted">لا توجد أعمال منشورة بعد.</p>;
  }

  return (
    <>
      <WorksWall works={data} />
      <div className="mt-10 flex justify-center">
        <Link href="/works" className="abtn abtn-ghost abtn-lg">
          تصفّح كل الأعمال
        </Link>
      </div>
    </>
  );
}
