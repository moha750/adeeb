import { describe, expect, it, vi } from "vitest";

// `server-only` يرمي خارج خادم React: المِعيارُ يختبر الحسابَ لا حدودَ الحزمة
vi.mock("server-only", () => ({}));

import { colName, sheetName, xlsx } from "@/lib/xlsx";

/** فكُّ أرشيف ZIP المخزَّن (بلا ضغط) — ما يكتبه `lib/zip.ts`: ترويسةٌ محلّيّة، فاسمٌ، فبيانات */
function unzip(buf: Buffer): Map<string, string> {
  const out = new Map<string, string>();
  let at = 0;
  while (buf.readUInt32LE(at) === 0x04034b50) {
    expect(buf.readUInt16LE(at + 8)).toBe(0); // تخزين
    const size = buf.readUInt32LE(at + 18);
    const nameLen = buf.readUInt16LE(at + 26);
    const extra = buf.readUInt16LE(at + 28);
    const name = buf.subarray(at + 30, at + 30 + nameLen).toString("utf8");
    const start = at + 30 + nameLen + extra;
    out.set(name, buf.subarray(start, start + size).toString("utf8"));
    at = start + size;
  }
  return out;
}

describe("colName", () => {
  it("حروفُ الأعمدة كما يسمّيها Excel", () => {
    expect([0, 1, 25, 26, 27, 51, 52, 701, 702].map(colName)).toEqual(["A", "B", "Z", "AA", "AB", "AZ", "BA", "ZZ", "AAA"]);
  });
});

describe("sheetName", () => {
  it("ينزع ما يرفضه Excel ويقصّ إلى واحدٍ وثلاثين حرفًا", () => {
    const t = new Set<string>();
    expect(sheetName("لجنة [التأليف]: الكتابة/النشر?", t)).toBe("لجنة التأليف الكتابة النشر");
    const long = sheetName("لجنة الإنتاج الإعلامي والتصوير الفوتوغرافي والمرئي", new Set());
    expect([...long].length).toBeLessThanOrEqual(31);
  });
  it("لا يتكرّر اسمان، ولا اسمٌ فارغ", () => {
    const t = new Set<string>();
    expect(sheetName("إناث", t)).toBe("إناث");
    expect(sheetName("إناث", t)).toBe("إناث 2");
    expect(sheetName("***", t)).toBe("ورقة");
  });
  it("لا يبدأ ولا ينتهي بفاصلةٍ عليا", () => {
    expect(sheetName("'اسم'", new Set())).toBe("اسم");
  });
});

describe("xlsx", () => {
  const file = xlsx([
    {
      name: "المتطوّعون",
      columns: [{ title: "الاسم" }, { title: "الجوّال" }, { title: "المشاركات" }, { title: "بداية التطوّع" }, { title: "آخر دخول" }, { title: "المدينة" }],
      rows: [
        ["نورة عبد الله القحطاني", "0501234567", 3, { day: "2026-01-01" }, { stamp: "2026-01-01T18:30" }, null],
        ["سارة <&> \"س\"\u0007", "0550000000", 0, { day: "2026-11-24" }, null, "الأحساء"],
      ],
    },
    { name: "إناث", columns: [{ title: "الاسم" }], rows: [] },
  ]);
  const parts = unzip(file);

  it("أرشيفٌ بأجزاء المصنّف كلّها", () => {
    expect([...parts.keys()].sort()).toEqual(
      ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml"].sort(),
    );
    expect(parts.get("[Content_Types].xml")).toContain('PartName="/xl/worksheets/sheet2.xml"');
  });

  it("الورقةُ من اليمين، ورأسُها مثبّتٌ وعليه المرشّح", () => {
    const s = parts.get("xl/worksheets/sheet1.xml")!;
    expect(s).toContain('rightToLeft="1"');
    expect(s).toContain('state="frozen"');
    expect(s).toContain('<autoFilter ref="A1:F3"/>');
    expect(s).toContain('<dimension ref="A1:F3"/>');
    expect(parts.get("xl/workbook.xml")).toContain(`'المتطوّعون'!$A$1:$F$3`);
  });

  it("الجوّالُ نصٌّ بصفره، والعددُ عدد، والتاريخُ رقمُ يومٍ في Excel", () => {
    const s = parts.get("xl/worksheets/sheet1.xml")!;
    expect(s).toContain('<c r="B2" t="inlineStr"><is><t>0501234567</t></is></c>');
    expect(s).toContain('<c r="C2"><v>3</v></c>');
    expect(s).toContain('<c r="D2" s="2"><v>46023</v></c>'); // 2026-01-01
    expect(s).toContain('<c r="E2" s="3"><v>46023.770833333336</v></c>'); // 18:30
    expect(s).not.toContain('r="F2"'); // الفارغُ لا خليّةَ له
  });

  it("يُهرَّب ما يُهرَّب ويُنزع ما لا يحمله XML", () => {
    const s = parts.get("xl/worksheets/sheet1.xml")!;
    expect(s).toContain("سارة &lt;&amp;&gt; &quot;س&quot;</t>");
    expect(s).not.toContain("\u0007");
  });

  it("الرأسُ عريضٌ في كلّ ورقة ولو خلت من الصفوف", () => {
    const s = parts.get("xl/worksheets/sheet2.xml")!;
    expect(s).toContain('<c r="A1" t="inlineStr" s="1"><is><t>الاسم</t></is></c>');
    expect(s).toContain('<autoFilter ref="A1:A1"/>');
  });

  it("مصنّفٌ بلا أوراق ورقةٌ فارغةٌ صالحة: لا `<cols>` فارغ", () => {
    const empty = unzip(xlsx([]));
    expect(empty.get("xl/workbook.xml")).toContain('<sheet name="ورقة" sheetId="1" r:id="rId1"/>');
    expect(empty.get("xl/worksheets/sheet1.xml")).not.toContain("<cols>");
  });

  it("الورقةُ الأولى وحدها مختارة", () => {
    expect(parts.get("xl/worksheets/sheet1.xml")).toContain('tabSelected="1"');
    expect(parts.get("xl/worksheets/sheet2.xml")).not.toContain("tabSelected");
  });
});
