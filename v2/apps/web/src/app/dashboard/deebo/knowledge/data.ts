// يُستورَد من مكوّنات خادميّة وحدها (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقية المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

const KEY_HINT = "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم.";

/** واقعةٌ من وقائع ديبو الثابتة — صفٌّ من `deebo_knowledge` بأسماء الواجهة. */
export type FactRow = {
  id: string;
  /** معرّفٌ داخليٌّ يُطبع مع المقطع في نصّ التوجيه. لا يُعرَض ولا يُحرَّر. */
  slug: string;
  title: string;
  body: string;
  sort: number;
  /** الموقوفةُ تبقى في الغرفة ولا تدخل نصَّ التوجيه. */
  isActive: boolean;
};

/**
 * وقائعُ ديبو مرتّبةً — **الموقوفةُ معها**.
 *
 * والغرفةُ تقرأ بمفتاح الخدمة كسائر غرف اللوحة (التفويضُ عند الباب): سياسةُ القراءة
 * في القاعدة تُظهر القائمَ للعموم، وصاحبُ الغرفة يرى الموقوفَ أيضًا — فلو قُرئ بعميل
 * الجلسة لَما رآه إلّا بعد نداءِ `check_user_permission` في كلّ صفّ.
 */
export async function getFacts(): Promise<{ facts: FactRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { facts: [], error: KEY_HINT };

  const { data, error } = await sb
    .from("deebo_knowledge")
    .select("id, slug, title, body, sort, is_active")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return { facts: [], error: error.message };

  const facts: FactRow[] = (data ?? []).map((f) => ({
    id: f.id,
    slug: f.slug,
    title: f.title,
    body: f.body,
    sort: f.sort,
    isActive: f.is_active,
  }));
  return { facts, error: null };
}

export type FactEditData = {
  id: string;
  title: string;
  body: string;
  isActive: boolean;
};

export async function getFactForEdit(
  id: string,
): Promise<{ fact: FactEditData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { fact: null, error: KEY_HINT };

  const { data, error } = await sb
    .from("deebo_knowledge")
    .select("id, title, body, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) return { fact: null, error: error.message };
  if (!data) return { fact: null, error: null };

  return {
    fact: { id: data.id, title: data.title, body: data.body, isActive: data.is_active },
    error: null,
  };
}
