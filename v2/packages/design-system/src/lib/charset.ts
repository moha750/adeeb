import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ChangeEventHandler, FormEvent, FormEventHandler } from "react";

/**
 * طقم المحارف الذي يقبله الحقل — القاعدة ٣ (تشريح الحقل المقدّس).
 * - `latin`  — حقل يحمل إنجليزيّة (بريد · معرّف · رابط): **لا يقبل الحروف العربيّة**.
 * - `digits` — حقل رقميّ (جوّال · رقم أكاديميّ): **لا يقبل حرفًا ولا رمزًا** — أرقام فقط.
 */
export type FieldCharset = "latin" | "digits";

/**
 * نطاقات العربيّة — **مصدرٌ واحد** يخدم المنع والكشف معًا:
 * تُكتب بترميز `\u` لا بمحارف صريحة (المحرف العربيّ الصريح داخل صنف محارف يصعب تدقيقه في ملفّ ثنائيّ الاتجاه،
 * وآخر نطاقاته غير مرئيّ أصلًا: U+FEFF)، ونصًّا لا تعبيرًا حرفيًّا كي يُبنى منه تعبيران بعلمين مختلفين.
 */
const ARABIC_SRC =
  "[\\u0600-\\u06FF\\u0750-\\u077F\\u0870-\\u089F\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFF]";

/** كشفٌ لا نزع — **بلا `g`**: العلم يحفظ `lastIndex` بين النداءات فيكذب `test` مرّةً بعد مرّة. */
const ARABIC = new RegExp(ARABIC_SRC);

/** المحارف الممنوعة لكلّ طقم — يخدم `Field` و`Textarea` معًا. */
const FORBIDDEN: Record<FieldCharset, RegExp> = {
  // نطاقات الحروف العربيّة كلّها — ومنها الأرقام والترقيم العربيّان وأشكال العرض
  latin: new RegExp(ARABIC_SRC, "g"),
  // كلّ ما ليس رقمًا لاتينيًّا — لا حرف ولا رمز ولا مسافة
  digits: /[^0-9]/g,
};

/** نزع المحارف الممنوعة من نصّ. */
function stripForbidden(text: string, charset: FieldCharset): string {
  return text.replace(FORBIDDEN[charset], "");
}

/** المحارف التي رفضها الطقم من نصّ (ما نُزع منه) — مادّة الهمسة. */
function rejectedFrom(text: string, charset: FieldCharset): string {
  return (text.match(FORBIDDEN[charset]) ?? []).join("");
}

/** مدّة بقاء الهمسة (ms) — تكفي لقراءة سطر، وتُحسَب من **آخر رفض** فتتجدّد مع كلّ محرفٍ جديد. */
const WHISPER_MS = 2600;
/** مدّة الذوبان (ms) — تُطابق مدّة الظهور في `components.css`: تذهب كما جاءت لا فجأة. */
const WHISPER_OUT_MS = 260;

/**
 * نصّ الهمسة من **المرفوض نفسه** لا من الطقم وحده: الحقل يعرف ما رُفض، فيقول سببه لا حكمه.
 * - محرفٌ عربيّ (في أيّ طقم) = لوحة المفاتيح بالعربيّة — وهي حالة «يكتب ولا يظهر شيء» التي وُضعت الهمسة لها.
 *   ويشمل ذلك الأرقام الهنديّة (٠١٢) في الحقل الرقميّ: رقمٌ في عين الكاتب، عربيٌّ في عين الحقل.
 * - غير ذلك لا يقع إلّا في الرقميّ (اللاتينيّ لا يمنع سواه)، فالسبب هو الطقم نفسه.
 */
export function whisperFor(rejected: string, charset: FieldCharset): string {
  if (ARABIC.test(rejected)) return "لوحة المفاتيح بالعربيّة بدّلها لتكتب هنا";
  return charset === "digits" ? "هذا الحقل أرقامٌ فقط" : "هذا الحقل لا يقبل هذا المحرف";
}

type Guarded<T> = { onBeforeInput: FormEventHandler<T>; onChange: ChangeEventHandler<T> };

export interface CharsetGuard<T> {
  /** مُعالِجان يُركَّبان على العنصر. */
  guard: Guarded<T>;
  /** نصّ الهمسة الحيّة، أو `null` حين لا رفض (يبقى قائمًا طَورَ الذوبان كي يُرى ذاهبًا). */
  whisper: string | null;
  /** طَورُ الذوبان — الهمسة ما زالت معروضة وقد بدأت تنصرف. */
  leaving: boolean;
  /** إسكاتٌ (نقرٌ خارج الحقل · Escape) — يمرّ بالذوبان نفسه لا يقطع. */
  hush: () => void;
}

/**
 * حارس طقم المحارف — يُركَّب فوق مُعالِجَي المستدعي فلا يبتلعهما (تسجيل react-hook-form يمرّ سليمًا).
 *
 * **يمنع ويُخبِر**: المنع فوريّ كما كان، ومعه همسةٌ لحظيّة تقول للكاتب لماذا لم يظهر ما كتب —
 * فالحقل الصامت الذي يبتلع العربيّة يبدو معطوبًا لمن يكتب بريده بلوحة مفاتيح عربيّة.
 *
 * طبقتان تتقاسمان المنع بحدّ فاصل واحد: **هل يبقى من المُدخَل شيء بعد التنقية؟**
 * 1. `beforeinput` — يمنع الإدخال **قبل وقوعه** إن لم يبقَ منه شيء (كتابة محرف ممنوع)، فيبقى المؤشّر مكانه بلا ارتجاف.
 * 2. `change` — شبكة أمان تنقّي ما مرّ مختلطًا (لصق · تعبئة تلقائيّة · سحب وإفلات) فتُبقي الصالح وتُسقط الممنوع.
 *
 * الحدّ مقصود: حدث اللصق يحمل النصّ **كاملًا** في `data`، فمنعه في الطبقة الأولى يرفض اللصقة كلّها
 * ولا يترك للطبقة الثانية ما تنقّيه (مُثبَت بالمتصفّح: لصق «محمد@adeeb.club» كان يُنتج فراغًا).
 * والطبقتان تهمسان كلتاهما: الأولى بالمحرف الممنوع، والثانية بما نُزع من المختلط.
 */
export function useCharsetGuard<T extends HTMLInputElement | HTMLTextAreaElement>(
  charset: FieldCharset | undefined,
  onBeforeInput: FormEventHandler<T> | undefined,
  onChange: ChangeEventHandler<T> | undefined,
): CharsetGuard<T> {
  const [whisper, setWhisper] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  /** مهلتان: البقاء ثمّ الذوبان — تُحفظان معًا كي يُلغيهما رفضٌ جديد في أيّ طَور. */
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (hold.current) clearTimeout(hold.current);
    if (fade.current) clearTimeout(fade.current);
    hold.current = fade.current = null;
  };
  /** الانصراف طَورٌ لا قطع: تُعلَن `leaving` فتذوب اللوحة، ثمّ تُرفع بعد انتهاء الحركة. */
  const leave = useCallback(() => {
    clear();
    setLeaving(true);
    fade.current = setTimeout(() => {
      fade.current = null;
      setWhisper(null);
      setLeaving(false);
    }, WHISPER_OUT_MS);
  }, []);
  const hush = useCallback(() => leave(), [leave]);
  /** رفضٌ جديد يُجدّد المهلة ولا يُعيد الظهور: من يكبس المفتاح مرارًا يرى همسةً ثابتة لا وميضًا — ويردّها من ذوبانها إن كانت قد بدأت. */
  const say = useCallback(
    (rejected: string, cs: FieldCharset) => {
      clear();
      setLeaving(false);
      setWhisper(whisperFor(rejected, cs));
      hold.current = setTimeout(() => {
        hold.current = null;
        leave();
      }, WHISPER_MS);
    },
    [leave],
  );
  useEffect(() => clear, []);

  return {
    guard: {
      onBeforeInput: (e: FormEvent<T>) => {
        const { data } = e.nativeEvent as InputEvent;
        if (charset && data && stripForbidden(data, charset) === "") {
          e.preventDefault();
          say(data, charset);
        }
        onBeforeInput?.(e);
      },
      onChange: (e: ChangeEvent<T>) => {
        if (charset) {
          const clean = stripForbidden(e.target.value, charset);
          if (clean !== e.target.value) {
            say(rejectedFrom(e.target.value, charset), charset);
            e.target.value = clean;
          }
        }
        onChange?.(e);
      },
    },
    whisper,
    leaving,
    hush,
  };
}
