// بنيةُ نصّ «أنظمة أدِيب» — وهي بعينها متنُ النسخة (`regulation_versions.body`).
//
// **الكتلُ مصرَّحةٌ لا مستدلّة:** خلافَ متن الخبر (`lib/news/body`) لا يُستدلّ هنا على
// بندٍ أو جدولٍ من شكل السطر. فالنصُّ القانونيُّ لا يحتمل أن تُقرأ فقرةٌ بندًا، والمصدرُ
// ملفٌّ مكتوبٌ بعنايةٍ تُعرف فيه كلُّ كتلةٍ باسمها. والنصُّ داخلها يحمل `**…**` وحده.

export type RegBlock =
  | { kind: "para"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "figure"; ref: string; caption: string };

export type RegArticle = { no: number; title: string; blocks: RegBlock[] };
export type RegChapter = { title: string | null; articles: RegArticle[] };
/** `summary` سطرُ التعريف المعروض، و`note` ملاحظةُ الإقرار (`approval_note`) تُحفظ ولا تُعرض في الصدر. */
export type RegDoc = { slug: string; title: string; summary: string; note: string; chapters: RegChapter[] };
