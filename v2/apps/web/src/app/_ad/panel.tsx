/**
 * **القسم — قطعةٌ واحدةٌ لأقسام صفحات الإحصاء والسجلّ** (٢٠٢٦-١١-٠٨). كانت نسختين باسمين: `Panel` في إحصاء الباركود و`Sec` في نتائج
 * الاستبيان، بشكلٍ واحد (محمد: «كلها» بعد أن عُدّ التكرارُ مخالفةً للهويّة). هو قسمُ «حسابي» (`.ad-sec`) برأسه: رمزٌ في مربّعه،
 * والاسمُ وسطرٌ تحته، وفعلٌ في طرفه؛ ثمّ جسمُه بحشوته (`flush`: بلا حشوة — ورقةٌ مرقّمة، أو جدولٌ بعرضه).
 * و`span` عرضُه في شبكة القالب (`.ad-st`): «wide» العمودُ العريض، و«full» السطرُ كلُّه. والقسمُ بلا جسمٍ رأسٌ وحده.
 */
import type { ReactNode } from "react";

export function AdPanel({ icon, title, sub, act, span, flush, children }: {
  icon: ReactNode;
  title: string;
  sub?: string;
  act?: ReactNode;
  span?: "wide" | "full";
  flush?: boolean;
  children?: ReactNode;
}) {
  return (
    <section className="ad-sec ad-panel" data-span={span} aria-label={title}>
      <header className="ad-sec-head">
        <span className="ad-sec-ic" aria-hidden>{icon}</span>
        <span className="ad-sec-t"><h2>{title}</h2>{sub ? <p>{sub}</p> : null}</span>
        {act ? <span className="ad-panel-act">{act}</span> : null}
      </header>
      {children ? <div className={flush ? undefined : "ad-panel-body"}>{children}</div> : null}
    </section>
  );
}
