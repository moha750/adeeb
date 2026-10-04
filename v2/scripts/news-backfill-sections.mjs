/**
 * تحويلُ متون الأخبار القائمة إلى أقسامٍ مصرَّحة (م٦ من `أقسام-الخبر.md`).
 *
 * **يُشغَّل مرّةً واحدةً بإذن المالك**، بعد تطبيق ترحيل `blocks`. ولا يكتب شيئًا في
 * `--dry` — وهو الوضعُ الافتراضيّ عمدًا، فالكتابةُ تُطلَب صراحةً بـ`--apply`.
 *
 * **ولا يمسّ خبرًا حُوِّل من قبلُ** (`blocks` غيرُ فارغ): الكتابةُ الثانيةُ تدهس
 * تحريرًا بشريًّا جرى بعد التحويل.
 *
 * والمحوِّلُ هو `lib/news/blocks#textToSections` نفسُه الذي يعمل في اللوحة — لا نسخةٌ
 * ثانيةٌ ههنا تتخلّف عنه.
 *
 *   node scripts/news-backfill-sections.mjs          # عرضٌ فقط
 *   node scripts/news-backfill-sections.mjs --apply  # كتابة
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const APPLY = process.argv.includes("--apply");

/* البيئةُ من `.env.local` — لا يُطبَع المفتاحُ ولا جزءٌ منه. */
const env = Object.fromEntries(
  readFileSync(new URL("../apps/web/.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("ينقص NEXT_PUBLIC_SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY في apps/web/.env.local");
  process.exit(1);
}

/**
 * المحوِّلُ **الواحد** — يُترجَم من `lib/news/blocks.ts` نفسِه ولا يُنسَخ منطقُه ههنا.
 *
 * و`node` يقرأ TypeScript منذ الإصدار ٢٣ لكنّه لا يحلّ استيرادًا بلا لاحقة
 * (`from "./body"`)، وهي صيغةُ المستودع كلِّه. فـ`esbuild` يجمع الملفَّين في وحدةٍ
 * واحدةٍ مؤقّتة، فيبقى المصدرُ واحدًا ولا يتخلّف نسخٌ ثانٍ عنه.
 */
const ESBUILD = new URL(
  "../node_modules/.pnpm/esbuild@0.28.2/node_modules/esbuild/bin/esbuild",
  import.meta.url,
).pathname;
const bundle = join(mkdtempSync(join(tmpdir(), "adeeb-blocks-")), "blocks.mjs");
execFileSync(ESBUILD, [
  new URL("../apps/web/src/lib/news/blocks.ts", import.meta.url).pathname,
  "--bundle", "--format=esm", "--platform=node", `--outfile=${bundle}`,
], { stdio: ["ignore", "ignore", "inherit"] });
const { textToSections, sectionsToText } = await import(bundle);

/* PostgREST مباشرةً بلا حزمة — سكربتات المستودع كلُّها على `fetch` (سابقةُ
   `auth-config.mjs`)، و`v2/scripts` ليست مساحةَ عملٍ فيها `node_modules`. */
const rest = (path, init = {}) =>
  fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

const res = await rest("news?select=id,title,content,blocks&order=published_at.desc");
if (!res.ok) {
  console.error("تعذّرت القراءة:", res.status, (await res.text()).slice(0, 300));
  process.exit(1);
}
const data = await res.json();

let converted = 0;
let skipped = 0;

for (const n of data) {
  if (Array.isArray(n.blocks) && n.blocks.length) {
    skipped++;
    continue;
  }

  const sections = textToSections(n.content);
  if (!sections.length) {
    skipped++;
    continue;
  }

  const heads = sections.filter((s) => s.heading).length;
  console.log(
    `${String(sections.length).padStart(2)} قسمًا (${heads} بعنوان) — ${String(n.title).slice(0, 52)}`,
  );

  if (APPLY) {
    const w = await rest(`news?id=eq.${n.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ blocks: sections, content: sectionsToText(sections) }),
    });
    if (!w.ok) {
      console.error("  تعذّرت الكتابة:", w.status, (await w.text()).slice(0, 300));
      process.exit(1);
    }
  }
  converted++;
}

console.log(
  `\n${APPLY ? "حُوِّل" : "سيُحوَّل"} ${converted} خبرًا، وتُرك ${skipped}.` +
    (APPLY ? "" : "\nأضف --apply للكتابة."),
);
