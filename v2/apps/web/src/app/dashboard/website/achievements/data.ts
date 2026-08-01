// يُستورَد فقط من مكوّنات خادميّة (page.tsx). المفتاح بلا بادئة NEXT_PUBLIC فلا يصل المتصفّح.
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

export type AchievementRow = {
  id: string;
  label: string;
  count: number;
  plus: boolean;
  icon: string | null;   // مفتاح أيقونة (icon_class)؛ فارغ = تلقائيّ من النصّ
  order: number;
};

/** قائمة الإحصاءات مرتّبةً كما تظهر في «ملخص المسيرة» (order تصاعديًّا). */
export async function getAchievements(): Promise<{ items: AchievementRow[]; error: string | null }> {
  const sb = service();
  if (!sb) return { items: [], error: KEY_HINT };

  const { data, error } = await sb
    .from("achievements")
    .select("id, label, count_number, plus_flag, icon_class, order")
    .order("order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return { items: [], error: error.message };

  const items: AchievementRow[] = (data ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    count: a.count_number,
    plus: a.plus_flag ?? false,
    icon: a.icon_class ?? null,
    order: a.order,
  }));
  return { items, error: null };
}

export type AchievementEditData = {
  id: string;
  label: string;
  count: number;
  plus: boolean;
  icon: string | null;
};

export async function getAchievementForEdit(id: string): Promise<{ item: AchievementEditData | null; error: string | null }> {
  const sb = service();
  if (!sb) return { item: null, error: KEY_HINT };

  const { data, error } = await sb
    .from("achievements")
    .select("id, label, count_number, plus_flag, icon_class")
    .eq("id", id)
    .maybeSingle();
  if (error) return { item: null, error: error.message };
  if (!data) return { item: null, error: null };

  return {
    item: { id: data.id, label: data.label, count: data.count_number, plus: data.plus_flag ?? false, icon: data.icon_class ?? null },
    error: null,
  };
}
