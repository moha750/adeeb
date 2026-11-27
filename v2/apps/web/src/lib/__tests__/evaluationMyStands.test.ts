import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COUNCIL_ITEM_LIST, MEMBER_ITEM_LIST } from "@/app/dashboard/evaluation/vocab";

/**
 * **حارسُ انجراف «أين تقف»** (محمد ٢٠٢٦-١١-٢٧): دالّةُ `evaluation_my_stands` تحمل في القاعدة جدولَ البنود (أيُّ درجةٍ في الورقة لأيّ بند)،
 * وأسماؤها وتلميحاتُها في `vocab.ts`. فإن أُضيف بندٌ أو بُدّل ترتيبُه في أحدهما وحده قرأ القائدُ درجةً تحت اسمٍ غيرِ اسمها بلا خطأٍ
 * يُسمع. فالاختبارُ يقرأ ملفَّ الهجرة ويطابق مفاتيحَه بمفاتيح المفردات جزءًا جزءًا وبالترتيب نفسِه.
 */
const SQL = readFileSync(fileURLToPath(new URL("../../../../../../supabase/migrations/20261127141421_evaluation_my_stands.sql", import.meta.url)), "utf8");

const keysOf = (part: "members" | "council") =>
  [...SQL.matchAll(new RegExp(`\\('${part}',\\s*(\\d+),\\s*\\d+,\\s*'([a-z_]+)'\\)`, "g"))]
    .map((m) => ({ idx: Number(m[1]), key: m[2] }))
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.key);

describe("evaluation_my_stands تطابق مفرداتِ البنود", () => {
  it("بنودُ الأعضاء بمفاتيحها وترتيبها", () => {
    expect(keysOf("members")).toEqual(MEMBER_ITEM_LIST.map((i) => i.key));
  });
  it("بنودُ المجلس بمفاتيحها وترتيبها", () => {
    expect(keysOf("council")).toEqual(COUNCIL_ITEM_LIST.map((i) => i.key));
  });
});
