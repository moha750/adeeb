"use client";

import { Button, Card } from "@adeeb/design-system";
import { Plus, SignOut, X } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import type { UnitMember, Target } from "./model";

/** «٣ لجان» لا «3 لجنة» — التمييز العربيّ يفرّق المفرد والمثنّى وجمعَي القلّة والكثرة. */
export function committeesLabel(n: number): string {
  if (n === 0) return "بلا لجان";
  if (n === 1) return "لجنة واحدة";
  if (n === 2) return "لجنتان";
  if (n <= 10) return `${n} لجان`;
  return `${n} لجنة`;
}

/**
 * كرت عضو الوحدة (.ovcard) — **العينُ على الشخص لا على اللجنة**: مَن هو، وكم يحمل، وأيّ
 * لجانٍ بالضبط. الشرائحُ هي المحتوى نفسه لا زينةً حوله: كلّ شريحةٍ لجنةٌ يشرف عليها و«×»
 * يسحبها، وتحتها نداءٌ متقطّع يزيد لجنةً. وفي رأسه بابُ الإخراج من الوحدة — فعلٌ تنظيميّ
 * مستقلّ لا يقع أثرًا جانبيًّا لسحب آخر لجنة (كان كذلك قبل فصل الإشراف عن الانتماء).
 *
 * **وفي اللجان التنفيذيّة** لا إشرافَ يُوزَّع، فيسقط النداءُ وشريطُ الشرائح ويبقى الشخصُ
 * وبابُ إخراجه — الكرت نفسه بلا نسخةٍ ثانية، لأنّ الغائب معطًى فارغٌ لا حالةٌ أخرى.
 * (`onAdd` اختياريّة: من لا يوزّع لا يُعرض له نداءُ التوزيع.)
 *
 * يبني على أساس `.acard` (السطح/الحدّ/الظلّ/الزاوية/النغمة — مصدرٌ واحد لا يُعاد حفره)،
 * ويقرأ رمزَي النغمة (`--card-t`/`--card-tx`) كأجزاء كرت المنصب فلا يحفر لونًا لكلّ حالة (ق٤).
 */
export function UnitMemberCard({
  member: s,
  subtitle,
  onAdd,
  onRemove,
  onExpel,
}: {
  member: UnitMember;
  /** سطرُ ما تحت الاسم — حِملُ الإشراف في الإدارات، وصفةُ العضو في اللجان. */
  subtitle: string;
  onAdd?: () => void;
  onRemove: (c: Target) => void;
  onExpel: () => void;
}) {
  return (
    // النغمة تقول الحِمل لا الانتماء: بلا لجنةٍ = عضوٌ ينتظر توزيعًا، وهو عضوٌ في الوحدة
    // على كلّ حال — إخراجُه فعلٌ آخر، بابُه الزرّ لا سحبُ آخر لجنة. ومن لا توزيعَ في وحدته
    // لا «حِملَ» له فتبقى نغمتُه نغمةَ العلامة.
    <Card tone={!onAdd || s.committees.length ? "brand" : "warning"} className="ovcard">
      <div className="ovcard-id">
        <Avatar name={s.name} src={s.avatar ?? undefined} gender={s.gender} size="sm" />
        <div className="ovcard-who">
          <h3 className="ovcard-name">{s.name}</h3>
          <span className="ovcard-count">{subtitle}</span>
        </div>
        <Button
          variant="ghost-danger"
          size="sm"
          className="ovcard-out"
          onClick={onExpel}
          aria-label={`إخراج ${s.name} من الوحدة`}
        >
          <SignOut weight="bold" aria-hidden /> إخراج
        </Button>
      </div>

      {s.committees.length ? (
        <div className="ovcard-coms">
          {s.committees.map((c) => (
            <span key={c.id} className="ovcard-com">
              {c.name}
              <button
                type="button"
                className="ovcard-com-x"
                onClick={() => onRemove(c)}
                aria-label={`سحب إشراف ${s.name} على ${c.name}`}
              >
                <X weight="bold" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {onAdd ? (
        <button type="button" className="ovcard-add" onClick={onAdd}>
          <Plus weight="bold" aria-hidden /> إسناد لجنة
        </button>
      ) : null}
    </Card>
  );
}
