// يقرأ نصوصَ «أنظمة أدِيب» المُقَرّة من ملفّاتها في `v2/الأنظمة/` ويتحقّق من بنيتها وترقيمها.
// وبـ`--seed` كتب ترحيلَ الإصدار الأوّل (`regulation_versions.body`)، وطُبِّق ٢٠٢٦-١٠-١٣.
// **ومنذ ذلك اليوم القاعدةُ هي المصدر** والصفحةُ تقرأ منها، فتعديلُ هذه الملفّات لا يبلغ الموقع:
// التعديلُ نسخةٌ جديدة في القاعدة.
//
// التشغيل: node scripts/regulations-build.mjs   (من v2)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(root, "الأنظمة");

/** ترتيبُ المادة ٦٥ من الدستور: الدستورُ ثمّ الأنظمةُ الستّة. و`summary` سطرُ التعريف في صدر الوثيقة
 *  وكرتِها في الفهرس — ليس من النصّ المُقَرّ، فمصدرُه هنا لا ملفُّ الوثيقة (أقرّه المالك ٢٠٢٦-١٠-١٣). */
const DOCS = [
  { slug: "constitution", file: "دستور-أديب.md", summary: "اللائحةُ العليا للنادي: تعريفُه وهيكلُه ومناصبُه، وحقوقُ أعضائه وواجباتُهم، وإليها يُحيل كلُّ نظام." },
  { slug: "membership", file: "نظام-العضوية.md", summary: "الانضمامُ إلى أدِيب، وسجلُّ العضوية، والخروجُ منها وإنهاؤها، واستعادتُها." },
  { slug: "positions", file: "نظام-المناصب-والصلاحيات.md", summary: "مَن يشغل كلَّ منصبٍ وكيف يتركه، والتكليفُ والتجميد، وما يملكه كلُّ منصبٍ في المنصّة." },
  { slug: "elections", file: "نظام-الانتخابات.md", summary: "فتحُ الانتخاب، والترشّحُ والتصويت، والفوزُ والتعثّر، والتظلّمُ فيه." },
  { slug: "discipline", file: "نظام-الانضباط.md", summary: "الإنذارُ وحدُّه وإلغاؤه، والتظلّمُ من كلّ قرارٍ يصدر بحقّ شخصٍ بعينه." },
  { slug: "volunteering", file: "نظام-التطوع.md", summary: "صفةُ المتطوّع، وفرصُ التطوّع والتقديمُ إليها، والحضورُ والساعات، وسجلُّ المتطوّعين." },
  { slug: "certificates", file: "نظام-الشهادات.md", summary: "شهادتا الخبرة والمشاركة: إصدارُهما ومضمونُهما، ورقمُهما والتحقّقُ منهما، وإبطالُهما." },
];

const AR = "٠١٢٣٤٥٦٧٨٩";
const toInt = (s) => Number([...s].map((c) => (AR.includes(c) ? AR.indexOf(c) : c)).join(""));
const ART = /^\*\*المادة ([٠-٩]+) \(([^)]*)\):\*\*\s*(.*)$/;
const cells = (l) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

function parse(md, slug) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const title = lines[0].replace(/^#\s*/, "").trim();
  let note = "";
  const chapters = [];
  let ch = null, art = null, buf = [];

  const flush = () => {
    if (!buf.length) return;
    const block = buf; buf = [];
    if (!art) { if (!chapters.length && !note) note = block.join(" "); else throw new Error(`${slug}: نصّ خارج مادّة: ${block[0]}`); return; }
    const first = block[0];
    if (first.startsWith("- ")) art.blocks.push({ kind: "list", ordered: false, items: block.map((l) => l.replace(/^-\s+/, "")) });
    else if (/^\d+\.\s/.test(first)) art.blocks.push({ kind: "list", ordered: true, items: block.map((l) => l.replace(/^\d+\.\s+/, "")) });
    else if (first.startsWith("|")) {
      const rows = block.filter((l) => !/^\|\s*-{3}/.test(l)).map(cells);
      art.blocks.push({ kind: "table", head: rows[0], rows: rows.slice(1) });
    } else if (/^!\[/.test(first)) {
      const m = first.match(/^!\[([^\]]*)\]\(figure:([a-z-]+)\)/);
      art.blocks.push({ kind: "figure", ref: m[2], caption: m[1] });
    } else art.blocks.push({ kind: "para", text: block.join(" ") });
  };

  for (const raw of lines.slice(1)) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    if (l.startsWith("## ")) { flush(); art = null; ch = { title: l.slice(3).trim(), articles: [] }; chapters.push(ch); continue; }
    const m = l.match(ART);
    if (m) {
      flush();
      if (!ch) { ch = { title: null, articles: [] }; chapters.push(ch); }
      art = { no: toInt(m[1]), title: m[2].trim(), blocks: [] };
      ch.articles.push(art);
      if (m[3]) buf.push(m[3]);
      continue;
    }
    buf.push(l);
  }
  flush();

  // حارسُ الترقيم: الموادُّ متّصلةٌ من ١ في الوثيقة كلّها (REGULATIONS-SYSTEM › ثالثًا).
  const nos = chapters.flatMap((c) => c.articles.map((a) => a.no));
  nos.forEach((n, i) => { if (n !== i + 1) throw new Error(`${slug}: المادة ${n} في موضع ${i + 1}`); });
  return { slug, title, note, chapters };
}

const docs = DOCS.map(({ slug, file, summary }) => {
  const { title, note, chapters } = parse(readFileSync(join(SRC, file), "utf8"), slug);
  return { slug, title, summary, note, chapters };
});
// النسخةُ الأولى في القاعدة: `--seed` يكتب ترحيلَها من البنية نفسِها، فلا يفترق النصّان.
// طُبِّق ٢٠٢٦-١٠-١٣، فلا يُعاد توليدُه: التعديلُ بعده نسخةٌ جديدة في غرفة التحرير.
if (process.argv.includes("--seed")) {
  const SEED = join(root, "../supabase/migrations/20261013134000_regulations_02_v1.sql");
  const q = (s) => `'${s.replace(/'/g, "''")}'`;
  const dq = (s, tag) => { if (s.includes(`$${tag}$`)) throw new Error(`النصّ يحوي $${tag}$`); return `$${tag}$${s}$${tag}$`; };
  const count = (d) => d.chapters.reduce((s, c) => s + c.articles.length, 0);
  const out = [
    "-- أنظمةُ أدِيب ٠٢: النسخةُ الأولى من النصوص المُقَرّة",
    "--",
    "-- طُبِّق ٢٠٢٦-١٠-١٣ بعد `regulations_01_schema`، والنصوصُ في القاعدة مطابقةٌ له بالبصمة.",
    "-- مُولَّدٌ بـ `node scripts/regulations-build.mjs --seed` من v2/الأنظمة/، فلا يُحرَّر باليد.",
    "--",
    "-- أُقرّ الدستورُ في ٢٠٢٦-١٠-١٠، وأقرّ الرئيسان الأنظمةَ الستّة بعد عرضها على المجلس الإداري",
    "-- في ٢٠٢٦-١٠-١٢. وكلٌّ «يسري من تاريخ نشره في «أنظمة أدِيب»»، فتدخل هنا مسودّاتٍ، ويُنشرها",
    "-- `regulations_03_publish_v1.sql` يومَ تُفتح الصفحةُ العلنيّة، فيكون تاريخُ النفاذ يومَ النشر حقًّا.",
    "--",
    ...docs.map((d) => `--   ${d.slug.padEnd(13)} ${count(d)} مادّةً في ${d.chapters.length} ${d.chapters.length > 10 ? "بابًا" : "أبواب"}`),
    "",
    "begin;",
    "",
    "insert into public.regulations (slug, title, summary, position) values",
    docs.map((d, i) => `  (${q(d.slug)}, ${q(d.title)}, ${q(d.summary)}, ${i})`).join(",\n"),
    "on conflict (slug) do nothing;",
    "",
  ];
  for (const d of docs) {
    out.push(
      `-- ${d.title}`,
      "insert into public.regulation_versions",
      "  (regulation_id, version_no, status, effective_from, change_note, approval_note, body)",
      `select r.id, 1, 'draft', null, 'الإصدار الأوّل', ${q(d.note)},`,
      `  ${dq(JSON.stringify(d.chapters), "body")}::jsonb`,
      `from public.regulations r where r.slug = ${q(d.slug)}`,
      "on conflict (regulation_id, version_no) do nothing;",
      "",
    );
  }
  out.push(
    "-- حارسٌ: سبعُ مسودّاتٍ للإصدار الأوّل، وعددُ الموادّ كما في النصوص.",
    "do $chk$",
    "declare n int;",
    "begin",
    "  select count(*) into n from public.regulation_versions where version_no = 1;",
    "  if n <> 7 then raise exception 'النسخ % لا ٧', n; end if;",
    "  select sum(jsonb_array_length(a)) into n from public.regulation_versions v,",
    "    lateral (select ch->'articles' as a from jsonb_array_elements(v.body) ch) x where v.version_no = 1;",
    `  if n <> ${docs.reduce((s, d) => s + count(d), 0)} then raise exception 'الموادّ % لا ${docs.reduce((s, d) => s + count(d), 0)}', n; end if;`,
    "end $chk$;",
    "",
    "commit;",
    "",
  );
  writeFileSync(SEED, out.join("\n"));
  console.log("seed →", SEED);
}

for (const d of docs) console.log(d.slug, d.chapters.length, "أبواب", d.chapters.reduce((s, c) => s + c.articles.length, 0), "مادّة");
