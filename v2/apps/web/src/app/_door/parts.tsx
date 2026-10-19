import type { ReactNode } from "react";
import Link from "next/link";
import { Alert } from "@adeeb/design-system";
import { ArrowLeft, ArrowRight, PencilSimple } from "@/app/_components/glyphs";

/**
 * **أجزاءُ البابين** — مفرداتٌ واحدةٌ للبوّابة والإنشاء والاستعادة، أصنافُها `.door-*` في
 * `components.css`. (كانت حوارًا مع ديبو — `Says`/`Reply` — ثمّ اعتمد المالك ٢٠٢٦-١٠-١٨ شكلَ
 * «القسمين»: ديبو في لوح الهويّة، والنموذجُ نموذجٌ مألوف.)
 */

/**
 * رأسُ الخطوة بلغة عناوين الموقع («الرأس المذهّب» — `LandingHeading`): عينٌ كبيرةٌ تتلاشى إلى
 * الأرض، والعنوانُ بتدرّج الهويّة على تظليلٍ كقلم التحديد، وسطرٌ تحته. ويلتفّ إن طال (عناوينُ
 * الخطوات أطولُ من كلمتين)، والتظليلُ يتبع كلَّ سطر.
 */
export function Head({ children, kicker, sub }: { children: ReactNode; kicker?: ReactNode; sub?: ReactNode }) {
  return (
    <header className="door-head">
      {kicker ? <p className="door-kicker" aria-hidden>{kicker}</p> : null}
      <h1 className="door-title">
        <span className="door-mark"><span className="door-ink">{children}</span></span>
      </h1>
      {sub ? <p className="door-sub">{sub}</p> : null}
    </header>
  );
}

/**
 * تنبيهٌ في الخطوة: خطأٌ، أو «ليس لك حسابٌ» ومعه ما يُكمل. هو `Alert` الموقع نفسُه — فتنبيهاتُ
 * البوّابة والإنشاء والاستعادة والتعيين بهيئةٍ واحدة.
 */
export function Note({
  tone, title, children, actions,
}: { tone: "error" | "warn"; title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return <Alert tone={tone === "error" ? "danger" : "warning"} title={title} actions={actions}>{children}</Alert>;
}

/** ما اخترتَه أو كتبتَه (البريد، سببُ مجيئك) شارةً فوق العنوان، وقلمُها يعيدك إليه. */
export function Chip({ children, onEdit, ltr, label }: { children: ReactNode; onEdit: () => void; ltr?: boolean; label: string }) {
  return (
    <div className="door-chip">
      <span dir={ltr ? "ltr" : undefined}>{children}</span>
      <button type="button" className="door-chip-edit" onClick={onEdit} aria-label={label}>
        <PencilSimple size={14} />
      </button>
    </div>
  );
}

/** رجوعٌ إلى الخطوة السابقة. */
export function Back({ onClick, children = "رجوع" }: { onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" className="door-back" onClick={onClick}>
      <ArrowRight size={16} />
      {children}
    </button>
  );
}

/** أزرارُ اختيارٍ عريضة — أزرارُ الهويّة نفسُها (`.abtn`)، لا أزرارٌ مصنوعةٌ للباب. */
export function Ways({ children, label }: { children: ReactNode; label?: string }) {
  return <div className="door-ways" role="group" aria-label={label}>{children}</div>;
}

/**
 * زرٌّ من أزرار الهويّة بعرض الخطوة: `main` بتدرّجها (`abtn-primary`) لأوّل طرق الدخول وحده، وما
 * سواه بإطارها (`abtn-ghost`). وشارةُ «آخر دخول» على حافّته العليا (المالك: «مكانها السابق أجمل») —
 * أختُ الزرّ لا ابنتُه، فالزرُّ يقصّ ما يخرج منه (شعاعُه).
 */
export function Way({
  icon, children, tag, onClick, disabled, busy, main,
}: { icon?: ReactNode; children: ReactNode; tag?: ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean; main?: boolean }) {
  return (
    <div className="door-way-wrap">
      <button
        type="button"
        className={`abtn abtn-lg ${main ? "abtn-primary" : "abtn-ghost"} door-way`}
        onClick={onClick}
        disabled={disabled}
        aria-busy={busy || undefined}
      >
        {busy ? <span className="door-spin" aria-hidden /> : icon}
        <span>{children}</span>
        {tag ? <span className="sr-only">، {tag}</span> : null}
      </button>
      {tag ? <span className="door-last" aria-hidden>{tag}</span> : null}
    </div>
  );
}

/**
 * البابُ الآخر في ذيل الخطوة: «ليس لك حساب؟» وبجانبها زرٌّ صغيرٌ بسهمٍ يتقدّم عند المرور — لا رابطٌ
 * مسطّر (المالك يكره الخطَّ تحت الروابط، وأراد للذيل «روحًا»).
 */
export function AltLink({ lead, href, children }: { lead: ReactNode; href: string; children: ReactNode }) {
  return (
    <div className="door-alt">
      <span>{lead}</span>
      <Link href={href} className="abtn abtn-sm abtn-ghost door-alt-go">
        {children}
        <ArrowLeft size={15} />
      </Link>
    </div>
  );
}

/** حقولُ الخطوة وزرُّها. */
export function Fields({ children }: { children: ReactNode }) {
  return <div className="door-fields">{children}</div>;
}
