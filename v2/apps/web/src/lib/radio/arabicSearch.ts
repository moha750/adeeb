/**
 * **تطبيعُ العربيّة للبحث** — المصدرُ الواحد، يُطبِّع عند الفهرسة وعند الاستعلام
 * معًا. فلو افترقا لم يجد أحدٌ شيئًا وبدا البحثُ سليمًا.
 *
 * ولمَ يلزم أصلًا؟ لأنّ بحثًا عربيًّا بلا تطبيعٍ **معطوبٌ لا ناقص**: من كتب
 * «المنعطف» لا يجد «منعطف»، ومن كتب «اسطورة» لا يجد «أسطورة»، ومن كتب «حياه»
 * لا يجد «حياة». وهو ينصرف ولا يعود، ولا يبلّغ عن عطل.
 *
 * ══ ما يُوحَّد، ولمَ ══
 *   • الهمزاتُ كلُّها إلى ألف: `أ إ آ ٱ ا`. لوحةُ المفاتيح لا تُلزِم أحدًا بالهمزة.
 *   • التاءُ المربوطة إلى هاء: `ة ه`. يُكتبان بالتبادل في كلّ نصٍّ عربيٍّ يوميّ.
 *   • الألفُ المقصورة إلى ياء: `ى ي`. وكذلك.
 *   • التشكيلُ والتطويلُ يُسقَطان: زينةٌ لا تُدخَل في البحث.
 *   • الأرقامُ العربيّةُ والفارسيّةُ إلى اللاتينيّة (مصدرُها `@adeeb/core`).
 *   • «ال» التعريف تُتجاوَز في **مطابقة الكلمة**، لا في التطبيع نفسِه، فلا يصير
 *     «العلم» و«علم» شيئًا واحدًا في التخزين.
 *
 * **وخالصةٌ عمدًا** فتُختبَر وحدَها (`__tests__/arabicSearch.test.ts`)، وتصلح
 * يومَ ينزل العمودُ المطبَّعُ المفهرس في القاعدة: تُنادى من الترحيل نفسِه.
 */
import { toLatinDigits } from "@adeeb/core";

/* التشكيلُ والتطويل. مكتوبةٌ بالمهارب لا بالحروف: التعبيرُ العربيُّ الحرفيُّ
   يُقرأ معكوسًا في المحرّر فيُخطئ من يعدّله (سابقةُ `lib/personName`). */
const MARKS = /[ً-ٰٟـ]/g;

const FOLD: Record<string, string> = {
  "أ": "ا", // أ
  "إ": "ا", // إ
  "آ": "ا", // آ
  "ٱ": "ا", // ٱ
  "ة": "ه", // ة
  "ى": "ي", // ى
  "ؤ": "و", // ؤ
  "ئ": "ي", // ئ
};

/** النصُّ مطبَّعًا: يُخزَّن بهذه الصورة ويُستعلَم بها. */
export function normalizeArabic(input: string | null | undefined): string {
  if (!input) return "";
  return toLatinDigits(input)
    .replace(MARKS, "")
    .replace(/[أإآٱةىؤئ]/g, (c) => FOLD[c] ?? c)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** «ال» التعريف تُنزَع من طرف الكلمة عند المطابقة وحدَها. */
const stripAl = (w: string) => (w.length > 3 && w.startsWith("ال") ? w.slice(2) : w);

/**
 * أيحوي النصُّ كلَّ كلمات الاستعلام؟ **كلُّها لا إحداها**: من كتب كلمتين قصد
 * تضييقَ النتائج لا توسيعَها.
 */
export function matches(haystack: string, query: string): boolean {
  const q = normalizeArabic(query);
  if (!q) return false;
  const hay = normalizeArabic(haystack);
  return q.split(" ").every((w) => {
    if (!w) return true;
    return hay.includes(w) || hay.includes(stripAl(w)) || stripAl(hay).includes(stripAl(w));
  });
}

/**
 * أوّلُ موضعِ مطابقةٍ في نصٍّ طويل، مع ما حوله. تُستعمل لعرض **الجملة التي وقعت
 * فيها الكلمة** في نتائج البحث داخل الكلام.
 *
 * والمردودُ من النصّ **الأصليّ** لا المطبَّع: القارئُ يرى كلامَ الحلقة كما قيل.
 * والتطبيعُ يحافظ على الطول حرفًا بحرفٍ إلّا في التشكيل والتطويل، فيُبنى دليلٌ
 * يردّ كلَّ موضعٍ مطبَّعٍ إلى أصله.
 */
export function findSnippet(
  text: string,
  query: string,
  radius = 58,
): { before: string; match: string; after: string; at: number } | null {
  const q = normalizeArabic(query);
  if (!q || !text) return null;
  const word = q.split(" ")[0]!;
  if (!word) return null;

  // دليلُ المواضع: لكلّ حرفٍ في المطبَّع موضعُه في الأصل
  const map: number[] = [];
  let norm = "";
  for (let i = 0; i < text.length; i++) {
    const n = normalizeArabic(text[i]!);
    if (!n) continue; // تشكيلٌ أو تطويلٌ سقط
    for (const ch of n) {
      norm += ch;
      map.push(i);
    }
  }
  const hit = norm.indexOf(word);
  if (hit < 0) return null;

  const at = map[hit] ?? 0;
  /* نهايةُ المطابَقة في الأصل: آخرُ حرفٍ مطبَّعٍ من الكلمة، ثمّ حرفٌ بعده. */
  const end = (map[hit + word.length - 1] ?? at) + 1;
  const from = Math.max(0, at - radius);
  const to = Math.min(text.length, end + radius);
  const tidy = (v: string) => v.replace(/\s+/g, " ");
  return {
    before: (from > 0 ? "…" : "") + tidy(text.slice(from, at)).trimStart(),
    match: tidy(text.slice(at, end)),
    after: tidy(text.slice(end, to)).trimEnd() + (to < text.length ? "…" : ""),
    at,
  };
}
