import "server-only";
import { createAdeebServerClient } from "@adeeb/core";

// عميل قراءة عامّ (مفتاح anon). ولا يقرأ جدولًا: بابُه دالّةٌ واحدة `get_public_profile`
// تُرجِع ما يُنشَر وحدَه، فقانونُ الخصوصيّة محروسٌ في القاعدة لا في هذه الشاشة.
const anon = () =>
  createAdeebServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export type PublicBadge = {
  key: string;
  name: string;
  how: string;
  icon: string;
  earnedAt: string | null;
  evidence: string | null;
  current: number | null;
  threshold: number | null;
};

/** قطعُ المنصب خامًا. الجملةُ تُركَّب في `lib/positionLabel` فمصدرُها واحد. */
export type PublicPosition = {
  roleAr: string;
  homeCommitteeId: number | null;
  homeName: string | null;
  committeeId: number | null;
  unitName: string | null;
  since: string | null;
};

export type PublicProfile = {
  slug: string;
  name: string;
  avatar: string | null;
  gender: string | null;
  bio: string | null;
  joinedDate: string | null;
  positions: PublicPosition[];
  badges: PublicBadge[];
  college: string | null;
  major: string | null;
  degree: string | null;
  links: { twitter?: string; instagram?: string; tiktok?: string; linkedin?: string };
};

export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  const { data, error } = await anon().rpc("get_public_profile", { p_slug: slug });
  if (error || !data) return null;
  return data as unknown as PublicProfile;
}
