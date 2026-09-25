import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * **أرقامُ «دربك خضر» منذ افتتاح المسابقة** — نداءٌ واحدٌ لـ`darb_stats()` بمفتاح الخدمة
 * (الجداولُ بلا سياسةٍ تحت RLS، والدالّةُ لمفتاح الخدمة وحده). والصفحةُ لا تُفتح إلّا لمن يملك
 * قدرةَ إحصائيّات الموقع، فالحارسُ قبل النداء لا بعده.
 */
export type DarbStats = {
  startsAt: string;
  endsAt: string;
  now: string;
  /** زوّارُ صفحة اللعبة الفريدون. وشاشةُ اللعب ملفٌّ ثابتٌ لا يتتبّعه متتبّعُ الموقع. */
  visitors: number;
  views: number;
  /** من بدأ جولةً واحدةً على الأقلّ. واللاعبُ متصفّحٌ أو حساب، لا شخص. */
  players: number;
  newPlayers: number;
  runs: number;
  runsDone: number;
  cups: number;
  /** حساباتُ أدِيب التي أُنشئت من أجل اللعبة منذ الافتتاح، و`accountsAll` منذ أوّل لاعب. */
  accounts: number;
  accountsAll: number;
  hourly: { hour: string; runs: number; players: number }[];
  daily: { day: string; visitors: number; players: number; runs: number; accounts: number }[];
};

export async function getDarbStats(): Promise<{ data: DarbStats | null; error: string | null }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return { data: null, error: "أضِف SUPABASE_SERVICE_ROLE_KEY إلى apps/web/.env.local ثمّ أعِد تشغيل الخادم." };
  const sb = createAdeebServiceClient(url, key);
  const { data, error } = await sb.rpc("darb_stats");
  if (error) return { data: null, error: error.message };
  return { data: data as DarbStats, error: null };
}
