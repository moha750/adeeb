import "server-only";
import { zip, type ZipEntry } from "./zip";

/**
 * **كاتبُ Excel أدنى بلا حزمة** (مسارُ «التصدير»، اعتمده محمد ٢٠٢٦-١١-٢٤): ملفُّ `.xlsx` أرشيفُ ZIP فيه XML (OOXML)، فيُكتب
 * بما في المستودع — كاتبُ ZIP (`lib/zip.ts`) وهذا الملفّ — لا بحزمةٍ تُدخل تبعياتٍ تمرّ عليها بياناتُ أشخاص. قورن بـ`exceljs`
 * (ثقيلةٌ بطيئةُ الصيانة) و`xlsx` (نسختُها على npm قديمةٌ بثغراتٍ معروفة)، فرُجّح الكاتبُ الصغير.
 *
 * وما يكتبه أقلُّ ما يجعل الكشفَ ورقةَ عملٍ حقيقيّة: أوراقٌ **من اليمين إلى اليسار**، ورأسٌ عريضٌ **مثبّتٌ** أعلاها وعليه **مرشّحُ
 * Excel**، وعرضُ كلّ عمودٍ بقدر ما فيه. والقيمُ بأنواعها: النصُّ نصٌّ (الجوّال «05…» نصٌّ فلا يسقط صفرُه)، والعددُ عدد، والتاريخُ
 * تاريخُ Excel حقيقيّ (يُفرز ويُصفّى) بصيغةٍ لاتينيّة `yyyy-mm-dd` — واليومُ نفسُه يُحسب بتوقيت الرياض قبل أن يصل هنا (`lib/dates`).
 *
 * والنصوصُ مضمّنةٌ في خلاياها (`inlineStr`) لا جدولًا مشتركًا: أبسطُ، وExcel يقرؤها كما يقرأ ذاك. وما لا يحمله XML من محارف التحكّم
 * يُنزع، وإلّا رفض Excel الملفَّ كلَّه بـ«رسالة إصلاح».
 */

/** يومٌ بتوقيت النادي (`YYYY-MM-DD`)، أو يومٌ وساعتُه (`YYYY-MM-DDTHH:mm`) — كما يُخرجهما `clubDayKey` و`toClubInput`. */
export type XDate = { day: string } | { stamp: string };
export type XCell = string | number | XDate | null;
export type XColumn = { title: string };
export type XSheet = { name: string; columns: XColumn[]; rows: XCell[][] };

const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships";

/** اسمُ الورقة في Excel: واحدٌ وثلاثون حرفًا حدًّا، وبلا `[]:*?/\`، ولا يبدأ ولا ينتهي بفاصلةٍ عليا، ولا يتكرّر (بلا اعتبار الحالة). */
export function sheetName(raw: string, taken: Set<string>): string {
  const clean = raw.replace(/[[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim().replace(/^'+|'+$/g, "") || "ورقة";
  const base = [...clean].slice(0, 31).join("").trim();
  let name = base;
  for (let n = 2; taken.has(name.toLowerCase()); n += 1) {
    const tail = ` ${n}`;
    name = [...base].slice(0, 31 - tail.length).join("").trim() + tail;
  }
  taken.add(name.toLowerCase());
  return name;
}

/** حرفُ العمود: 0 → A، 25 → Z، 26 → AA */
export function colName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** محارفُ لا يقبلها XML 1.0 (التحكّمُ عدا الجدولة والسطر، والبدائلُ المنفردة) تُنزع، ثمّ يُهرَّب ما يُهرَّب. */
function esc(s: string): string {
  return s
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** رقمُ اليوم في Excel (الأيّامُ منذ 1899-12-30) — حسابٌ على التقويم وحده، لا يمرّ بمنطقةٍ زمنيّة: اليومُ وصل هنا يومَ الرياض. */
function serial(d: XDate): number | null {
  const v = "day" in d ? d.day : d.stamp;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const days = (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000;
  return m[4] ? days + (+m[4] * 60 + +m[5]) / 1440 : days;
}

/** أنماطُ الخلايا: 0 العاديّ، 1 الرأس، 2 اليوم، 3 اليومُ بساعته (الساعةُ بأربعٍ وعشرين: «ص/م» يترجمها Excel بلغة جهازه). */
const S_HEAD = 1, S_DAY = 2, S_STAMP = 3;

function cellXml(ref: string, v: XCell, head: boolean): string {
  if (v === null || v === "") return head ? `<c r="${ref}" s="${S_HEAD}"/>` : "";
  if (typeof v === "number") return Number.isFinite(v) ? `<c r="${ref}"><v>${v}</v></c>` : "";
  if (typeof v === "object") {
    const n = serial(v);
    return n === null ? "" : `<c r="${ref}" s="${"day" in v ? S_DAY : S_STAMP}"><v>${n}</v></c>`;
  }
  const t = esc(v);
  const keep = /^\s|\s$|\n/.test(t) ? ' xml:space="preserve"' : "";
  return `<c r="${ref}" t="inlineStr"${head ? ` s="${S_HEAD}"` : ""}><is><t${keep}>${t}</t></is></c>`;
}

/** طولُ ما يظهر في الخليّة بالحروف — لعرض العمود */
function shown(v: XCell): number {
  if (v === null) return 0;
  if (typeof v === "number") return String(v).length;
  if (typeof v === "object") return "day" in v ? 10 : 16;
  return Math.max(...v.split("\n").map((l) => [...l].length));
}

function sheetXml(s: XSheet, first: boolean): string {
  const cols = s.columns.length;
  const last = colName(Math.max(cols, 1) - 1);
  const height = s.rows.length + 1;
  // العرضُ بقدر أطول ما في العمود، بين حدّين: لا عمودٌ يُبتر فيه الرأس، ولا عمودٌ يمتدّ بجملةٍ طويلة (سببُ الانتهاء) خارجَ الشاشة
  const widths = s.columns.map((c, i) => {
    const longest = Math.max([...c.title].length + 4, ...s.rows.map((r) => shown(r[i] ?? null)));
    return Math.min(60, Math.max(10, Math.ceil(longest * 1.15) + 2));
  });
  const head = `<row r="1">${s.columns.map((c, i) => cellXml(`${colName(i)}1`, c.title, true)).join("")}</row>`;
  const body = s.rows
    .map((r, ri) => `<row r="${ri + 2}">${s.columns.map((_, i) => cellXml(`${colName(i)}${ri + 2}`, r[i] ?? null, false)).join("")}</row>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
    `<worksheet xmlns="${NS}" xmlns:r="${NS_R}">` +
    `<dimension ref="A1:${last}${height}"/>` +
    `<sheetViews><sheetView rightToLeft="1"${first ? ' tabSelected="1"' : ""} workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `<selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="18" customHeight="1"/>` +
    // و`<cols>` لا يُكتب فارغًا: Excel يعدّه تالفًا (ورقةٌ بلا أعمدة)
    (widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "") +
    `<sheetData>${head}${body}</sheetData>` +
    `<autoFilter ref="A1:${last}${height}"/>` +
    `<pageMargins left="0.5" right="0.5" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>` +
    `</worksheet>`
  );
}

/**
 * الخطُّ Arial: فيه الحرفُ العربيّ على كلّ جهاز (Calibri، خطُّ Excel الأصليّ، يستعير له خطًّا آخر). والرأسُ عريضٌ على أرضٍ رماديّةٍ
 * خفيفة وتحته خطّ — ألوانُ الملفّ ليست ألوانَ الموقع: ورقةٌ تُطبع وتُرسل، فلا تحمل لوحَ الهويّة.
 */
const STYLES =
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
  `<styleSheet xmlns="${NS}">` +
  `<numFmts count="2"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="yyyy-mm-dd hh:mm"/></numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Arial"/><family val="2"/></font>` +
  `<font><b/><sz val="11"/><name val="Arial"/><family val="2"/></font></fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="FFEEF1F5"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>` +
  `<border><left/><right/><top/><bottom style="thin"><color rgb="FF9AA6B5"/></bottom><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="4">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

/** اسمُ الورقة في مرجعٍ (`'اسم'!$A$1`): بين فاصلتين عُليَين، والفاصلةُ العليا فيه مضاعفة */
const quoted = (name: string) => `'${name.replace(/'/g, "''")}'`;

/**
 * **الملفُّ كلُّه**: ورقةٌ فأكثر، وكلُّ ورقةٍ رأسُها أسماءُ أعمدتها. والأسماءُ تُنقّى ويُفكّ تكرارُها هنا (`sheetName`)، فما يُمرَّر
 * اسمٌ مقروءٌ لا اسمٌ صالحٌ لـExcel. ولا ورقة؟ ورقةٌ فارغةٌ برأسها: Excel يرفض مصنّفًا بلا أوراق.
 */
export function xlsx(input: XSheet[]): Buffer {
  const taken = new Set<string>();
  const sheets = (input.length ? input : [{ name: "ورقة", columns: [], rows: [] }]).map((s) => ({ ...s, name: sheetName(s.name, taken) }));
  const enc = (s: string) => Buffer.from(s, "utf8");

  const files: ZipEntry[] = [
    {
      name: "[Content_Types].xml",
      data: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
          `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
          `<Default Extension="xml" ContentType="application/xml"/>` +
          `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
          sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
          `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
          `</Types>`,
      ),
    },
    {
      name: "_rels/.rels",
      data: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
          `<Relationships xmlns="${NS_PKG}">` +
          `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
          `</Relationships>`,
      ),
    },
    {
      name: "xl/workbook.xml",
      data: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
          `<workbook xmlns="${NS}" xmlns:r="${NS_R}">` +
          `<bookViews><workbookView activeTab="0"/></bookViews>` +
          `<sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
          // مرشّحُ كلّ ورقةٍ يُسمّى كما يسمّيه Excel حين يصنعه بيده، فلا يعدّ الملفَّ ناقصًا
          `<definedNames>${sheets
            .map((s, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(quoted(s.name))}!$A$1:$${colName(Math.max(s.columns.length, 1) - 1)}$${s.rows.length + 1}</definedName>`)
            .join("")}</definedNames>` +
          `</workbook>`,
      ),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: enc(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n` +
          `<Relationships xmlns="${NS_PKG}">` +
          sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
          `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          `</Relationships>`,
      ),
    },
    { name: "xl/styles.xml", data: enc(STYLES) },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: enc(sheetXml(s, i === 0)) })),
  ];
  return zip(files);
}

/** نوعُ الملفّ كما يُرسل ويُنزَّل */
export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
