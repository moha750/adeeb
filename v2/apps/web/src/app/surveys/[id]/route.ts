import { NextResponse, type NextRequest } from "next/server";
import { surveyCodeById } from "@/lib/surveys/codeLookup";
import { surveyPath } from "@/lib/surveys/code";

/**
 * **الرابطُ القديم بالرقم** (`‎/surveys/<id>`) — باقٍ ليحوّل لا ليعرض.
 *
 * انتقل الاستبيانُ إلى رمزه القصير `‎/s/<code>` (قرار المالك ٢٠٢٦-١٠-١٩، انظر
 * `lib/surveys/code`)، وما نُشر قبلها في القروبات والباركودات والرسائل يجب ألّا يموت.
 * فيُحوَّل بـ**‏308** (دائم): الرقمُ والرمزُ كلاهما ثابتٌ لا يتبدّل، فالمعاينةُ والمتصفّحُ
 * يحفظان الوجهةَ الجديدة بأمان.
 *
 * **ولمَ `route.ts` لا `page.tsx`** (درسُ بابِ الباركود `q/[code]/route.ts`): الصفحةُ التي
 * تنادي `redirect()` تتدفّق أوّلًا ثمّ تحوّل بالمتصفّح فيرى الزائرُ بياضًا، ومعاينةُ واتساب
 * لا تتبع ذلك. والمنفذُ يردّ تحويلًا بلا جسد يتبعه كلُّ قارئ.
 *
 * والرقمُ المجهول يذهب إلى `‎/s/unavailable`: ليس رمزًا بشكله فتردّه صفحةُ الاستبيان
 * «غير موجود» بلا أن تلمس القاعدة — بابٌ واحدٌ لكلّ ما لا وجود له.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = await surveyCodeById(Number(id));
  if (!code) return NextResponse.redirect(new URL("/s/unavailable", request.url), 307);
  return NextResponse.redirect(new URL(surveyPath(code), request.url), 308);
}
