import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * **تبويبُ غرفة التحرير باسم ما يُحرَّر** («منعطف، بوّابة أدِيب» لا «تحرير البرنامج»، محمد ٢٠٢٦-١١-٢٠)، فتعرف تبويبَك بين تبويبات.
 * سطرٌ واحدٌ من جدوله بعميل الجلسة، فما لا تراه بصلاحيّتك (RLS) لا يُكشف اسمُه في التبويب، ويعود الاسمُ العامّ.
 */
export async function tabTitle(table: string, col: string, key: string, val: string, fallback: string): Promise<Metadata> {
  try {
    const sb = await createClient();
    const { data } = await sb.from(table).select(col).eq(key, val).maybeSingle();
    const name = (data as Record<string, unknown> | null)?.[col];
    return { title: `${typeof name === "string" && name.trim() ? name.trim() : fallback}، بوّابة أدِيب` };
  } catch {
    return { title: `${fallback}، بوّابة أدِيب` };
  }
}
