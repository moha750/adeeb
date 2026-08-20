/**
 * متغيّراتُ البيئة، مقروءةً في مكانٍ واحد.
 *
 * Expo يستبدل `process.env.EXPO_PUBLIC_*` نصًّا عند البناء، فلا يصحّ قراءتُها بمفتاحٍ
 * محسوب (`process.env[name]`) — يخرج `undefined` في الحزمة وإن كانت القيمةُ موجودة.
 * لذلك تُكتب كلُّ واحدةٍ صريحةً هنا مرّةً واحدة.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const R2_PUBLIC_BASE = process.env.EXPO_PUBLIC_R2_PUBLIC_BASE;

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`متغيّرٌ ناقص: ${name} — انسخ .env.example إلى .env.local واملأه`);
  return value;
}

export const env = {
  supabaseUrl: required(SUPABASE_URL, "EXPO_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: required(SUPABASE_ANON_KEY, "EXPO_PUBLIC_SUPABASE_ANON_KEY"),
  r2PublicBase: required(R2_PUBLIC_BASE, "EXPO_PUBLIC_R2_PUBLIC_BASE"),
};

/**
 * يبني رابطَ ملفٍّ في R2 من مفتاحه.
 * القاعدةُ تخزّن **المفتاح** لا الرابط، والويبُ يركّبه في `lib/radio/r2.ts` على الخادم.
 * هذه هي نظيرتُها في الجوّال: نفسُ الترميز (كلُّ مقطعٍ يُرمَّز، والشرطةُ المائلةُ تبقى).
 */
export function r2Url(key: string | null | undefined): string | null {
  if (!key) return null;
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${env.r2PublicBase}/${encoded}`;
}
