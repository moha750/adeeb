import "server-only";
import { cache } from "react";
import { createAdeebServerClient } from "@adeeb/core";
import type { PublicVision } from "./types";

/**
 * **الرؤيةُ كما تُقال للناس** — بمفتاح الزائر من الدالّة الآمنة `get_public_vision` (لا من الجداول، وهي مغلقة):
 * فلا يخرج من القاعدة إلّا المنشور، و«الواقعُ اليوم» الذي كُتب للمجلس يبقى فيها (محمد ٢٠٢٦-١١-٠٣).
 * بلا `slug`: الرؤيةُ السارية (فإن لم تكن فآخرُ منتهية). و`null` حين لا رؤيةَ منشورة.
 * ومخبّأةٌ للطلب الواحد (`cache`): الوصفُ والصفحةُ وفحصُ «غير موجودة» يقرؤونها مرّةً واحدة.
 */
export const getPublicVision = cache(async (slug?: string): Promise<{ data: PublicVision | null; error: string | null }> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return { data: null, error: "أضِف NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_ANON_KEY إلى apps/web/.env.local." };
  const sb = createAdeebServerClient(url, anon);
  const { data, error } = await sb.rpc("get_public_vision", slug ? { p_slug: slug } : {});
  if (error) return { data: null, error: error.message };
  return { data: (data as PublicVision | null) ?? null, error: null };
});
