/**
 * **قواعدُ «ركضة وطن» الخالصة** — ما يحكم به الخادمُ على الجولة وعلى الاسم.
 *
 * خالصٌ عمدًا: لا قاعدةَ ولا كوكيزَ ولا شبكة. فيُختبَر وحدَه (`__tests__/rules.test.ts`)،
 * ويُنادى من أبواب الخادم في `app/watan/api/*`.
 *
 * ## الجولةُ تُعاد ولا تُصدَّق
 * الجهازُ يرسل **بذرةً أعطاه إيّاها الخادم وضغطاتٍ بلحظاتها**، لا مسافة. والخادمُ يُعيد
 * الجولةَ باللبّ نفسِه (`core.js`) فيخرج بالمسافة والمصّاص من عنده. فمن عدّل رقمًا في
 * المتصفّح لم يعدّل شيئًا: الرقمُ لا يُقرأ أصلًا إلّا للمقارنة.
 *
 * وحدُّ ما لا تفعله الإعادة (نقاشُ المالك ٢٠٢٦-٠٩-٢٤): تُثبت أنّ النتيجةَ **لُعبت** بهذه
 * الضغطات، ولا تُثبت أنّ لاعبَها إنسان. وبلا جوائز صار ذلك مقبولًا: الغشُّ هنا تفاخرٌ
 * لا مال، والفائزُ يُنظَر في أرقامه قبل منشور الإعلان.
 */
import { Sim } from "./core";

/**
 * **الحدُّ التقنيُّ المخفيّ: خمسَ عشرةَ دقيقةً من زمن اللعب** (قرابة ٥١ كم).
 *
 * يحمي الخادمَ من جولاتٍ وهميّةٍ طويلة (الإعادةُ عند الحدّ ٤٠ ملّيثانية تقريبًا)،
 * وأيُّ جولةٍ تبلغه **تُحجَز للمراجعة** ولا تدخل اللوحة: الجولةُ الوسطى ٣٥ ثانية،
 * وإنسانٌ يصمد ربعَ ساعةٍ على ستّين مترًا في الثانية شبهُ مستحيل.
 * واللعبةُ تُنهي الجولةَ عنده بنفسها، فلا يضيع على أحدٍ ما لعب.
 */
export const MAX_TICKS = 15 * 60 * 60;

/** سقفُ الضغطات في جولة: ثلاثٌ في الثانية على طول الحدّ كلِّه، وفوقه ليس لعبًا. */
export const MAX_PRESSES = 15 * 60 * 3;

/** سقفُ طول السجلّ المرمَّز بالحرف: يُرَدّ ما فوقه قبل أن يُفكّ. */
export const MAX_INPUT_CHARS = MAX_PRESSES * 8;

/** ضغطةٌ: التكّةُ التي وقعت فيها، والفعل (١ يسار · ٢ يمين · ٣ قفز · ٤ انزلاق). */
export type Press = [step: number, action: 1 | 2 | 3 | 4];

/* ══ ترميزُ السجلّ ══════════════════════════════════════════════════
   كلُّ ضغطةٍ عددٌ واحد: (الفرقُ عن السابقة × ٤) + (الفعل − ١)، بأساس ٣٦، والفاصلُ نقطة.
   فجولةٌ من ألف ضغطةٍ قرابةُ أربعة آلاف حرف، والفرقُ لا السالبُ يضمن الترتيبَ بالبناء. */

export function encodeInput(log: readonly (readonly [number, number])[]): string {
  let prev = 0;
  const parts: string[] = [];
  for (const [step, a] of log) {
    parts.push(((step - prev) * 4 + (a - 1)).toString(36));
    prev = step;
  }
  return parts.join(".");
}

/** يفكّ السجلّ، أو `null` إن كان مشوَّهًا: حرفٌ غريب، أو فعلٌ خارج الأربعة، أو طولٌ فوق السقف. */
export function decodeInput(raw: unknown): Press[] | null {
  if (typeof raw !== "string") return null;
  if (raw === "") return [];
  if (raw.length > MAX_INPUT_CHARS || !/^[0-9a-z]+(\.[0-9a-z]+)*$/.test(raw)) return null;
  const parts = raw.split(".");
  if (parts.length > MAX_PRESSES) return null;
  const out: Press[] = [];
  let step = 0;
  for (const p of parts) {
    const n = parseInt(p, 36);
    if (!Number.isSafeInteger(n) || n < 0) return null;
    step += Math.floor(n / 4);
    if (step >= MAX_TICKS) return null;
    out.push([step, ((n % 4) + 1) as Press[1]]);
  }
  return out;
}

/* ══ الإعادة ═══════════════════════════════════════════════════════ */

export type Replay = {
  /** عددُ التكّات حتّى الاصطدام، أو الحدُّ إن بلغه. */
  ticks: number;
  /** المسافةُ بالمتر، كما يعرضها العدّاد. */
  dist: number;
  candies: number;
  /** بلغ الحدَّ التقنيّ حيًّا: جولةٌ تُحجَز للمراجعة. */
  capped: boolean;
};

/**
 * يُعيد الجولةَ كما تُعاد في اللعبة: عند كلّ تكّةٍ تُطبَّق ضغطاتُها ثمّ تجري التكّة.
 *
 * يعيد `null` إن بقيت ضغطاتٌ بعد الاصطدام: اللعبةُ لا تقيّد ضغطةً بعد الموت أصلًا
 * (`Sim.input` يخرج إن لم يكن حيًّا)، فسجلٌّ فيه ذلك لم يخرج من لعبتنا.
 */
export function replay(seed: number, presses: readonly Press[], maxTicks = MAX_TICKS): Replay | null {
  const sim = new Sim(seed >>> 0);
  let j = 0;
  for (let i = 0; i < maxTicks; i++) {
    while (j < presses.length && presses[j][0] === i) {
      sim.input(presses[j][1]);
      j++;
    }
    sim.tick();
    if (!sim.s.alive) {
      if (j < presses.length) return null;
      return { ticks: i + 1, dist: sim.score(), candies: sim.candies(), capped: false };
    }
  }
  if (j < presses.length) return null;
  return { ticks: maxTicks, dist: sim.score(), candies: sim.candies(), capped: true };
}

/* ══ الاسمُ المستعار ═══════════════════════════════════════════════
   الاسمُ ما يُعرض كما كتبه صاحبُه (بعد التنظيف)، والمفتاحُ ما يُقارَن به للتفرّد والحجب.
   فـ«صقرُ الأحساء» و«صقر الاحساء» و«صقـر الأحساء» اسمٌ واحد، ولا يأخذه اثنان. */

export const NAME_MIN = 2;
export const NAME_MAX = 20;

/** يُسقط محارفَ التحكّم واتّجاهِ النصّ والمحارفَ الصفريّة، ويطوي المسافات. */
export function cleanName(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁩﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** مفتاحُ المقارنة: بلا تشكيلٍ ولا تطويلٍ ولا مسافات، والهمزاتُ والتاءُ والياءُ موحَّدة. */
export function nameKey(name: string): string {
  return cleanName(name)
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[^0-9a-zء-ي]/g, "");
}

/** كلماتُ الاسم بمفاتيحها، لمطابقة الكلمة القصيرة كاملةً لا جزءًا من كلمة. */
function nameWords(name: string): string[] {
  return cleanName(name).split(" ").map(nameKey).filter(Boolean);
}

/** حروفٌ عربيّةٌ وتشكيل، ولاتينيّة، وأرقام بالنظامين، ومسافة، وشرطةٌ سفليّة ونقطة. */
const ALLOWED = /^[ء-غف-يً-ٰٟـa-zA-Z0-9٠-٩ _.]+$/;

export type NameCheck = { ok: true; name: string; key: string } | { ok: false; message: string };

export function checkName(raw: unknown, blocked: { whole: readonly string[]; part: readonly string[] }): NameCheck {
  if (typeof raw !== "string") return { ok: false, message: "اكتب اسمًا." };
  const name = cleanName(raw);
  if ([...name].length < NAME_MIN) return { ok: false, message: "الاسمُ حرفان على الأقلّ." };
  if ([...name].length > NAME_MAX) return { ok: false, message: "الاسمُ لا يتجاوز عشرين حرفًا." };
  if (!ALLOWED.test(name)) return { ok: false, message: "حروفٌ وأرقامٌ ومسافاتٌ فقط، بلا رموز." };

  const key = nameKey(name);
  if ((key.match(/[a-zء-ي]/g) ?? []).length < 2) {
    return { ok: false, message: "الاسمُ يحتاج حرفين على الأقلّ لا أرقامًا وحدها." };
  }

  const words = nameWords(name);
  const hit =
    blocked.part.some((b) => key.includes(b)) ||
    blocked.whole.some((b) => words.includes(b) || key === b);
  if (hit) return { ok: false, message: "هذا الاسمُ غيرُ مسموح. جرّب اسمًا آخر." };

  return { ok: true, name, key };
}
