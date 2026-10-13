import { describe, expect, it } from "vitest";
import {
  blocksToMarkup, changesFrom, deleteArticle, followupBody, insertArticle, markupToBlocks, numberMap, stripAnchors,
  type DraftBody,
} from "@/lib/regulations/edit";
import type { RegBlock, RegChapter } from "@/lib/regulations/types";

const para = (text: string): RegBlock => ({ kind: "para", text });
const doc = (texts: string[]): DraftBody => [
  { title: "الباب الأول: التعريف", articles: texts.slice(0, 2).map((t, i) => ({ no: i + 1, title: `م${i + 1}`, blocks: [para(t)] })) },
  { title: "الباب الثاني: الأحكام", articles: texts.slice(2).map((t, i) => ({ no: i + 3, title: `م${i + 3}`, blocks: [para(t)] })) },
];
const texts = (b: DraftBody) => b.flatMap((c) => c.articles.map((a) => (a.blocks[0] as { text: string }).text));

describe("النصّ ⇄ الكتل", () => {
  it("يعود النصُّ كما كان", () => {
    const blocks: RegBlock[] = [
      para("فقرةٌ فيها المادة ١٢ وسنة ٢٠٢٦."),
      { kind: "list", ordered: false, items: ["أوّل", "ثانٍ"] },
      { kind: "list", ordered: true, items: ["واحد", "اثنان"] },
      { kind: "table", head: ["المنصب", "الوزن"], rows: [["عضو", "٣"]] },
      { kind: "figure", ref: "structure", caption: "هيكل أدِيب" },
    ];
    const md = blocksToMarkup(blocks);
    expect(md).toContain("المادة 12");
    expect(markupToBlocks(md)).toEqual({ blocks });
  });
  it("الفقرةُ يليها بندٌ بلا سطرٍ فارغ كتلتان، والأرقامُ تُحفظ بأرقام النصّ", () => {
    expect(markupToBlocks("يشمل ما يلي (المادة 5):\n- الأوّل\n- الثاني")).toEqual({
      blocks: [para("يشمل ما يلي (المادة ٥):"), { kind: "list", ordered: false, items: ["الأوّل", "الثاني"] }],
    });
  });
  it("يردّ الفارغَ والجدولَ المختلّ والشكلَ المجهول", () => {
    expect(markupToBlocks("  \n ")).toEqual({ error: "نصُّ المادّة فارغ." });
    expect("error" in markupToBlocks("| أ | ب |\n| ١ |")).toBe(true);
    expect("error" in markupToBlocks("![شكل](figure:map)")).toBe(true);
  });
});

describe("إعادة الترقيم", () => {
  const base = doc(["تُطبَّق المادة ٣.", "نصّ.", "وفق المادة ٢ والمواد ١ إلى ٤ من الدستور.", "نصّ أخير."]);

  it("الإضافةُ تؤخّر ما بعدها وتتبعها الإحالات، ونصُّ الجديدة يُقرأ بالترقيم القديم", () => {
    const b = insertArticle(base, "membership", 0, 1, "جديدة", [para("تُحيل إلى المادة ٣.")])!;
    expect(b.flatMap((c) => c.articles.map((a) => [a.no, a.from]))).toEqual([[1, 1], [2, null], [3, 2], [4, 3], [5, 4]]);
    expect(texts(b)).toEqual([
      "تُطبَّق المادة ٤.",
      "تُحيل إلى المادة ٤.",
      "نصّ.",
      "وفق المادة ٣ والمواد ١ إلى ٤ من الدستور.",
      "نصّ أخير.",
    ]);
  });

  it("لا تُحذف مادّةٌ يُحال إليها، وحذفُ غيرها يقدّم ما بعدها", () => {
    expect(deleteArticle(base, "membership", 3)).toEqual({ error: "CITED", citing: [1] });
    expect(deleteArticle(base, "membership", 2)).toEqual({ error: "CITED", citing: [3] });
    const r = deleteArticle(base, "membership", 1);
    expect("body" in r && texts(r.body)).toEqual(["نصّ.", "وفق المادة ١ والمواد ١ إلى ٤ من الدستور.", "نصّ أخير."]);
  });

  it("المتنُ المنشور بلا مراسٍ", () => {
    const b = insertArticle(base, "membership", 1, 0, "ج", [para("نص")])!;
    expect(JSON.stringify(stripAnchors(b))).not.toContain("from");
  });
});

describe("ما تغيّر والإصداراتُ التبعيّة", () => {
  const constitution: RegChapter[] = doc(["أ", "ب", "ج", "د"]);
  const draft = insertArticle(constitution, "constitution", 0, 0, "جديدة", [para("هـ")])!;
  const shrunk = (deleteArticle(constitution, "constitution", 4) as { body: DraftBody }).body;

  it("الجديدةُ والمعدّلةُ والمحذوفة", () => {
    const edited = draft.map((c) => ({ ...c, articles: c.articles.map((a) => (a.no === 3 ? { ...a, title: "معدّلة" } : a)) }));
    expect(changesFrom(constitution, edited)).toEqual({ changes: { 1: "new", 3: "edited" }, removed: [], chapters: [] });
    expect(changesFrom(constitution, shrunk).removed).toEqual([4]);
  });

  it("تُصحَّح إحالاتُ الوثائق الأخرى، ويُردّ ما يُحيل إلى محذوف", () => {
    const other = doc(["(الدستور، المادة ٢) والمادة ٢.", "المادتان ١ و٤ من الدستور.", "لا إحالة.", "نصّ."]);
    const f = followupBody(other, "membership", "constitution", numberMap(constitution, draft));
    expect(f.changed).toBe(true);
    expect(texts(f.body).slice(0, 2)).toEqual(["(الدستور، المادة ٣) والمادة ٢.", "المادتان ٢ و٥ من الدستور."]);
    const g = followupBody(other, "membership", "constitution", numberMap(constitution, shrunk));
    expect(g.broken).toEqual([2]);
  });
});
