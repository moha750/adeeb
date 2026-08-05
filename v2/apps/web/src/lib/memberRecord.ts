// «هل لهذا العضو سجلُّ تفاصيل؟» — **المصدر الواحد** للسؤال، يقرؤه بابان: بوّابةُ اللوحة
// (`dashboard/layout.tsx`) التي تسوق الناقصَ إلى `/complete`، والشاشةُ نفسها التي تصرف عنها
// من أكمل. ولو سُئل السؤالُ مرّتين بصياغتين لَتناقضتا يومًا فدار العضو بين البابين.
//
// وهو الخلَفُ الحيّ لحالة `pending_onboarding` المُعدَمة (٢٠٢٦-٠٨-٠٤): كان النقصُ حالةً في عمود
// يكتبها بابُ تسجيلٍ نُحر، فصار **واقعةً تُقرأ**: من له صفٌّ في `member_details` فسجلُّه تامّ.
import "server-only";
import { cache } from "react";
import { createAdeebServiceClient } from "@adeeb/core";

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/**
 * `true` إن كان للعضو صفٌّ في `member_details`.
 *
 * وبلا مفتاح خدمةٍ أو عند خطأِ قراءةٍ تُرجع `true` — **الشكُّ لا يحبس**: البوّابةُ تسوق من
 * تيقّنّا من نقصه، فلو ردّت `false` عند العطل لَحبست الجميعَ خارج اللوحة بعطلٍ عابر.
 */
export const hasMemberRecord = cache(async function hasMemberRecord(userId: string): Promise<boolean> {
  const sb = service();
  if (!sb) return true;

  const { data, error } = await sb.from("member_details").select("user_id").eq("user_id", userId).maybeSingle();
  if (error) return true;
  return !!data;
});

/**
 * «أعضوٌ هو أصلًا؟» — سؤالٌ آخر غيرُ الأوّل، وقد صار لازمًا بعد توحيد الهويّة (م١): في
 * `profiles` اليوم صاحبُ حسابٍ لم ينضمّ، فسؤالُ «أسجلُّه تامّ؟» وحدَه كان يسوقه إلى شاشة
 * إكمال سجلٍّ ليس له.
 *
 * وحدُّه `joined_date` — نظيرُ `is_adeeb_member` في القاعدة حرفًا بحرف. ولو تبدّل الحدُّ يومًا
 * تبدّل في الموضعين معًا: هناك في جسد الدالّة، وههنا في هذا السطر.
 *
 * وبلا مفتاح خدمةٍ أو عند عطلٍ تُرجع `true` — **الشكُّ لا يطرد**: من شُكّ في عضويّته يبقى على
 * طريقه المعتاد، فلا يُقتاد إلى بيتٍ ليس بيتَه بعطلٍ عابر.
 */
export const isAdeebMember = cache(async function isAdeebMember(userId: string): Promise<boolean> {
  const sb = service();
  if (!sb) return true;

  const { data, error } = await sb.from("profiles").select("joined_date").eq("id", userId).maybeSingle();
  if (error) return true;
  return data?.joined_date != null;
});
