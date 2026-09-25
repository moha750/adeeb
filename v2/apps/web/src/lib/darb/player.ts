/**
 * **هويّةُ لاعب «دربك خضر»** — رمزٌ في الجهاز وبصمتُه في القاعدة، ولا شيءَ غيرُهما.
 *
 * ⚠️ خادميٌّ محض: يقرأ الملحَ ويكتب الكوكيز، فلا يُستورد في كودٍ عميليّ.
 *
 * ## لا رقمَ جوّال، والحسابُ اختياريّ (قرارا المالك ٢٠٢٦-٠٩-٢٤)
 * انسحب الراعي فلا جوائز، والفائزُ يُعلَن باسمه المستعار في منشور. فلا غرضَ لرقمٍ
 * يُجمع، وما لا غرضَ له لا يُجمع (نظامُ حماية البيانات).
 *
 * **والضيفُ يُعرَف برمز متصفّحه** وحدَه، فاسمُه في ذلك المتصفّح لا يعبر إلى غيره.
 * **ومن دخل بحساب أدِيب عُرِف بحسابه** في كلّ جهازٍ، وضُمّ إليه ضيفُ متصفّحه أوّلَ مرّة. والطريقان
 * في `who()`. **وكان للضيف رمزُ استرجاعٍ من عشرة أرقام ينقل به اسمَه، فأُزيل نهائيًّا** (قرارُ المالك
 * ٢٠٢٦-٠٩-٢٥: «نكتفي بإنشاء حسابٍ من أدِيب لحفظ تقدّمك والتواصل معك عند الفوز»)، ومعه بابا
 * `code` و`restore` ودوالُّهما وعمودُه في القاعدة (الترحيلان `20260925132617` و`20260925134050`).
 *
 * ## والنمطُ نمطُ «خمّن الكلمة» (`lib/games/player.ts`) بقراراته نفسِها
 * الرمزُ الخامّ في كوكيز `httpOnly` لا في `localStorage` (سكربتٌ في الصفحة لا يبلغه)،
 * والقاعدةُ لا ترى إلّا `sha256("wt" ‖ الرمز ‖ الملح)`. والبادئةُ `wt` تفصل المجال عن
 * بصمة الغرف (`gw`) مع أنّ الملحَ واحد. **ولا تدور البصمةُ مع اليوم**: هي مفتاحُ حسابٍ
 * يعيش الموسمَ كلَّه.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { createAdeebServiceClient } from "@adeeb/core";
import { createClient } from "@/lib/supabase/server";

const COOKIE = "darb_player";
/** مسارُ البرنامج: الكوكيزُ لا تُرسَل إلّا إليه، فلا تثقل كلَّ طلبٍ في الموقع. */
const PATH = "/games/darbak-khadar";
/** ستّةُ أشهر: الموسمُ وما بعده، ثمّ تنتهي في جهازٍ ربّما صار لغير صاحبه. */
const MAX_AGE = 180 * 24 * 60 * 60;

export function newToken(): string {
  return randomBytes(32).toString("hex");
}

/** بصمةٌ بمجالٍ وملح: `sha256(مجال ‖ القيمة ‖ الملح)`. والمجالُ يفصل رمزَ الجهاز (`wt`) عن
    رمز الاسترجاع (`wr`)، فلا يُحمَل ناتجُ أحدهما على الآخر. */
function saltedHash(domain: string, value: string): string {
  const salt = process.env.VISITOR_SALT?.trim() || process.env.DEEBO_SALT?.trim();
  if (!salt) {
    if (process.env.NODE_ENV === "production") throw new Error("VISITOR_SALT ناقص");
    return createHash("sha256").update(`${domain}|${value}|dev`).digest("hex");
  }
  return createHash("sha256").update(`${domain}|${value}|${salt}`).digest("hex");
}

export const hashToken = (token: string) => saltedHash("wt", token);

export async function readToken(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  return raw && /^[0-9a-f]{64}$/.test(raw) ? raw : null;
}

/** يُنادى بعد قبول الاسم وحده: كوكيزٌ تسبق القبولَ تَعِد بما لم يقع. */
export async function writeToken(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: PATH,
    maxAge: MAX_AGE,
  });
}

/** بصمةُ لاعب هذا الجهاز، أو `null` إن لم يسجّل بعد. */
export async function currentPlayerHash(): Promise<string | null> {
  const token = await readToken();
  return token ? hashToken(token) : null;
}

/**
 * **معرّفُ حساب الداخل في الموقع، أو `null`** — من مطالبات رمز جلسته (`getClaims` يتحقّق من
 * توقيعه) لا من كوكيزٍ تُصدَّق كما هي. والحارسُ (`proxy.ts`) يجدّد الجلسةَ قبل أن تصل هنا.
 * ومُغلَّفٌ بـ`cache`: مرّةً في الطلب. وعطلُ المصادقة لا يُسقط اللعبة: يُعامَل صاحبُه ضيفًا.
 */
const sessionUser = cache(async function sessionUser(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    return !error && data?.claims?.sub ? data.claims.sub : null;
  } catch {
    return null;
  }
});

/**
 * **مَن يطلب: حسابُه إن كان داخلًا في الموقع، ورمزُ متصفّحه** (قرارُ المالك ٢٠٢٦-٠٩-٢٤:
 * «حسابه بيحفظ له تقدّمه وين ما راح»). والقاعدةُ تُقدّم الحسابَ، وتضمّ إليه ضيفَ هذا
 * المتصفّح أوّلَ مرّة (`darb_pid`).
 */
export async function who(): Promise<{ hash: string | null; user: string | null }> {
  const [hash, user] = await Promise.all([currentPlayerHash(), sessionUser()]);
  return { hash, user };
}

/** عميلُ مفتاح الخدمة: الدوالُّ كلُّها منزوعةٌ عن `anon`، فلا تُنادى إلّا من هنا. */
export function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}
