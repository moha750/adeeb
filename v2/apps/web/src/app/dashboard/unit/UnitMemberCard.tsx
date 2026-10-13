"use client";

import { Button, Card } from "@adeeb/design-system";
import { CalendarX } from "@phosphor-icons/react";
import { SignOut } from "@/app/_components/glyphs";
import { fmtDayMonth } from "@/lib/dates";
import { Avatar } from "../_components/Avatar";
import type { UnitMember } from "./model";

/** «٣ لجان» لا «3 لجنة» — التمييز العربيّ يفرّق المفرد والمثنّى وجمعَي القلّة والكثرة. */
export function committeesLabel(n: number): string {
  if (n === 0) return "بلا لجان";
  if (n === 1) return "لجنة واحدة";
  if (n === 2) return "لجنتان";
  if (n <= 10) return `${n} لجان`;
  return `${n} لجنة`;
}

/**
 * كرت عضو الإدارة (.ovcard) — **الانتماء وحده**: من هو، وكم يحمل، وبابُ إخراجه من الإدارة.
 *
 * كان يحمل شرائحَ لجانه ونداءَ «إسناد لجنة»، فصار للتوزيع بابان (من الشخص ومن المقعد) وعينان
 * تتناوبان على النطاق نفسه — وذاك ما شتّت. فانقسمت الشاشة قسمين (20260803): هنا الضمُّ
 * والإخراج، وفي شبكة المقاعد التوزيعُ كلُّه. والعددُ باقٍ تحت الاسم **خبرًا لا مقبضًا**:
 * يدلّ على من ضُمّ ولم يُوزَّع بعد.
 *
 * يبني على أساس `.acard` (السطح/الحدّ/الظلّ/الزاوية/النغمة — مصدرٌ واحد لا يُعاد حفره)،
 * ويقرأ رمزَي النغمة (`--card-t`/`--card-tx`) كأجزاء كرت المنصب فلا يحفر لونًا لكلّ حالة (ق٤).
 */
export function UnitMemberCard({
  member: s,
  subtitle,
  onExpel,
}: {
  member: UnitMember;
  /** سطرُ ما تحت الاسم — حِملُ الإشراف خبرًا؛ ولا سطرَ في إدارةٍ لا تُشرف. */
  subtitle: string | null;
  onExpel: () => void;
}) {
  // المكلَّف (20261010): «تكليفًا حتى …» تحت اسمه، وبابُه إنهاءُ التكليف لا الإخراج
  const acting = s.acting ? (s.acting.until ? `تكليفًا حتى ${fmtDayMonth(s.acting.until)}` : "تكليفًا") : null;
  const line = [subtitle, acting].filter(Boolean).join("، ") || null;
  return (
    // النغمة تقول الحِمل لا الانتماء: بلا لجنةٍ = عضوٌ ينتظر توزيعًا، وهو عضوٌ في الإدارة
    // على كلّ حال — إخراجُه فعلٌ آخر، بابُه الزرّ لا سحبُ آخر لجنة.
    <Card tone={subtitle === null || s.committees.length ? "brand" : "warning"} className="ovcard">
      <div className="ovcard-id">
        <Avatar name={s.name} src={s.avatar ?? undefined} gender={s.gender} size="sm" />
        <div className="ovcard-who">
          <h3 className="ovcard-name">{s.name}</h3>
          {line !== null ? <span className="ovcard-count">{line}</span> : null}
        </div>
        <Button
          variant="ghost-danger"
          size="sm"
          className="ovcard-out"
          onClick={onExpel}
          aria-label={s.acting ? `إنهاء تكليف ${s.name}` : `إخراج ${s.name} من الإدارة`}
        >
          {s.acting ? <><CalendarX aria-hidden /> إنهاء التكليف</> : <><SignOut aria-hidden /> إخراج</>}
        </Button>
      </div>
    </Card>
  );
}
