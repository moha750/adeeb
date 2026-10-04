// بنيةُ متن الخبر — **مصدرٌ واحد** يقرأه الخادمُ والعميلُ معًا (بلا "server-only" عمدًا).
//
// **لِمَ وُجد أصلًا؟** لأنّ المتن يُخزَّن نصًّا عاريًا (`news.content`) لا وسمًا، وكان
// العارضُ يقسمه فقرتَين لا ثالثَ لهما: سطرٌ يبدأ بـ«•» بندٌ، وما عداه فقرة. فكلُّ ما
// كتبه المحرّرون من **عناوينَ داخليّة** سقط في الطريق: «المقدمة» و«الأهداف والرؤية»
// و«تفاصيل الفعالية» و«احصائيات المشاركة» و«الأثر والتفاعل» و«التوصيات والرؤى
// المستقبليّة» و«الختام» تخرج كلُّها فقراتٍ بحجم الفقرات ولونِها — فيُقرأ الخبرُ جدارَ
// نصٍّ واحدًا لا مقالًا مبوَّبًا. وهي مقيسةٌ لا مظنونة: مسحُ الأخبار الأربعة عشر
// المنشورة في ٢٠٢٦-٠٩-١٨ ردّ ثمانيةَ عناوينَ متكرّرةً في ستّةٍ وعشرين موضعًا.
//
// **والحكمُ استدلالٌ لا وسم،** فلا سبيلَ غيرُه: لا نملك أن نُلزم ما كُتب قبل اليوم
// بصيغةٍ جديدة. فالقاعدة تُشتقّ ممّا يفعله الكاتبُ فعلًا: يفتح الكتلةَ بسطرٍ قصيرٍ
// لا يُنهيه بنقطة، ثمّ يُتبعه شرحَه. وما شذّ عنها بقي فقرةً — **والخطأُ في جهة الفقرة**،
// فعنوانٌ يُقرأ فقرةً خسارةٌ في الشكل، وفقرةٌ تُرفَع عنوانًا كذبٌ على القارئ.

/** حدُّ طول العنوان الداخليّ. أطولُ عنوانٍ حيٍّ «التوصيات والرؤى المستقبلية» = ٢٦ حرفًا. */
const HEAD_MAX = 44;

/** ما يُنهي جملةً — فسطرٌ يُختم به خبرٌ تامٌّ لا عنوان. */
const SENTENCE_END = /[.!؟:،؛]$/;

/**
 * علاماتُ البند في أوّل السطر. و**الشرطةُ ليست منها عمدًا**: هي فاتحةُ سطر النسبة تحت
 * الاقتباس («— نادي أديب»)، فلو عُدّت بندًا لصار كلُّ توقيعٍ بندًا في قائمةٍ من واحد.
 * والمحرّرون لا يكتبون إلّا «•» في الأخبار الحيّة كلِّها.
 */
const BULLET = /^[•·▪◦]\s*/;

/** فاتحةُ اقتباسٍ مقتطَع: علامتا التنصيص بأشكالها الثلاثة. */
const QUOTE_OPEN = /^["«“]/;

/** سطرُ النسبة تحت الاقتباس: «— نادي أديب». */
const ATTRIB = /^[—–-]\s*\S/;

export type Block =
  | { kind: "heading"; text: string }
  | { kind: "para"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "quote"; text: string; by: string | null };

const clean = (s: string) => s.trim();

/** أهذا السطرُ عنوانُ قسمٍ داخليّ؟ قصيرٌ · لا يُنهيه ترقيمٌ · ليس بندًا ولا اقتباسًا. */
export function isHeading(line: string, rest: string[]): boolean {
  if (!rest.length) return false; // عنوانٌ لا شيءَ تحته ليس عنوانًا
  if (line.length > HEAD_MAX) return false;
  if (SENTENCE_END.test(line)) return false;
  if (BULLET.test(line)) return false;
  if (QUOTE_OPEN.test(line) || ATTRIB.test(line)) return false;
  return true;
}

/**
 * يقرأ المتنَ الخامَ فيردّ كُتَلَه مرتَّبةً.
 *
 * والقسمةُ الكبرى على السطر الفارغ (`\n\n`) كما يكتبها المحرّر، ثمّ تُقرأ كلُّ كتلةٍ
 * سطرًا سطرًا: أوّلُها قد يكون عنوانًا، والبنودُ تُجمَع في قائمةٍ **دلاليّة** لا سطورًا
 * مرصوفة، والفقراتُ تبقى فقرات.
 *
 * **و`headings: false` تُطفئ استدلالَ العناوين وحدَه** وتُبقي ما عداه. تحتاجها الأقسامُ
 * المصرَّحة (`lib/news/blocks`): متنُ القسم هناك لا يُستدلّ فيه على عنوان — العنوانُ
 * مكتوبٌ في خانته — لكنّ البندَ يبقى بندًا والاقتباسَ اقتباسًا، فهذان لا يلتبسان.
 */
export function parseBody(
  content: string | null | undefined,
  opts?: { headings?: boolean },
): Block[] {
  const seekHeadings = opts?.headings !== false;
  const raw = (content ?? "").replace(/\r\n?/g, "\n");
  const out: Block[] = [];

  for (const chunk of raw.split(/\n{2,}/)) {
    const lines = chunk.split("\n").map(clean).filter(Boolean);
    if (!lines.length) continue;

    let i = 0;

    // عنوانُ الكتلة إن وُجد
    if (seekHeadings && isHeading(lines[0], lines.slice(1))) {
      out.push({ kind: "heading", text: lines[0] });
      i = 1;
    }

    // اقتباسٌ مقتطَع: تُفتَح الكتلةُ بعلامة تنصيص، وقد يتبعه سطرُ نسبة
    if (i < lines.length && QUOTE_OPEN.test(lines[i])) {
      const text = lines[i].replace(/^["«“]\s*/, "").replace(/\s*["»”]$/, "");
      const next = lines[i + 1];
      const by = next && ATTRIB.test(next) ? next.replace(/^[—–-]\s*/, "") : null;
      out.push({ kind: "quote", text, by });
      i += by ? 2 : 1;
    }

    // ما بقي: بنودٌ تُجمَع، وفقراتٌ تُرصّ
    let bucket: string[] = [];
    const flush = () => {
      if (bucket.length) out.push({ kind: "list", items: bucket });
      bucket = [];
    };
    for (; i < lines.length; i++) {
      const line = lines[i];
      if (BULLET.test(line)) {
        bucket.push(line.replace(BULLET, ""));
        continue;
      }
      flush();
      out.push({ kind: "para", text: line });
    }
    flush();
  }

  return out;
}

/**
 * عناوينُ الأقسام وحدَها — يبني منها العارضُ فهرسَ المقال، ويُعلّق كلُّ عنوانٍ على
 * مِرساةٍ مشتقّةٍ من ترتيبه لا من نصّه: العناوينُ عربيّةٌ وقد تتكرّر، والمِرساةُ
 * الرقميّةُ لا تتصادم ولا تحتاج ترميزَ رابط.
 */
export const anchorId = (index: number): string => `art-s${index}`;

export function outline(blocks: Block[]): { text: string; id: string }[] {
  const heads: { text: string; id: string }[] = [];
  blocks.forEach((b, i) => {
    if (b.kind === "heading") heads.push({ text: b.text, id: anchorId(i) });
  });
  return heads;
}
