import type { ReactNode } from "react";
import { unitWord, type ChartUnit } from "../lib/units";

export type BarItem = {
  label: string;
  value: number;
  /** لون الشريط لهذا العنصر (من --chart-*) — يغلب لون القائمة `tone`. */
  color?: string;
  /** لاحقةٌ تُلحق بالتسمية (مثل «(خيار سابق)»). */
  note?: string;
  /**
   * أيقونةٌ **مشتقّةٌ من الصفّ نفسه** (أيقونة المسار من خريطة التنقّل مثلًا) — لا زينةً مكرّرة:
   * أيقونةٌ واحدةٌ تتكرّر في كلّ السطور حبرٌ بلا معلومة. والصفُّ بلا أيقونةٍ يحفظ موضعها فراغًا.
   */
  icon?: ReactNode;
};

export interface BarListProps {
  items: BarItem[];
  /** تعبئة كلّ الأشرطة (يُتجاوَز بـ `item.color`). الافتراضي `--grad-chart-bar` (= تدرّج الهوية). */
  tone?: string;
  /** أقصى قيمةٍ للمقياس — الافتراضي أكبر قيمةٍ في القائمة. */
  max?: number;
  /** إن مُرّر، تُعرض النسبة منه **مكتوبةً** بجانب القيمة (لا مخبوءةً في تلميح). */
  total?: number;
  /**
   * وحدةُ العدّ بجانب الرقم (زيارة · مشاهدة · إجابة) — تفصل الرقمَ عن النسبة وتقول ما يعدّه.
   * تُصرَّف عربيًّا بـ`Intl.PluralRules`: «زيارتان» للاثنين و«زيارات» للثلاث إلى العشر.
   */
  unit?: ChartUnit;
  /** رسالة القائمة الفارغة. */
  empty?: ReactNode;
}

const nf = (n: number) => n.toLocaleString("en-US");
// نسبةٌ دون الواحد تُكتب بعُشرها لا تُقرَّب إلى صفر: «٠٪» بجانب قيمةٍ موجودة تكذب.
// (وتُكتب رقمًا لا بعلامة «أقلّ من»: الرمز `<` محايدٌ ينقلب في فقرةٍ عربيّة.)
const pctText = (v: number, total: number) => {
  const p = (v / total) * 100;
  return p > 0 && p < 1 ? p.toFixed(1) : String(Math.round(p));
};

/**
 * قائمة أشرطة أفقيّة — **أُقِرّ شكلها ٢٠٢٦-٠٨-٠٨**:
 *
 * - **سطرُ قراءةٍ فوق الشريط:** التسمية تلي بلاطتها يمينًا، والعدد والنسبة في طرف السطر،
 *   والشريط تحتهما **بعرض البطاقة كاملًا** (كان يُضغَط في ثُلثها ويُقصّ ما طال من التسميات).
 * - **النسبة مكتوبةٌ لا مخبوءة:** كانت في `title` المتصفّح، أي معدومةً على اللمس. وموضعُها
 *   **نهايةُ الشريط** لا سطرُ العدد (٢٠٢٦-٠٨-١٠): تُقرأ حيث ينتهي الطولُ الذي تصفه، ويبقى في
 *   السطر الأعلى العددُ ووحدتُه وحدَهما. فلا رقمان متلاصقان أصلًا.
 * - **التسمية بخطّ `--font-latin`:** فالمسارات لا تسقط على الخطّ المذنّب (كانت تخرج بـLyon
 *   والقيمةُ بجانبها بـEras: خطّان في سطرٍ واحد).
 * - **التعبئة تدرّجُ الهوية** (`--grad-chart-bar` = `--grad-primary`، ق١ب: لا ينفصل اللونان) لا لونَ فئةٍ
 *   صلبًا: القائمةُ سلسلةٌ واحدة فاللونُ فيها لا يشفّر شيئًا، فليكن لون العلامة. ويُتجاوَز
 *   بـ`item.color` حيث يشفّر اللون فعلًا (خيارٌ سابقٌ بـ`--chart-6`).
 * - **الأيقونة (اختياريّة) ترسو في بلاطةٍ متراكزة الزاوية** (ق٢) تتصدّر السطر، ونغمتُها
 *   **بقاعدةٍ واحدة آليّة** لا بخيارٍ يُمرَّر: إن حمل صفٌّ لونَه الخاصّ نُسِّمت البلاطاتُ بألوان
 *   صفوفها (خيارات الاستبيان)، وإلّا بقيت محايدةً واللونُ للشريط وحده (ق١٠·٣).
 *
 * المصدر الواحد: أعلى الصفحات · الدول · المتصفّحات · المصادر (تحليلات) · توزيع خيارات الاستبيان.
 */
export function BarList({ items, tone = "var(--grad-chart-bar)", max, total, unit, empty }: BarListProps) {
  if (!items.length) return <p className="chart-empty">{empty ?? "لا بيانات."}</p>;
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  const hasIcons = items.some((it) => it.icon != null);
  const tinted = items.some((it) => it.color != null);

  return (
    <div className={"chart-bars" + (hasIcons ? " icons" : "") + (tinted ? " tinted" : "")}>
      {items.map((it, i) => {
        const c = it.color ?? tone;
        // البلاطة لا تُنسَّم إلّا بلونٍ **يخصّ الصفّ**: `tone` قد يكون تدرّجًا، و`color-mix` لا يقبله.
        const tint = tinted && it.color ? it.color : null;
        const label = `${it.label}${it.note ? ` ${it.note}` : ""}`;
        return (
          <div key={it.label + i} className="chart-bar">
            {hasIcons ? (
              <span
                className="chart-bar-ic"
                style={tint ? { background: `color-mix(in oklab, ${tint} 14%, var(--color-surface))`, color: tint } : undefined}
              >
                {it.icon}
              </span>
            ) : null}
            <div className="chart-bar-body">
              <div className="chart-bar-head">
                {/* التلميح هنا للنصّ المقصوص وحده (لا للقيمة): القيمة والنسبة مكتوبتان بجانبه. */}
                <span className="chart-bar-label" title={label}>{label}</span>
                <span className="chart-bar-val">
                  {nf(it.value)}
                  {unit ? <span className="chart-unit">{unitWord(it.value, unit)}</span> : null}
                </span>
              </div>
              {/* النسبة في **نهاية الشريط** لا في سطر العدد: تقرؤها العينُ حيث ينتهي الطولُ الذي تصفه. */}
              <span className="chart-line">
                <span className="chart-bar-track">
                  <span className="chart-bar-fill" style={{ width: `${Math.max(1, (it.value / top) * 100)}%`, background: c }} />
                </span>
                {total ? <em className="chart-pct">{pctText(it.value, total)}٪</em> : null}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
