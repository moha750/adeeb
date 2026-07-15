import { createAdeebServerClient } from "@adeeb/core";
import { StatsTreemap } from "./StatsTreemap";

type Ach = { label: string; count_number: number };

/** ملخص المسيرة — كروت بحجم الرقم (Treemap) من بيانات achievements الحيّة. */
export async function AchievementsTreemap() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb
    .from("achievements")
    .select("label,count_number")
    .order("order", { ascending: true })
    .returns<Ach[]>();

  if (error) {
    return <p className="text-center text-white/70">تعذّر جلب الإحصاءات: {error.message}</p>;
  }
  if (!data || data.length === 0) return null;

  return <StatsTreemap items={data.map((d) => ({ label: d.label, n: d.count_number }))} />;
}
