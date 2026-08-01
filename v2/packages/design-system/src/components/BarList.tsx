import type { ReactNode } from "react";

export type BarItem = {
  label: string;
  value: number;
  /** لون الشريط لهذا العنصر (من --chart-*) — يغلب لون القائمة `tone`. */
  color?: string;
  /** لاحقةٌ تُلحق بالتسمية (مثل «(خيار سابق)»). */
  note?: string;
};

export interface BarListProps {
  items: BarItem[];
  /** لون كلّ الأشرطة (يُتجاوَز بـ `item.color`). الافتراضي `--chart-1`. */
  tone?: string;
  /** أقصى قيمةٍ للمقياس — الافتراضي أكبر قيمةٍ في القائمة. */
  max?: number;
  /** إن مُرّر، يعرض التلميحُ نسبةَ القيمة منه (٪). */
  total?: number;
  /** رسالة القائمة الفارغة. */
  empty?: ReactNode;
}

const nf = (n: number) => n.toLocaleString("en-US");

/**
 * قائمة أشرطة أفقيّة — تسمية · شريطٌ نسبته من الأقصى · قيمة. النصّ محايد (تسمية بلون الأساس،
 * قيمة رماديّة) والعلامة اللونيّة في الشريط وحده (ق: النصّ لا يلبس لون السلسلة). لونٌ واحد
 * للقائمة أو لكلّ عنصر (`item.color`). المصدر الواحد: أعلى الصفحات · الدول · المتصفّحات ·
 * المصادر (تحليلات) · توزيع خيارات الاستبيان.
 */
export function BarList({ items, tone = "var(--chart-1)", max, total, empty }: BarListProps) {
  if (!items.length) return <p className="chart-empty">{empty ?? "لا بيانات."}</p>;
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="chart-bars">
      {items.map((it, i) => {
        const pct = total ? Math.round((it.value / total) * 100) : null;
        const title = `${it.label}: ${nf(it.value)}` + (pct != null ? ` (${pct}٪)` : "");
        return (
          <div key={it.label + i} className="chart-bar" title={title}>
            <span className="chart-bar-label">{it.label}{it.note ? ` ${it.note}` : ""}</span>
            <span className="chart-bar-track">
              <span className="chart-bar-fill" style={{ width: `${(it.value / top) * 100}%`, background: it.color ?? tone }} />
            </span>
            <span className="chart-bar-val">{nf(it.value)}</span>
          </div>
        );
      })}
    </div>
  );
}
