#!/usr/bin/env node
// **حارسُ وزن الأيقونات.** القانون: الموقعُ كلُّه `duotone` بسياقٍ واحد في جذر التخطيط، ولا
// يخرج منه إلّا ما سمّاه المالكُ في `app/_components/glyphs.tsx` (وزنُه `bold`). وما كُتب هنا
// حارسًا لأنّ القانون سُرّب منه ٦٩ موضعًا قبل ٢٠٢٦-٠٨-١٣ بلا أن يصرخ شيء.
//
// يمنع بابين، وكلاهما وقع فعلًا:
//   ١ · **الالتفاف على القائمة** — اسمٌ مستثنًى يُستورد من Phosphor مباشرةً، فيعود duotone
//       رغم أنّه في القائمة. (كان ٣٧ موضعًا في ١٥ ملفًّا.)
//   ٢ · **الوزنُ الصامت** — مدخلُ `dist/ssr` لا يقرأ سياقَ الجذر (`SSRBase` يقع على
//       `regular`)، فأيقونةٌ بلا `weight` هناك تقع على وزنٍ لم يختره أحد. (كان ٧ مواضع.)
//
// وبابٌ ثالثٌ لم يُحرَس بعدُ عمدًا: `weight` مكتوبٌ بيد الشاشة لاسمٍ خارج القائمة (مثلّثُ
// التشغيل `fill`، وأوسمةُ البروفايل العلنيّ). تلك قراراتٌ تنتظر كلمةَ المالك: إمّا تدخل
// القائمةَ فتُحرَس، وإمّا ترجع duotone. فإذا فُصل فيها، أُضيف البابُ الثالث هنا.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const V2 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(V2, "apps/web/src");
const GLYPHS = path.join(SRC, "app/_components/glyphs.tsx");

const excluded = new Set(
  [...fs.readFileSync(GLYPHS, "utf8").matchAll(/^export const (\w+) = bind/gm)].map((m) => m[1]),
);

const problems = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules" && e.name !== ".next") walk(p);
      continue;
    }
    if (!/\.tsx?$/.test(p)) continue;
    if (p === GLYPHS) continue;

    const src = fs.readFileSync(p, "utf8");
    const rel = path.relative(V2, p);
    const lines = src.split("\n");

    // إذنٌ معلَنٌ في الملفّ لحالةٍ لا يراها الفحصُ النصّيّ (أيقونةٌ تُرسَم عبر خريطة مثلًا):
    //     /* glyph-weight: YoutubeLogo — يُرسَم عبر PLATFORM_ICON بوزنٍ مُمرَّر */
    // (الأسماءُ لاتينيّةٌ والسببُ عربيّ، فلا يختلطان)
    const waived = new Set(
      [...src.matchAll(/glyph-weight:([^\n]*)/g)].flatMap((w) => w[1].match(/[A-Za-z]\w+/g) ?? []),
    );

    const re = /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*"@phosphor-icons\/react(\/dist\/ssr)?"/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const ssr = Boolean(m[2]);
      const line = src.slice(0, m.index).split("\n").length;
      for (const raw of m[1].split(",")) {
        const parts = raw.trim().split(/\s+as\s+/);
        const name = parts[0].trim();
        const local = (parts[1] ?? parts[0]).trim(); // الاسمُ الذي يُكتب في الوسم
        if (!name || waived.has(name) || waived.has(local)) continue;

        // ما الوزنُ الممرَّرُ لها في هذا الملفّ؟ (بالاسم المحلّيّ لا بالأصليّ)
        const at = new RegExp("[<\\s(]" + local + "\\b[^\\n>]{0,160}weight=\\{?([\\w\"']+)").exec(src);
        const passed = at?.[1]?.replace(/["']/g, "") ?? null;

        if (excluded.has(name)) {
          // المستثنى يُستورد من القائمة. ويُعذَر مدخلُ الخادم وحده (لا يقرأ سياقًا)
          // إن مرّر رمزَ الاستثناء صراحةً — وهو النمطُ الموصوف في lib/iconWeight.ts.
          if (ssr && passed === "ICON_WEIGHT_EXCEPTION") continue;
          problems.push(
            ssr && passed
              ? `${rel}:${line} · ${name} مستثنًى، ووزنُه واحدٌ لا يُنقَض: مرّر ICON_WEIGHT_EXCEPTION لا ${passed}`
              : `${rel}:${line} · ${name} مستثنًى بكلمة المالك، فيُستورد من "@/app/_components/glyphs" لا من Phosphor`,
          );
        } else if (ssr && !passed) {
          problems.push(`${rel}:${line} · ${name} من مدخل ssr بلا weight ⇒ يقع regular؛ مرّر weight={ICON_WEIGHT}`);
        }
      }
    }
  }
}

walk(SRC);
walk(path.join(V2, "packages"));

if (problems.length) {
  console.error("\n✗ وزنُ الأيقونات خرج عن مصدره الواحد:\n");
  for (const p of problems) console.error("  " + p);
  console.error(`\n  ${problems.length} موضعًا. القانون في apps/web/src/lib/iconWeight.ts، والقائمة في app/_components/glyphs.tsx\n`);
  process.exit(1);
}
console.log("✓ وزنُ الأيقونات من مصدره الواحد (" + excluded.size + " مستثنًى)");
