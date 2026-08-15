"use client";

import Link from "next/link";
import { Button } from "@adeeb/design-system";
import { Breadcrumb, CrumbTrail } from "../_shell/Breadcrumb";
import type { CrumbStep } from "../_shell/crumb";
import { DropdownMenu, type MenuGroup } from "./DropdownMenu";

/**
 * **رأس الصفحة** — هويّةُ الصفحة وفعلُها الواحد. لا يُركَّب على شاشةٍ حيّةٍ بعدُ:
 * يعيش في `/ui/page-header` ينتظر إقرار المالك، ومتى أُقرّ ورث `.ash-phead` وأُعدم
 * القديمُ ومعه `.form-head-actions`.
 *
 * **ولِمَ مكوّنٌ بعد أن كُتب الـCSS؟** لأنّ الـCSS يصف ولا يمنع. الشاشةُ التي تُكتب
 * غدًا تستطيع أن تحشر في `.phd-acts` أربعةَ أزرارٍ كما حشرتها اثنتا عشرة شاشةٌ في
 * `.form-head-actions` — والقاعدةُ التي تتّكل على انضباط كاتبها ليست قاعدة. فالحدُّ
 * هنا في **الأنماط لا في التعليق**: لا `children` ولا `actions: ReactNode`، بل
 * `primary` **واحدٌ** (مفردٌ في نوعه لا مصفوفة) و`menu` لِما عداه. فأربعةُ الأزرار
 * لا تُكتب أصلًا، ويردّها المترجم قبل أن تُرى. (سابقةُ ق١٢: «قانونٌ في المكتبة لا
 * خاصّيةٌ تُمرَّر» — فالمخالفةُ تصير مستحيلةً لا مذمومة.)
 *
 * **وثلاثةٌ يفرضها الشكلُ نفسُه:**
 * - **صفٌّ واحدٌ لا يلتفّ** — العنوانُ يُهذَّب (سطران ثمّ حذف) والأفعالُ لا تنكمش.
 *   فلا يطول الرأسُ بطول العنوان ولا بعدد الأزرار.
 * - **الشارةُ حالٌ لا فعل** — موضعُها سطرُ الفتات (سطرٌ قائمٌ يُستثمَر)، لا عنقودُ
 *   الأزرار حيث كانت تُقرأ زرًّا رابعًا.
 * - **ولا `leaf` للفتات** حين يقوله العنوانُ تحته — تكرارُه يستهلك سطرًا ثمّ يُقصّ
 *   فيبقى فاصلٌ معلَّقٌ بلا نصّ. فالفتاتُ ينتهي عند أبِ الصفحة.
 *
 * **وفعلُ الالتزام ليس من شأن هذا المكوّن:** «حفظ» يعيش في `SaveBar` اللاصق — لا
 * يظهر حتى يوجد ما يُحفَظ، ووجودُه نفسُه هو التنبيه. فلا تمرّره `primary`.
 */
export type PageHeaderProps = {
  title: string;
  /** ورقةُ الفتات حين لا يقولها العنوان (نادر) — والافتراضُ ألّا تُمرَّر */
  crumbLeaf?: string;
  /**
   * فتاتٌ مرسومٌ يحلّ محلَّ المشتقِّ من المسار — **للمعارض وحدَها**: صفحةٌ في `/ui`
   * ليست في خريطة اللوحة، فمسارُها لا يُخرج فتاتًا يشبه الحقيقة. ولا تمرّره شاشةٌ حيّة.
   */
  crumb?: CrumbStep[];
  /** حالُ السجلّ: مسودّة · منشور · ينتظر المراجعة. عنصرُ `Badge` من المكتبة. */
  status?: React.ReactNode;
  /**
   * الفعلُ الواحد الذي هو غايةُ الشاشة (نشر · رفع إلى المراجعة · سجلٌّ جديد).
   * **مفردٌ عمدًا:** لا مصفوفةَ ولا `ReactNode` — فلا يُحشر ثانٍ ولا ثالث.
   *
   * **و`href` لأنّ غايةَ الشاشة قد تكون تنقّلًا** (صفحةُ إنشاء)، ولو لم يُقبل الرابطُ
   * هنا لالتفّت الشاشاتُ عليه بـ`router.push` داخل `onClick` — تنقّلٌ لا يُفتح في
   * تبويبٍ جديدٍ ولا يعرفه المتصفّح رابطًا. وأحدُهما لا كلاهما (يمنعه النوع).
   */
  primary?: { label: string; icon?: React.ReactNode; loading?: boolean; disabled?: boolean } & (
    | { onClick: () => void; href?: never }
    | { href: string; onClick?: never }
  );
  /** ما عدا الفعلَ الواحد: معاينة · إلغاء النشر · حذف. يُعرض في `⋯`. */
  menu?: MenuGroup[];
};

export function PageHeader({ title, crumbLeaf, crumb, status, primary, menu }: PageHeaderProps) {
  return (
    <div className="phd">
      <div className="phd-row">
        <div className="phd-id">
          <div className="phd-meta">
            {crumb ? <CrumbTrail steps={crumb} /> : <Breadcrumb leaf={crumbLeaf} />}
            {status}
          </div>
          {/* العنوانُ كاملًا في `title` — فما قصّه السطران يُقرأ بالوقوف عليه */}
          <h1 className="phd-title" title={title}>{title}</h1>
        </div>
        {(primary || menu?.length) ? (
          <div className="phd-acts">
            {primary ? (
              primary.href ? (
                <Link href={primary.href} className="abtn abtn-primary abtn-md">{primary.icon}{primary.label}</Link>
              ) : (
                <Button variant="primary" size="md" onClick={primary.onClick} loading={primary.loading} disabled={primary.disabled}>
                  {primary.icon}{primary.label}
                </Button>
              )
            ) : null}
            {menu?.length ? (
              <DropdownMenu groups={menu} ariaLabel="أفعالٌ أخرى" triggerClassName="abtn abtn-ghost abtn-md phd-more" />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
