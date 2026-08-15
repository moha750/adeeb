"use client";

import { useRouter } from "next/navigation";
import { Alert, Badge, Button, ModalSectionHeading } from "@adeeb/design-system";
import { Archive, Clock, FlagCheckered, Scales, Trophy } from "@phosphor-icons/react";
import { PencilSimple, Prohibit, XCircle } from "@/app/_components/glyphs";
import { Breadcrumb } from "../../_shell/Breadcrumb";
import { OpportunityCard } from "../_member/OpportunityCard";
import type { CandidacyJourney as CJ, RecordTone } from "../member-data";

/**
 * باب «سِجلّ ترشُّحي» — **كشفٌ ثمّ صفحة**: كلُّ ترشّحٍ كرتٌ بلغة بابَي «الترشُّح» و«التصويت»
 * نفسِها (`OpportunityCard`)، والدخولُ إلى صفحته `‎/my/[electionId]` حيث الرحلةُ والبيانُ
 * والتحكّم. وقسمان لا واحد: **القائم الآن** (ينتظر منك أو ينتظر نتيجتَه) و**المؤرشف**
 * (استقرّ مآلُه) — فلا يزاحم المنقضي ما يطلب فعلَك.
 *
 * والكرتُ يقول حالَه ثلاثًا: نغمةُ سطحِه، وشارتُه، وأيقونةُ مآله — فيُعرَف قبل أن يُقرأ.
 * وسبَبُ هجرِ السرد الكامل في الكشف أنّ سبعةَ ترشّحاتٍ كانت سبعةَ أقسامٍ متساويةِ الوزن
 * في تمريرٍ طويل، لا مدخلَ لها ولا مرساةَ زمن.
 */

const iconOf = (c: CJ) =>
  c.statusLabel === "فائز" ? <Trophy /> :
  c.statusLabel === "مرفوض" ? <XCircle /> :
  c.statusLabel === "منسحب" ? <Prohibit /> :
  c.statusLabel === "لم يُوفَّق" ? <FlagCheckered /> :
  c.statusLabel === "يحتاج تعديلًا" ? <PencilSimple /> :
  c.statusLabel === "معتمَد" ? <Scales /> : <Clock />;

/** نغمةُ الكرت من نغمة الحال — و«info» تصير `brand` (الكروت بلا نغمةٍ بهذا الاسم). */
const cardTone = (t: RecordTone) => (t === "info" ? "brand" : t);

export function MyCandidaciesView({ items, error }: { items: CJ[]; error: string | null }) {
  const router = useRouter();
  const live = items.filter((c) => !c.archived);
  const past = items.filter((c) => c.archived);

  const card = (c: CJ) => (
    <OpportunityCard
      key={c.candidateId}
      tone={cardTone(c.statusTone)}
      icon={iconOf(c)}
      badge={<Badge tone={c.statusTone} dot>{c.statusLabel}</Badge>}
      title={c.position}
      subtitle={c.cycle}
      action={
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/elections/my/${c.electionId}`)}>
          عرض الترشّح
        </Button>
      }
    />
  );

  return (
    <>
      <div className="ash-phead"><div><Breadcrumb /><h1>سِجلّ ترشُّحي</h1></div></div>

      {error ? <Alert tone="warning" title="تعذّر جلب ترشّحاتك">{error}</Alert> : null}
      {!error && items.length === 0 ? (
        <Alert tone="info" title="لا ترشّحات بعد">حين تترشّح لانتخابٍ، يظهر هنا كرتُه: حالُه، وبابُه إلى رحلته وبيانك.</Alert>
      ) : null}

      <div className="mpage">
        {live.length > 0 ? (
          <>
            <ModalSectionHeading icon={<Scales />} title="القائم الآن" />
            <div className="opp-grid">{live.map(card)}</div>
          </>
        ) : null}

        {past.length > 0 ? (
          <>
            <ModalSectionHeading icon={<Archive />} title="المؤرشف" />
            <div className="opp-grid">{past.map(card)}</div>
          </>
        ) : null}
      </div>
    </>
  );
}
