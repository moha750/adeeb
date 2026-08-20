/**
 * حارس ديبو — فحصٌ حتميّ بعد التوليد وقبل وصول النصّ للقارئ.
 *
 * القاعدة: كلّ عددٍ في الجواب يجب أن يكون قد ورد في السياق المُمرَّر أو في سؤال
 * المستخدم. ما عداه يُحجب. لا نموذج ثانيًا هنا ولا نداءَ شبكة — سلاسل نصّيّة فقط.
 *
 * حدٌّ مصمَّمٌ لا سهو: الحارس يفحص **الأعداد والتواريخ** وحدها.
 *   · أسماء الأعلام العربيّة بلا حرفٍ كبير تُميّزها ⟵ فحصها يُنتج إنذاراتٍ كاذبةً
 *     أكثر ممّا يمسك. تأريض الأسماء مسؤوليّة التوجيه والاستشهاد.
 *   · الأعداد المكتوبة حروفًا («مئةُ عضو») لا يراها الحارس — لأنّ تمييزها عن
 *     «واحدٌ من أهمّ» يحتاج تحليلًا صرفيًّا، وكلفة الخطأ فيه أعلى من نفعه.
 *
 * والفحص يجري **جملةً جملةً قبل دفعها في البثّ** لا بعد اكتمال الجواب — وإلّا قرأ
 * الزائر الخطأ قبل حجبه.
 */

/** الاعتذار الذي يحلّ محلّ الجملة المحجوبة (نبرةٌ عاديّة: لا يُكشف تدخّل الحارس). */
export const FALLBACK_SENTENCE =
  "لستُ متأكّدًا من هذا الرقم، ولا أحبّ أن أخمّن، والأفضل سؤال الإدارة.";

export type GuardReason = "unsourced_number";

export type Verdict =
  | { ok: true }
  | { ok: false; reason: GuardReason; value: string };

/** تطبيع الأرقام العربيّة‑الهنديّة والفارسيّة إلى ASCII، وتوحيد فواصل الكسر والألوف. */
export function normalizeDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")   // الفاصلة العشريّة العربيّة ٫
    .replace(/٬/g, "")    // فاصلة الألوف العربيّة ٬
    .replace(/(\d),(?=\d{3}\b)/g, "$1"); // 1,200 ⟵ 1200
}

/**
 * إسقاط علامات الترقيم القوائميّة كي لا تُحسب «١.» عددًا مُدّعى.
 * يُستدعى **بعد** التطبيع — وإلّا فاتته الأرقام العربيّة‑الهنديّة.
 */
function stripListMarkers(normalized: string): string {
  return normalized.replace(/^[\s‏‎]*(?:[-*•]|\d+[.)‏])\s+/gm, "");
}

/** كلّ عددٍ في النصّ، مطبَّعًا وبلا أصفارٍ بادئة. */
export function extractNumbers(text: string): Set<string> {
  const found = new Set<string>();
  const matches = stripListMarkers(normalizeDigits(text)).match(/\d+(?:\.\d+)?/g);
  for (const raw of matches ?? []) {
    const value = raw.includes(".") ? raw : String(Number(raw));
    found.add(value);
  }
  return found;
}

/**
 * الأعداد المسموحة: ما ورد في المعرفة المُمرَّرة + ما ورد في سؤال المستخدم نفسه
 * (فإعادةُ رقمٍ كتبه الزائر ليست ادّعاءً).
 */
export function allowedNumbers(contextText: string, userText: string): Set<string> {
  const allowed = extractNumbers(contextText);
  for (const n of extractNumbers(userText)) allowed.add(n);
  return allowed;
}

/** حكمٌ على جملةٍ واحدة. */
export function inspect(sentence: string, allowed: ReadonlySet<string>): Verdict {
  for (const value of extractNumbers(sentence)) {
    if (!allowed.has(value)) return { ok: false, reason: "unsourced_number", value };
  }
  return { ok: true };
}

/**
 * مِبضعُ البثّ: يبتلع القطع الواردة من المزوّد ويُخرج **جملًا مفحوصة** فقط.
 *
 * حدود الجملة: . ! ? ؟ ؛ وسطرٌ جديد — بشرط أن يتلوها فراغٌ أو نهاية، كي لا ينكسر
 * الكسر العشريّ (٣.٥) نصفين.
 */
export function createSentenceGuard(allowed: ReadonlySet<string>) {
  let buffer = "";
  let blocked = false;

  const flushReady = (final: boolean): { text: string; blocked: boolean } => {
    let out = "";
    let boundary: number;

    // نقطع عند آخر حدّ جملةٍ مكتمل داخل المخزن
    while ((boundary = nextBoundary(buffer)) !== -1) {
      const sentence = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary);
      out += judge(sentence);
    }

    if (final && buffer.trim()) {
      out += judge(buffer);
      buffer = "";
    }
    return { text: out, blocked };
  };

  const judge = (sentence: string): string => {
    if (!sentence.trim()) return sentence;
    const verdict = inspect(sentence, allowed);
    if (verdict.ok) return sentence;
    blocked = true;
    // نحفظ المسافة البادئة/اللاحقة كي لا تلتصق الجمل بعد الاستبدال
    const lead = sentence.match(/^\s*/)?.[0] ?? "";
    const tail = sentence.match(/\s*$/)?.[0] ?? "";
    return `${lead}${FALLBACK_SENTENCE}${tail}`;
  };

  return {
    /** يُمرَّر كلّ قطعةٍ واردة؛ يعيد ما صار آمنًا للدفع (قد يكون فارغًا). */
    push(chunk: string): string {
      buffer += chunk;
      return flushReady(false).text;
    },
    /** يُستدعى عند انتهاء البثّ؛ يعيد بقيّة المخزن مفحوصةً. */
    end(): string {
      return flushReady(true).text;
    },
    /** هل حُجبت جملةٌ واحدةٌ على الأقلّ؟ (يُسجَّل في blocked_reason). */
    get didBlock(): boolean {
      return blocked;
    },
  };
}

/** موضع نهاية أوّل جملةٍ مكتملة في النصّ، أو -1. */
function nextBoundary(text: string): number {
  const re = /[.!?؟؛\n]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const at = m.index;
    const next = text[at + 1];
    // نقطةٌ بين رقمين = كسرٌ عشريّ لا نهاية جملة
    if (m[0] === "." && /\d/.test(text[at - 1] ?? "") && /\d/.test(next ?? "")) continue;
    // ننتظر ما يؤكّد النهاية: فراغٌ أو سطر. لا نقطع على آخر محرفٍ وصلنا (قد يتبعه رقم)
    if (next === undefined) return -1;
    if (/\s/.test(next) || m[0] === "\n") return at + 1;
  }
  return -1;
}
