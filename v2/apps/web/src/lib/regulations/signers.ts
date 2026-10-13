import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * كلمةُ الرئيسين عند إصدار الأنظمة (اعتمدها المالك ٢٠٢٦-١٠-١٣): لكلٍّ كلمتُه القصيرة وصورتُه. **والموقّعان
 * بأعيانهما لا بمقعدَيهما**، فالكلمةُ مؤرّخةٌ بالإصدار الأوّل وتبقى لصاحبيها إذا تبدّل الرئيسان.
 * والصورةُ تُقرأ من ملفّيهما حيّةً (بعميل الخدمة كالهيكل العلنيّ، فـ`profiles` لا يقرؤها الزائر)، فإن تعذّرت
 * فرسمُ الجنس.
 */
export type RegSigner = { id: string; name: string; role: string; gender: "male" | "female"; avatar: string | null; word: string };

const SIGNERS: Omit<RegSigner, "avatar">[] = [
  {
    id: "8dd48fe4-d01f-4fa9-90bc-1bcaf154fe22",
    name: "محمد المطر",
    role: "رئيس أدِيب",
    gender: "male",
    // ⚠️ نصٌّ مؤقّت بطلب المالك (٢٠٢٦-١٠-١٣) حتى يكتب كلُّ رئيسٍ كلمتَه — يُستبدل قبل النشر.
    word: "هنا نص الرئيس",
  },
  {
    id: "f4a1cd18-9a27-4316-bb7a-ba8fd363bac1",
    name: "بشائر الحداد",
    role: "الرئيسة التنفيذية",
    gender: "female",
    word: "هنا نص الرئيسة",
  },
];

export async function regSigners(): Promise<RegSigner[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  const avatars = new Map<string, string | null>();
  if (url && key) {
    const { data } = await createAdeebServiceClient(url, key)
      .from("profiles")
      .select("id, avatar_url")
      .in("id", SIGNERS.map((s) => s.id));
    for (const r of data ?? []) avatars.set(r.id as string, (r.avatar_url as string | null) ?? null);
  }
  return SIGNERS.map((s) => ({ ...s, avatar: avatars.get(s.id) ?? null }));
}
