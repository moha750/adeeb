/**
 * هويّةُ اللاعب المجهول — **المصدر الواحد**: كيف يُولَّد رمزُه، وأين يسكن، وكيف
 * يُختزَل إلى بصمةٍ تُخزَّن.
 *
 * ⚠️ خادميٌّ محض: يقرأ الملحَ ويكتب الكوكيز، فلا يُستورد في كودٍ عميليّ أبدًا.
 *
 * ## لماذا كوكيز `httpOnly` لا `localStorage`
 * الرمزُ هو **كلمةُ مرور اللاعب**: من ملكه أرسل الإجاباتِ باسمه. و`localStorage`
 * يقرؤه أيُّ سكربتٍ في الصفحة، فثغرةُ XSS واحدةٌ تحصد رموزَ القاعة كلِّها. والكوكيز
 * `httpOnly` لا تبلغه سكربتات الصفحة أصلًا، ويُرسَل مع فعلِ الخادم من نفسه.
 * (V1 استعمل `localStorage`؛ ولا يُنقَل عنه إلّا ما صحّ.)
 *
 * ## ولماذا كوكيزٌ لكلّ غرفة
 * كوكيزٌ واحدةٌ تعني أنّ الدخولَ في غرفةٍ ثانيةٍ يطرد الأولى، فيعود اللاعبُ إلى
 * غرفته الأولى غريبًا بلا نقاطه. والاسمُ يحمل الرمزَ فتتعايش الغرف، والمسارُ يحصرها
 * فلا تُرسَل كوكيزُ عشر غرفٍ مع كلّ طلب.
 */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { roomPath } from "@/app/dashboard/games/vocab";

/** ثلاثون يومًا: أطولُ بكثيرٍ من أيّ حفل، وأقصرُ من أن تبقى في جهازٍ مستعارٍ للأبد. */
const MAX_AGE = 30 * 24 * 60 * 60;

const cookieName = (code: string) => `adeeb_play_${code}`;

/** رمزٌ خامٌّ من عشوائيّةِ التعمية. سرٌّ حقيقيّ، فلا `randomCode` هنا ولا انحيازَ يُقبَل. */
export function newPlayerToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * بصمةُ الرمز: `sha256("gw" ‖ الرمز ‖ الملح)`.
 *
 * **ولا تدور مع اليوم** خلافًا لبصمة الزائر في `lib/visitor`: تلك تُسجَّل في أرشيفٍ
 * دائمٍ فيُقصَد بدورانها ألّا تصل أمسِ باليوم بشخصٍ واحد؛ وهذه **مفتاحُ جلسةٍ حيّة**،
 * ودورانُها يعني أنّ من لعب قبل منتصف الليل صار غريبًا بعده.
 *
 * والبادئةُ `gw` تفصل المجالَ: الملحُ نفسُه يخدم بصمتين، ولولا الفصلُ لأمكن حملُ
 * ناتج إحداهما على الأخرى.
 */
export function hashPlayerToken(token: string): string {
  const salt = process.env.VISITOR_SALT?.trim() || process.env.DEEBO_SALT?.trim();
  if (!salt) {
    // بصمةٌ بلا ملحٍ تُخمَّن بجدول، فلا يُسكَت عنها في الإنتاج. والتطويرُ يمضي بملحٍ ظاهر.
    if (process.env.NODE_ENV === "production") throw new Error("VISITOR_SALT ناقص");
    return createHash("sha256").update(`gw|${token}|dev`).digest("hex");
  }
  return createHash("sha256").update(`gw|${token}|${salt}`).digest("hex");
}

/** رمزُ هذا الجهاز في هذه الغرفة، إن سبق أن انضمّ. */
export async function readPlayerToken(code: string): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(cookieName(code))?.value;
  return raw && /^[0-9a-f]{64}$/.test(raw) ? raw : null;
}

/** يُنادى بعد نجاح الانضمام وحده: كوكيزٌ تُكتب قبل أن يُقبَل اللاعبُ تَعِد بما لم يقع. */
export async function writePlayerToken(code: string, token: string): Promise<void> {
  const jar = await cookies();
  jar.set(cookieName(code), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // المسارُ يحصرها بغرفتها، فلا تُرسَل كوكيزُ كلّ غرفةٍ لُعِبت مع كلّ طلبٍ في الموقع.
    path: roomPath(code),
    maxAge: MAX_AGE,
  });
}
