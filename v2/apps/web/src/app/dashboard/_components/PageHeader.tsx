"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Button } from "@adeeb/design-system";
import { ArrowRight } from "@/app/_components/glyphs";
import { CrumbTrail } from "../_shell/Breadcrumb";
import { crumbFor, type CrumbStep } from "../_shell/crumb";
import { useNav } from "../_shell/nav-context";
import { DropdownMenu, type MenuGroup } from "./DropdownMenu";

/**
 * **رأسُ الصفحة** — أُقرّ ٢٠٢٦-٠٨-٢٢ وأُعدم سلَفُه (`.phd`) كما أُعدم الأوّلُ يوم أُقرّ هو.
 *
 * **قيدُ المالك: لا يُستغنى عن الحال ولا زرِّ الرجوع ولا الفتات.** ورُفض قبله جيلٌ رتّب
 * القطعَ ولم يحلّ، وأربعةُ فروضٍ كلٌّ منها يشتري حلَّه بإسقاط واحدةٍ من الثلاث.
 *
 * **وترتيبُه بكلمته:** صفٌّ للملاحة (رجوعٌ ومسار)، وصفٌّ للاسم وحاله، وصفٌّ للفعل والنقاط.
 * وعلى الشاشة الواسعة يعود الفعلُ إلى جوار الاسم، وعلى الجوّال يمتدّ صفُّه.
 *
 * **والمفتاحُ: الفتاتُ يُمرَّر ولا يُقصّ.** كلُّ محاولةٍ قبله افترضت أنّ سطرَ الفتات لا بدّ
 * أن يسع ما فيه، فإن ضاق قُصّ أو أُسقطت الشارة. وحين صار مضمارًا يُسحَب بالإصبع سقط
 * التنازعُ من أصله.
 *
 * وثمانيةُ أعطالٍ مقيسةٍ زالت به (`v2/PAGE-HEADER.md`): هدفُ الفتات كان 53×20 فصار 44
 * بالضلعين · والورقةُ كانت تعيد العنوانَ في ٣٦ شاشةً من ٥٤ فتُسقَط حين تساويه وحدَه ·
 * والشارةُ كانت تخنق الفتات فانتقلت إلى سطر الاسم · والمنشورُ كان يعرض `⋯` صامتةً فصار
 * `action.kind: "reverse"` يسمّي الفعلَ العكسيّ · وانزياحُ 30px زال · وتوأمُ الحجم زال ·
 * وخانةُ الحال صارت نوعًا مضيَّقًا يرسمه المكوّن.
 *
 * **ولا يتبع التمرير** (قرارُه ٢٠٢٦-٠٨-٢٢): جُرّب لاصقًا يتكثّف جزيرةً فرُفض.
 */

export type HeaderTone = "neutral" | "info" | "success" | "warning" | "danger";

/** حالُ السجلّ. نوعٌ مضيَّقٌ يرسمه المكوّن، فلا تُحشَر فيه أزرارٌ ولا عناصرُ أخرى. */
export type HeaderStatus = {
  label: string;
  tone: HeaderTone;
  variant?: "soft" | "solid" | "outline";
  icon?: React.ReactNode;
  /** نبضٌ للحيّ (اقتراعٌ جارٍ · بثٌّ مباشر) */
  live?: boolean;
};

export type HeaderAction = {
  label: string;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  /** `primary` فعلُ التقدّم، و`reverse` الفعلُ العكسيُّ مسمًّى لا مطويًّا في `⋯` */
  kind?: "primary" | "reverse";
} & ({ onClick: () => void; href?: never } | { href: string; onClick?: never });

export type PageHeaderProps = {
  title: string;
  /** اسمُ الصفحة في الفتات حين لا يقوله بندُ الخريطة (سجلٌّ بعينه · «تحرير» · «معاينة») */
  crumbLeaf?: string;
  /** فتاتٌ مرسومٌ يحلّ محلَّ المشتقِّ من المسار — **للمعارض وحدَها** */
  crumb?: CrumbStep[];
  /** وجهةُ زرّ الرجوع. تُشتقّ من الفتات حين لا تُمرَّر. */
  parent?: { label: string; href: string };
  status?: HeaderStatus;
  /** الفعلُ الواحد الذي هو غايةُ الشاشة. مفردٌ عمدًا: لا مصفوفةَ ولا `ReactNode`. */
  action?: HeaderAction;
  /** ما دون الفعل الواحد: معاينةٌ · إلغاءُ نشرٍ · حذف. */
  menu?: MenuGroup[];
};

export function PageHeader({ title, crumbLeaf, crumb, parent, status, action, menu }: PageHeaderProps) {
  const pathname = usePathname();
  const nav = useNav();
  const steps = crumb ?? crumbFor(pathname, nav, crumbLeaf);

  /**
   * الورقةُ تُسقَط **حين تساوي العنوانَ وحدَه**: هذا هو التكرارُ المقيس (٣٦ شاشةً من ٥٤)،
   * وما عداه مقطعٌ يحمل معنًى فيبقى. فالفتاتُ لم يُنقَص، والمحذوفُ ليس منه.
   */
  const trail = steps.filter(
    (s, i) => !(i === steps.length - 1 && s.kind === "leaf" && s.label.trim() === title.trim()),
  );

  /** وجهةُ الرجوع: آخرُ مقطعٍ يُنقر في المسار، فهي أبُ الصفحة بلا أن تكتبه كلُّ شاشة */
  const up =
    parent ??
    [...trail].reverse().reduce<{ label: string; href: string } | undefined>(
      (found, s) => found ?? (s.kind === "link" ? { label: s.label, href: s.href } : undefined),
      undefined,
    );

  return (
    <div className="phn-c">
      <header className="phn">
        {up || trail.length ? (
          <div className="phn-nav">
            {up ? (
              <Link href={up.href} className="abtn abtn-ghost abtn-sm phn-back" aria-label={`رجوع إلى ${up.label}`}>
                <ArrowRight size={18} aria-hidden />
                رجوع
              </Link>
            ) : null}
            {trail.length ? (
              <div className="phn-trail">
                <CrumbTrail steps={trail} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="phn-main">
          {/* الشارةُ **داخلَ** العنوان لا إلى جانبه: إلى جانبه تتوسّط الكتلةَ رأسيًّا فتقع
              بين السطرين، وداخلَه تجري مع النصّ فتستقرّ في نهاية آخر سطر. */}
          <h1 className="phn-title" title={title}>
            {title}
            {status ? (
              <span className="phn-state">
                <Badge tone={status.tone} variant={status.variant} dot live={status.live} icon={status.icon}>
                  {status.label}
                </Badge>
              </span>
            ) : null}
          </h1>
        </div>

        {action || menu?.length ? (
          <div className="phn-acts">
            {action ? (
              action.href ? (
                <Link
                  href={action.href}
                  className={`abtn abtn-${action.kind === "reverse" ? "ghost" : "primary"} abtn-md`}
                >
                  {action.icon}
                  {action.label}
                </Link>
              ) : (
                <Button
                  variant={action.kind === "reverse" ? "ghost" : "primary"}
                  size="md"
                  loading={action.loading}
                  disabled={action.disabled}
                  onClick={action.onClick}
                >
                  {action.icon}
                  {action.label}
                </Button>
              )
            ) : null}
            {menu?.length ? (
              <DropdownMenu groups={menu} ariaLabel="أفعالٌ أخرى" triggerClassName="abtn abtn-ghost abtn-md phn-more" />
            ) : null}
          </div>
        ) : null}
      </header>
    </div>
  );
}
