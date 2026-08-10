import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface MedalProps {
  /** أيقونة الوسام — **إلزاميّة** (كنظام الحقل: لا وسام بلا أيقونة). */
  icon: ReactNode;
  /** اسم الوسام: «سنةٌ في أديب» · «قائدُ وحدة». */
  name: string;
  /**
   * السطر تحت الاسم. للمنول: سببُ نيله («تولّى منصب قائد»). وللمقفل: كيف يُنال.
   * وغريبٌ يقرأ الصفحة يفهم منه لِمَ يحمل صاحبُها هذا الوسام.
   */
  note?: string;
  /** تاريخ الاستحقاق مكتوبًا. وجودُه هو ما يجعل الوسام منولًا لا مقفلًا. */
  earnedOn?: string | null;
  /** ما بلغَه من العتبة — للمقفل وحدَه (٣ من ٥ فعاليّات). */
  progress?: { current: number; threshold: number } | null;
  className?: string;
}

/**
 * وسام — ما بلغَه العضو في أديب.
 *
 * حالان لا ثالثَ لهما: **منولٌ** (له `earnedOn`) فيلبس تدرّج الهوية وظلَّها، و**مقفلٌ**
 * فحدُّه متقطّعٌ ورمادُه هادئ ويحمل شريطَ ما بقي. والمقفلُ يُعرَض ولا يُخفى: المخفيُّ
 * لا يدفع أحدًا إلى شيء.
 *
 * ضعه داخل `<MedalGrid>`.
 */
export function Medal({ icon, name, note, earnedOn, progress, className }: MedalProps) {
  const locked = !earnedOn;
  const pct = progress && progress.threshold > 0
    ? Math.min(100, Math.round((progress.current / progress.threshold) * 100))
    : 0;

  return (
    <div className={cn("wsm", locked && "is-locked", className)}>
      <span className="wsm-ico" aria-hidden="true">{icon}</span>
      <div className="wsm-t">
        <span className="wsm-n">{name}</span>
        {note ? <span className="wsm-m">{note}</span> : null}
        {earnedOn ? (
          <span className="wsm-d">{earnedOn}</span>
        ) : progress ? (
          <>
            <span className="wsm-m">{`بلغ ${progress.current} من ${progress.threshold}`}</span>
            <span className="wsm-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** شبكة الأوسمة — يتّسع الصفّ لما يحتمل، والوسام لا يضيق عن ٢٢٠ بكسل. */
export function MedalGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("wsm-grid", className)}>{children}</div>;
}
