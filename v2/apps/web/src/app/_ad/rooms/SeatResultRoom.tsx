"use client";

/**
 * **نتيجةُ المقعد** (رحلةُ العضو ع١١، ٢٠٢٦-١١-١٩): ما يراه الناخبُ والمرشّحُ حين يُعلَن المقعد — من إشعار «فاز فلان بمقعد كذا» ومن ورقته
 * بعد إغلاقها (`/dashboard/elections/vote/[electionId]`). **بلا أرقام** (المواصفة §ع١١): الأوزانُ والأصواتُ لمديري الانتخابات وحدهم.
 * - **اكتمل بفائز:** كرتُ الشخص نفسُه الذي صوّت عليه (`AdCard face`) بشارة «فائز/فائزة» على وجهه، وسطرا المقعد ويوم الإعلان — وفي تصويت
 *   الثقة «بتأييد الناخبين».
 * - **اكتمل بتعيين** (المقعدُ المتعثّر، المادة ٢٥): الكرتُ نفسُه بشارة «مُعيَّن/مُعيَّنة»، ولا «فاز» لمن لم يُنتخَب.
 * - **أُغلق التصويت ولم يُعلَن:** تنبيهٌ بأنّ الإعلان آليّ حين يكتمل ما ينتظره (المادة ٢٨: تعادلٌ أو مقعدٌ مرتبطٌ أو ترشّحٌ مجمَّد). كان
 *   يقول «خلال ثلاثة أيّام» ولا أصل لها في النظام (٢٠٢٦-١١-١٩).
 * - **أُلغي:** تنبيهٌ بسببه ويومه (المادة ٢٩).
 */
import { Scales, Trophy, UserCirclePlus } from "@phosphor-icons/react";
import type { SeatResult } from "@/app/dashboard/elections/member-data";
import { AdBadge, AdCard, AdNote, type AdMeta } from "../primitives";
import { RecordTicket } from "../record";
import { dayParts } from "../format";

export function SeatResultRoom({ r }: { r: SeatResult }) {
  const she = r.person?.gender === "female";
  const g = (m: string, f: string) => (she ? f : m);
  const at = r.status === "cancelled" ? r.cancel?.atRaw ?? null : r.atRaw;
  const appointed = r.completedBy === "appointment";

  const chip = r.status === "completed" ? <AdBadge tone="ok" icon={<Trophy />}>اكتمل الانتخاب</AdBadge>
    : r.status === "cancelled" ? <AdBadge tone="bad">أُلغي الانتخاب</AdBadge>
    : <AdBadge tone="info">أُغلق التصويت</AdBadge>;

  // **لا تكرار** (`DESIGN.md`): المقعدُ اسمُ التذكرة، ويومُ الإعلان كعبُها، والحالُ شارتُها — فالكرتُ يقول ما لا تقوله: كيف اكتمل
  const meta: AdMeta[] = [
    ...(r.sole ? [{ icon: <Scales />, text: "بتأييد المصوّتين في تصويت الثقة" }] : []),
    ...(appointed ? [{ icon: <UserCirclePlus />, text: g("عُيّن بعد تعثّر الانتخاب", "عُيّنت بعد تعثّر الانتخاب") }] : []),
  ];

  return (
    <div className="ad-room ad-elw-pg">
      <RecordTicket
        path="/dashboard/elections/vote"
        title={r.position}
        seed={r.electionId}
        stub={at ? (() => { const d = dayParts(at); return { big: d.day, small: d.month }; })() : undefined}
        chips={chip}
        info={[]}
        back={{ label: "العودة إلى التصويت", href: "/dashboard/elections/vote" }}
      />

      {r.status === "completed" && r.person ? (
        <div className="ad-res">
          <AdCard seed={r.electionId} title={r.person.name}
            face={{ name: r.person.name, src: r.person.avatarUrl, gender: she ? "female" : r.person.gender === "male" ? "male" : null,
              mark: appointed ? <AdBadge icon={<UserCirclePlus />}>{g("مُعيَّن", "مُعيَّنة")}</AdBadge> : <AdBadge icon={<Trophy />}>{g("فائز", "فائزة")}</AdBadge> }}
            meta={meta} />
        </div>
      ) : null}

      {r.status === "voting_closed" ? (
        <AdNote tone="info" label="أُغلق التصويت" title="تُعلَن النتيجةُ آليًّا حين تكتمل، ويصلك إشعارٌ بها." />
      ) : null}

      {r.status === "cancelled" ? (
        <AdNote tone="bad" label="أُلغي الانتخاب" title={r.cancel?.reason ? `السبب: ${r.cancel.reason}` : "أُلغي انتخابُ هذا المقعد."} />
      ) : null}
    </div>
  );
}
