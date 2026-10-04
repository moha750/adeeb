// أقسامُ الخبر المصرَّحة — **مصدرٌ واحد** يقرأه الخادمُ والعميلُ معًا (بلا "server-only").
//
// **لِمَ وُجد؟** كان المتنُ نصًّا عاريًا يُستدلّ فيه على العناوين بشكل السطر
// (`lib/news/body`)، فيصيب ويخطئ. وقياسُ ٢٠٢٦-٠٩-٢٤ على الأربعة عشر خبرًا المنشورة
// ردّ ستّةً مبوَّبةً وسبعةً بلا عنوانٍ واحد — تفاوتٌ يراه القارئ. فاختار المالكُ أن
// يُصرَّح: لكلّ قسمٍ خانةُ عنوانٍ وخانةُ متن، ولا يُخمَّن شيء.
//
// **وما يبقى مستدلًّا عمدًا:** البندُ يفتتحه «•» والاقتباسُ علامةُ تنصيص، وهذان لا
// يلتبسان ولا يستحقّان خانةً. الذي التبس هو العنوانُ وحدَه، وهو وحدَه ما نُقل.
// وإلّا صار المحرّرُ يملأ نموذجًا بدل أن يكتب.

import { parseBody, isHeading, type Block } from "./body";

/**
 * قسمٌ واحد. و`heading: null` قسمٌ بلا عنوانٍ عمدًا — صدرُ الخبر يُفتتح كثيرًا بفقرةٍ
 * قبل أوّل عنوان، فلا تُلجأ إلى عنوانٍ مصطنعٍ لتستقيم البنية.
 */
export type Section = { heading: string | null; body: string };

const isStr = (v: unknown): v is string => typeof v === "string";

/**
 * حارسُ نوعٍ لما يعود من عمود `jsonb`.
 *
 * **ولِمَ يُفحَص وفي القاعدة قيدُ شكل؟** لأنّ القيدَ يحرس الكتابة، وهذا يحرس القراءة:
 * صفٌّ كُتب قبل القيد، أو عمودٌ عُدِّل بيدٍ في لوحة Supabase، يصل ههنا فيُردّ إلى
 * الاستدلال بدل أن يُسقِط الصفحة.
 */
export function isSections(v: unknown): v is Section[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        !!s &&
        typeof s === "object" &&
        !Array.isArray(s) &&
        isStr((s as Section).body) &&
        ((s as Section).heading === null ||
          (s as Section).heading === undefined ||
          isStr((s as Section).heading)),
    )
  );
}

/** يُنقّي مصفوفةً واردةً: يحذف الأقسامَ الخاوية ويقصّ الأطراف. */
export function cleanSections(sections: Section[]): Section[] {
  return sections
    .map((s) => ({ heading: (s.heading ?? "").trim() || null, body: s.body.trim() }))
    .filter((s) => s.heading || s.body);
}

/**
 * الأقسامُ إلى كُتَلٍ يرسمها العارض.
 *
 * العنوانُ يُرفَع تصريحًا، ومتنُ القسم يُقرأ بـ`headings: false` فلا يُنتزَع منه عنوانٌ
 * ثانٍ لم يُقصَد.
 */
export function sectionsToBlocks(sections: Section[]): Block[] {
  const out: Block[] = [];
  for (const s of cleanSections(sections)) {
    if (s.heading) out.push({ kind: "heading", text: s.heading });
    out.push(...parseBody(s.body, { headings: false }));
  }
  return out;
}

/**
 * الإسقاطُ النصّيّ الذي يُكتب في `news.content`.
 *
 * **وهو مشتقٌّ لا مصدرٌ ثانٍ:** لا يُحرّره أحد، ولا يُكتب إلّا من ههنا في مسار الحفظ.
 * يخدم عدَّ الكلمات ومدّةَ القراءة وأيَّ بحثٍ يأتي، ويبقي العمودَ `NOT NULL` وفيًّا.
 * والصيغةُ هي صيغةُ ما كتبه المحرّرون أنفسُهم، فلو قُرئ بالاستدلال ردَّ البنيةَ نفسَها.
 */
export function sectionsToText(sections: Section[]): string {
  return cleanSections(sections)
    .map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body).trim())
    .join("\n\n");
}

/**
 * المحوِّل: نصٌّ قديمٌ إلى أقسامٍ مصرَّحة.
 *
 * يعمل على **النصّ الخام** لا على الكُتَل، كي يصل متنُ القسم كما كتبه صاحبُه حرفًا
 * بحرف: بنودُه ونصّاتُه وفواصلُ فقراته. ولو مرّ بالكُتَل لضاعت صورتُه الأصليّة وعاد
 * منسوخًا عن فهمِنا له.
 */
export function textToSections(content: string | null | undefined): Section[] {
  const raw = (content ?? "").replace(/\r\n?/g, "\n");
  const out: Section[] = [];
  const push = (heading: string | null, body: string) => out.push({ heading, body });

  for (const chunk of raw.split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    if (isHeading(lines[0], lines.slice(1))) {
      push(lines[0], lines.slice(1).join("\n"));
      continue;
    }

    // كتلةٌ بلا عنوان: تُضمّ إلى القسم الجاري، أو تفتح قسمًا صدريًّا بلا عنوان.
    const last = out[out.length - 1];
    if (last) last.body = `${last.body}\n\n${lines.join("\n")}`.trim();
    else push(null, lines.join("\n"));
  }

  return cleanSections(out);
}
