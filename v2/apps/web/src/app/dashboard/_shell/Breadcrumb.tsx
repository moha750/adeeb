"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CaretDown } from "@/app/_components/glyphs";
import { CaretLeft } from "@/app/_components/glyphs";
import { DropdownMenu } from "../_components/DropdownMenu";
import { crumbFor, type CrumbStep } from "./crumb";
import { useNav } from "./nav-context";

/**
 * رسّامُ الفتات — يأخذ المقاطع مرسومةً ولا يسأل أين هو. مفصولٌ عن {@link Breadcrumb} لأنّ
 * القراءة (`usePathname`) والرسم مسؤوليّتان: المعرض يعرض مساراتٍ وهميّةً بهذا الرسّام نفسه،
 * فلا نسخةَ ثانية من الوسم ولا خاصّيةَ «مسارٌ مزوَّر» تُحشر في المكوّن الحقيقيّ لأجل عرضٍ.
 *
 * - **الفاصل `CaretLeft`** لا المحرف `›`: النصّ عربيّ يسير يمينًا→يسارًا، و«›» كان يشير إلى
 *   الخلف — سهمٌ يعاند القراءة. وكونُه أيقونةً من عائلة النظام يضبط مقاسَه وحبرَه بالرموز.
 * - **نصٌّ خالص بلا أيقونات:** الفتات سطرٌ ثانويّ (12px) فوق عنوانٍ (22px)، والأيقونة في هذا
 *   المقاس تزاحم العنوان؛ وصدى الشريط الجانبيّ حاصلٌ بالتسمية نفسها.
 * - **سلوك المنسدل ليس هنا:** لوحة المفاتيح وARIA والتموضع والإغلاق كلُّها من `DropdownMenu`
 *   (وتحتها `AnchoredPopover`) — لا آلةَ ثانية تُبنى لقائمةٍ ثانية.
 *
 * والتنقّل بـ`router.push` لا `<a>` داخل القائمة (كقائمة الحساب في الشريط العلويّ): ثمنُه أنّ
 * عناصر المنسدل لا تُفتح في تبويبٍ جديد — والمقاطع نفسُها روابطُ حقيقيّة فتقبلها.
 */
export function CrumbTrail({ steps }: { steps: CrumbStep[] }) {
  const router = useRouter();
  return (
    <nav className="ash-crumb" aria-label="مسار الصفحة">
      <ol>
        {steps.map((s, i) => (
          <li key={i}>
            {i > 0 ? <CaretLeft className="ash-crumb-sep" aria-hidden /> : null}
            {s.kind === "link" ? (
              <Link className="ash-crumb-a" href={s.href}>{s.label}</Link>
            ) : s.kind === "leaf" ? (
              <b aria-current="page">{s.label}</b>
            ) : s.kind === "group" && s.siblings.length > 1 ? (
              <DropdownMenu
                ariaLabel={`أقسام ${s.label}`}
                triggerClassName="ash-crumb-grp"
                trigger={<>{s.label}<CaretDown aria-hidden /></>}
                groups={[{ items: s.siblings.map((x) => ({ label: x.label, onSelect: () => router.push(x.href) })) }]}
              />
            ) : (
              // رأسُ مجموعةٍ لم يبقَ لصاحبها منها إلّا بندٌ واحد — منسدلٌ يعرض نفسك مسرحٌ لا خدمة
              <span>{s.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * فتات المسار — **فعلٌ لا شكل**. مقاطعُها تُشتقّ من خريطة التنقّل (`crumb.ts`)، فكلُّ مقطعٍ
 * فيها إمّا رابطٌ يُنقر أو زنادٌ يفتح أخواته؛ ولا مقطعَ يسمّي صفحةً ثمّ يمتنع.
 *
 * @param leaf اسم الصفحة الحاليّة حين لا يقوله بندُ الخريطة (اسم سجلّ · «تحرير» · «معاينة»).
 *   ويُترك حين تكون الصفحةُ بندَ الخريطة نفسه — فاسمُها منه.
 */
export function Breadcrumb({ leaf }: { leaf?: string }) {
  return <CrumbTrail steps={crumbFor(usePathname(), useNav(), leaf)} />;
}
