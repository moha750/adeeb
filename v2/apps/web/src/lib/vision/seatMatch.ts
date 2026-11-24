import { namesOf, normalizeName } from "@/lib/personName";

/**
 * **حسابٌ باسمٍ قريب من مقعدٍ مكتوب** (محمد ٢٠٢٦-١١-٢٣): من سُمّي في فريق الرؤية باسمه ولا حساب له، ثمّ سجّل في البوابة.
 * الاسمُ في الرؤية يُكتب غالبًا ثنائيًّا («محمد السماعيل») والحسابُ ثلاثيًّا أو رباعيًّا («محمد عبدالله أحمد السماعيل»)، فلا يُقارن
 * النصّ كاملًا: **الاسمُ الأوّل واسمُ العائلة وحدهما**، بعد توحيد الإملاء (الهمزات، والتاء المربوطة، والألف المقصورة، والحركات،
 * و«عبد الله» و«عبدالله»). وهو **اقتراحٌ لا جزم**: يُعرض الحسابُ باسمه الكامل وصورته، ولا يُربط إلّا بنقرة إنسان.
 * ونظيرُه في القاعدة `vision_name_key` (لإشعار من يُعدّ الرؤى حين يسجّل صاحبُ اسمٍ قريب) — يتغيّران معًا.
 */
const fold = (s: string) =>
  normalizeName(s)
    .replace(/[ً-ْٰ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي");

/** «الأوّل|العائلة» بعد التوحيد، و`null` لاسمٍ من كلمةٍ واحدة (لا يكفي للاقتراح) */
export function seatNameKey(full: string): string | null {
  // الأسماءُ لا الكلمات («عبد الله» اسمٌ واحد)، ثمّ تُلصق كلُّ كلمةٍ في اسمها فيستوي «عبد الله» و«عبدالله»
  const n = namesOf(normalizeName(full)).map((x) => fold(x).replace(/\s+/g, ""));
  return n.length < 2 ? null : `${n[0]}|${n[n.length - 1]}`;
}

/** الحساباتُ التي يقرب اسمُها من الاسم المكتوب */
export function nearAccounts<P extends { id?: string; name: string }>(written: string, pool: P[]): (P & { id: string })[] {
  const k = seatNameKey(written);
  if (!k) return [];
  return pool.filter((p): p is P & { id: string } => !!p.id && seatNameKey(p.name) === k);
}
