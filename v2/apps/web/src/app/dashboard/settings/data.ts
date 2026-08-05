// إعدادات **صاحب الجلسة** — خادميّ حصرًا.
//
// ولا مفتاحَ خدمةٍ هنا خلافًا لبقيّة الغرف: الجلسات تُقرأ بجلسة صاحبها (`my_sessions` تقرأ
// `auth.uid()` وحدها)، فالعميلُ عميلُ الكوكيز لا العميلُ المتجاوز. وهذا أضيقُ وأصدق: لا
// يستطيع هذا الملفّ قراءةَ جلسات غيره ولو أراد.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/date";

export type MySession = {
  id: string;
  /** وصفُ الجهاز مشتقًّا من `user_agent` — «Chrome على macOS» لا سلسلةً خامًا. */
  device: string;
  ip: string | null;
  started: string;
  lastSeen: string;
  /** الجلسة التي تقرأ بها هذه الشاشة الآن. */
  current: boolean;
};

export type MySettings = {
  email: string;
  sessions: MySession[];
  /** تعذّرت قراءة الجلسات — يُقال ولا يُبتلَع (الشاشة تعرض الباقي). */
  sessionsError: string | null;
};

/* ── وصفُ الجهاز من `user_agent` ────────────────────────────────────────────
 * تعرّفٌ خشنٌ عن قصد: الغرض أن يعرف صاحبُها «أهذه جلستي من جوّالي أم من حاسب الجامعة؟»،
 * لا أن نبني مكتبة تحليل. وما لا يُعرَف يُقال «جهازٌ غير معروف» لا يُخمَّن.
 */
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Chrome\/|CriOS/, "Chrome"],
  [/Firefox\/|FxiOS/, "Firefox"],
  [/Safari\//, "Safari"],
];
const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPod/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

export function describeDevice(ua: string | null): string {
  if (!ua) return "جهازٌ غير معروف";
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
  const system = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  if (browser && system) return `${browser} على ${system}`;
  return browser ?? system ?? "جهازٌ غير معروف";
}

/**
 * معرّفُ الجلسة الحاليّة من رمز الوصول (`session_id` في حمولته).
 *
 * يُفكّ الرمز **قراءةً لا تصديقًا**: لا يُبنى عليه إذنٌ ولا تفويض — كلُّ عمله أن يضع وسمَ
 * «هذه جلستك» على صفٍّ في جدول. وقارئُ الجلسات نفسُه محروسٌ في القاعدة بـ`auth.uid()`.
 */
function currentSessionId(accessToken: string | undefined): string | null {
  const payload = accessToken?.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { session_id?: string };
    return json.session_id ?? null;
  } catch {
    return null;
  }
}

export async function getMySettings(): Promise<{ settings: MySettings | null; error: string | null }> {
  const supabase = await createClient();

  const { data: { user }, error: uErr } = await supabase.auth.getUser();
  if (uErr) return { settings: null, error: uErr.message };
  if (!user) return { settings: null, error: null }; // التخطيط يحوّل للدخول قبل أن نصل هنا

  const { data: { session } } = await supabase.auth.getSession();
  const here = currentSessionId(session?.access_token);

  const { data, error } = await supabase.rpc("my_sessions");
  const rows = (data ?? []) as { id: string; created_at: string; last_seen: string; user_agent: string | null; ip: string | null }[];

  return {
    settings: {
      email: user.email ?? "",
      sessions: rows.map((s) => ({
        id: s.id,
        device: describeDevice(s.user_agent),
        ip: s.ip,
        started: fmtDate(s.created_at),
        lastSeen: fmtDate(s.last_seen),
        current: s.id === here,
      })),
      sessionsError: error?.message ?? null,
    },
    error: null,
  };
}
