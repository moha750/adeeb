// منطقُ المجيب — نقيٌّ بلا رسم (الإجابةُ، وخطؤها، والمدّةُ، وألفاظُ العدد).
import type { PublicQuestion } from "./SurveyRespond";
import { EMAIL_HINT, EMAIL_RE, PHONE_HINT, PHONE_RE } from "@/lib/fieldFormats";

export type AnswerValue = string | number | boolean | string[];
export type Answers = Record<number, AnswerValue>;

/** مفاتيحُ الخيارات بترتيب الأبجد لا بالأرقام: الخيارُ ليس رتبةً، والحرفُ يُقرأ عربيًّا. */
export const ABJAD = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي", "ك", "ل", "م", "ن", "س", "ع"];

/** ما يُجاب بلمسةٍ واحدة — يُنزل الصفحةَ وحده إلى السؤال التالي إن كان فارغًا. */
export const ONE_TAP = new Set(["single_choice", "yes_no", "rating_stars", "linear_scale", "dropdown"]);

/** ما يُكتب كتابةً — خطؤه يُقال تحت البئر. */
export const TYPED = new Set(["short_text", "long_text", "number", "email", "phone", "url", "date", "time", "datetime"]);

export const isAnswered = (v: AnswerValue | undefined): boolean =>
  v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);

export function questionError(q: PublicQuestion, v: AnswerValue | undefined): string | null {
  if (!isAnswered(v)) return q.required ? "هذا السؤال إلزاميّ." : null;
  if (typeof v !== "string") return null;
  if (q.type === "email" && !EMAIL_RE.test(v.trim())) return EMAIL_HINT;
  if (q.type === "phone" && !PHONE_RE.test(v.trim())) return PHONE_HINT;
  return null;
}

export function minutesFor(qs: PublicQuestion[]): number {
  const secs = qs.reduce((s, q) => s + (q.type === "long_text" ? 45 : TYPED.has(q.type) ? 15 : 8), 0);
  return Math.max(1, Math.round(secs / 60));
}

/** المدّةُ مجرورةً بعد «نحو»: نحو دقيقة، نحو دقيقتين، نحو 3 دقائق. */
export const minutesWord = (n: number) => (n === 1 ? "دقيقة" : n === 2 ? "دقيقتين" : n <= 10 ? `${n} دقائق` : `${n} دقيقة`);
export const questionsWord = (n: number) => (n === 1 ? "سؤالٌ واحد" : n === 2 ? "سؤالان" : n <= 10 ? `${n} أسئلة` : `${n} سؤالًا`);
export const leftWord = (n: number) => (n === 1 ? "بقي سؤالٌ إلزاميّ" : n === 2 ? "بقي سؤالان إلزاميّان" : `بقيت ${n} أسئلة إلزاميّة`);

export function setAnswer(a: Answers, id: number, v: AnswerValue | undefined): Answers {
  const next = { ...a };
  if (v === undefined || !isAnswered(v)) delete next[id];
  else next[id] = v;
  return next;
}
