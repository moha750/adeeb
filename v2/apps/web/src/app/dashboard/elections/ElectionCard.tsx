"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, CardBody, CardFooter, CardHeader } from "@adeeb/design-system";
import { Hourglass, PaperPlaneTilt, Scales, Timer, Trophy } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import { Checks, Prohibit } from "@/app/_components/glyphs";
import { StatusBadge } from "./StatusBadge";
import { byGender, deadlineOf, deadlineRawOf, type ElectionStatus } from "./vocab";
import { fmtDate, fmtDayMonth } from "@/lib/dates";
import { arDuration } from "@/lib/duration";
import { firstAndLastOf } from "@/lib/personName";
import type { ElectionRow } from "./data";

/**
 * كرت الانتخاب — **المسار**: اختاره المالك ٢٠٢٦-٠٨-١٤ بعد معاينةِ أربعة توجّهات في
 * `/ui/election-card` (أُعدم أخواه بإقراره وحُذفت المعاينة).
 *
 * رحلةُ المقعد مرسومةً ثلاثَ عقد (ترشّح ← تصويت ← اكتمال): المنقضي مصمتٌ بتدرّج الهوية، والجاري
 * منغَّمٌ **ينبض** نبضةَ رادار «نحن هنا»، والقادمُ متقطّعٌ باهت. وتحت كلّ عقدةٍ حصادُها بمحاذاةٍ
 * مقيسةٍ بالبكسل، فيُقرأ الصفُّ مع المسار لا سطورًا مبعثرة. والقشرةُ من عائلة `Card` والتشريحُ
 * `.ecard-*` بالمكتبة (ق١) — لا تنسيقَ شارد.
 *
 * **ولا `interactive`** (قرار المالك): الكرت ليس زنادًا فلا يزرقّ حدُّه كلَّه عند المرور،
 * والدخولُ بزرٍّ صريحٍ في الذيل — هدفٌ واحدٌ يُضغط لا سطحٌ كامل.
 */
type Props = {
  election: ElectionRow;
  /** نغمة الكرت — يشتقّها الأب من مصدر النغمة نفسه (SURFACE_TONE) فتُطابق نغمةَ صفّ الجدول. */
  tone?: "success" | "warning" | "danger";
  /**
   * تبويب «الجارية» يخلط أربع حالات، فيحمل الكرت شارتَه وسطرَ حاله.
   * وفي «مكتملة»/«ملغاة» قالهما التبويبُ سلفًا فيسقطان — حكمُ عمودَي الجدول نفسُه.
   */
  live?: boolean;
  /** فتح التفاصيل — يحمله زرُّ الذيل وحدَه. */
  onOpen?: () => void;
};

type StepState = "done" | "cur" | "future";

/** حالُ كلّ طورٍ من حال الانتخاب. والملغى: مشى ثمّ وقف، فآخرُ عقدةٍ منعٌ لا كأس. */
function stepsOf(status: ElectionStatus): { label: string; icon: React.ReactNode; state: StepState }[] {
  if (status === "cancelled") {
    return [
      { label: "ترشّح", icon: <PaperPlaneTilt aria-hidden />, state: "done" },
      { label: "تصويت", icon: <Checks aria-hidden />, state: "future" },
      { label: "ألغي", icon: <Prohibit aria-hidden />, state: "cur" },
    ];
  }
  const candidacy: StepState = status === "candidacy_open" || status === "candidacy_closed" ? "cur" : "done";
  const voting: StepState =
    status === "voting_open" || status === "voting_closed" ? "cur"
      : status === "completed" ? "done" : "future";
  return [
    { label: "ترشّح", icon: <PaperPlaneTilt aria-hidden />, state: candidacy },
    { label: "تصويت", icon: <Checks aria-hidden />, state: voting },
    { label: "اكتمال", icon: <Trophy aria-hidden />, state: status === "completed" ? "done" : "future" },
  ];
}


/**
 * ساعةٌ عميليّة — صفرٌ على الخادم وفي أوّل رندر (فلا يختلف المرسومان ولا تنكسر الإماهة)،
 * ثمّ تنبض كلّ دقيقة. سابقةُ `useClientNow` في سطر حالة الاستبيان.
 */
function useClientNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t0 = setTimeout(() => setNow(Date.now()), 0);
    const tick = setInterval(() => setNow(Date.now()), 60_000);
    return () => { clearTimeout(t0); clearInterval(tick); };
  }, []);
  return now;
}

export function ElectionCard({ election: e, tone, live, onOpen }: Props) {
  const now = useClientNow();
  const deadlineRaw = deadlineRawOf(e);
  const phaseClosed = e.status === "candidacy_closed" || e.status === "voting_closed";

  /**
   * حصادُ الخانة الثالثة (تحت «اكتمال»):
   * • الحيُّ الموقوت ← ما بقي من مدّته («يومين» متبقٍّ)، وبعد فواته «انقضى الموعد» (الكنّاسة لم تمرّ بعدُ).
   *   والزوجُ يُقرأ جملةً في الحالين — لا «انتهى متبقٍّ» المتناقضة.
   * • الحيُّ الذي لا موعدَ له ← «مفتوح» تحتها «بلا موعد»: لا يُقاس ما لا نهايةَ له.
   * • المغلقُ طورُه ← **خطوتُك التالية** (فتحُ التصويت · إعلانُ الفائز)؛ والسطرُ تحتها يقول إنّه
   *   بانتظار قرارك — الخانةُ تسمّي الفعل والسطرُ يسمّي المنتظِر، فلا خانةَ خالية ولا سطرَ ساقط.
   *   وتُقسَم جملتُه على سطرَي الخانة (أمرٌ قيمةً · مفعولٌ لقبًا): كلمتان في قيمةٍ واحدة تنكسران
   *   من تلقائهما فتصير الخانةُ ثلاثةَ أسطر (رآه المالك ٢٠٢٦-٠٨-١٤، وأساسُ الشبكة 252px فثلثُها
   *   يضيق)، والقسمةُ تحسمها سطرين في كلّ عرض. وكلمةٌ واحدةٌ تسع مقاسَ العدّ، **فيستوي السطرُ
   *   الأوّل في الخانات الثلاث** (أمرُ المالك) ويستوي الثاني — صفٌّ واحدٌ لا مقاسات. ولا يضيع
   *   «خطوتك» معنًى: سطرُ الحال تحته يقوله («بانتظار قرارك»)، و«إعلان · الفائز» يُمهّد لِما بعده
   *   حين يحلّ اسمُ الفائز محلَّ «إعلان» تحت اللقب نفسه.
   * • المكتمل ← **«الفائز» قيمةً واسمُه تحتها** (أمرُ المالك ٢٠٢٦-٠٨-١٤): الخانتان الأُخريان
   *   عددٌ فوق تسميته، فلو حمل الاسمُ موضعَ العدد لقُرئ الصفُّ بلغتين. والسطرُ الأدقُّ يسع اسمين
   *   (اسمُه وعائلتُه، `firstAndLastOf`) بينما موضعُ العدد لا يسع إلّا كلمة. والملغى ← يومُ إلغائه.
   * والعدُّ لا يُرسم قبل التركيب (now = 0) فيبقى موضعُه بعلامةٍ ساكنة ولا يومض فارغًا.
   *
   * ومقاسٌ واحدٌ للسطر الأوّل في الخانات الثلاث (`.ecard-v`): كان النصُّ يُخفَض إلى `.ecard-t` كي
   * لا ينكسر، وقد سقطت علّتُه حين قصُرت كلُّ قيمةٍ إلى كلمة — فأُعدم العَلَمُ والصنفُ معه.
   */
  const harvest: { value: string; label: string } | null =
    e.status === "cancelled" ? (e.archivedRaw ? { value: fmtDayMonth(e.archivedRaw), label: "ألغي" } : null)
      : e.status === "completed" ? (e.winnerName ? { value: byGender(e.winnerGender, "الفائز", "الفائزة"), label: firstAndLastOf(e.winnerName) } : null)
        : phaseClosed
          ? (e.status === "candidacy_closed"
            ? { value: "افتح", label: "التصويت" }
            : { value: "أعلن", label: "الفائز" })
          : !deadlineRaw ? { value: "مفتوح", label: "بلا موعد" }
            : now === 0 ? { value: "…", label: "متبقٍّ" }
              : new Date(deadlineRaw).getTime() <= now ? { value: "انقضى", label: "الموعد" }
                : { value: arDuration(new Date(deadlineRaw).getTime() - now), label: "متبقٍّ" };

  /**
   * سطرُ الحال — هيئةُ سطر الحالة في كرت الاستبيان (رقاقةُ Aurora منغَّمة + جملة): الموقوتُ يقول
   * موعدَه بتاريخه وساعته، وما لا موعدَ له يقول أنّه بيدك، والمغلقُ طورُه والمتعثّرُ أنّهما واقفان
   * على قرارك.
   *
   * **ولا يسقط عن حالٍ أبدًا**: أسقطتُه مرّةً عن المغلق تفاديًا للتكرار، فتفاوتت الكروتُ في
   * الصفّ الواحد (تتساوى ارتفاعًا فيبقى الخلاء تحت الأقصر) — رآه المالك. والتكرارُ مدفوعٌ
   * بقسمة العمل لا بالنصّ: **الخانةُ تسمّي خطوتَك** (فتحُ التصويت) **والسطرُ يقول من ينتظر مَن**.
   *
   * وفي المغلقِ ترشُّحُه يسمّي السطرُ ما بقي صريحًا (أمرُ المالك ٢٠٢٦-٠٨-١٤): «تبقّى فتح باب
   * التصويت» — بابٌ واحدٌ أُغلق وآخرُ ينتظر أن يُفتح، فالجملةُ تقول الفعلَ لا الانتظارَ وحده.
   */
  const await_: { text: string; tone: "steel" | "warning" } =
    e.status === "candidacy_closed" ? { text: "تبقّى فتح باب التصويت", tone: "warning" }
      : phaseClosed || e.stalled ? { text: "بانتظار قرارك", tone: "warning" }
      : deadlineOf(e) ? { text: `يُغلق ${deadlineOf(e)}`, tone: "steel" }
        : { text: "يُغلق بشكل يدوي", tone: "warning" };

  /**
   * **وجهُ المكتمل — صفُّ المنتخَب** (أقرّه المالك ٢٠٢٦-٠٨-١٤ في `/ui/winner-card`، وحُذفت
   * المعاينة): انقضت الرحلةُ فلا مسارَ يُرسم ولا مهلةَ تُعَدّ، والجوابُ صار **من فاز**.
   * فالصورةُ بتاجٍ على ركنها (موضعُ شارة رقم المرشّح نفسُه)، والمقعدُ شارةً لا سطرًا رماديًّا،
   * وسطرُ الفوز برقاقته يقول الرقمَ ومقياسَه معًا. والمكتملُ بلا فائزٍ مُعلَن يبقى على المسار.
   */
  if (e.status === "completed" && e.winnerName) {
    return (
      <Card tone={tone}>
        <CardBody>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="wcard-avwrap">
                <Avatar name={e.winnerName} src={e.winnerAvatar ?? undefined} gender={e.winnerGender} size="xl" />
                <b className="wcard-crown"><Trophy weight="fill" aria-hidden /></b>
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="wcard-name">{e.winnerName}</h3>
                <span><Badge tone="success" variant="soft">{e.roleLabel}{e.scopeLabel ? ` ${e.scopeLabel}` : ""}</Badge></span>
              </div>
            </div>
            <span className="ccard-att">
              <span className="tico tico-success"><Trophy aria-hidden /></span>
              <span className="ccard-att-txt">
                فاز بـ<b className="font-latin">{e.winnerVotes}</b> صوتًا، ونافسه <b className="font-latin">{Math.max(0, e.candidates - 1)}</b>
              </span>
            </span>
          </div>
        </CardBody>
        <CardFooter>
          <span className="text-sm text-content-muted">أُعلن في {fmtDate(e.archivedRaw)}</span>
          <Button variant="success" size="sm" className="shrink-0" onClick={onOpen}>فتح الانتخاب</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card tone={tone}>
      {/* سطرٌ واحدٌ للمنصب (`acard-header-clip`)، ومساحتُه تأتي من **الشارة**: المسارُ تحتها يرسم
          الطورَ (ترشّح · تصويت) فتكرارُه في الشارة حبرٌ بلا معلومة — فتقول الشارةُ الحالَ وحدَه
          («مفتوح» · «مغلق») وتبقى كاملةً في الجدول حيث لا مسارَ يرسمه، وفي «تصويت جارٍ» حيث
          «جارٍ» وحدَه لا يقوم بنفسه. */}
      <CardHeader
        className="acard-header-clip acard-header-clip-sub"
        icon={<Scales aria-hidden />}
        title={e.roleLabel}
        subtitle={e.scopeLabel ?? undefined}
        actions={live ? <StatusBadge status={e.status} stalled={e.stalled} short /> : undefined}
      />
      <CardBody className="pt-3">
        <div className="flex flex-col gap-3">
          <div className="ecard-path">
            {stepsOf(e.status).map((s) => (
              <div key={s.label} className={`ecard-step ecard-${s.state}`}>
                <span className="ecard-node">{s.icon}</span>
                <span className="ecard-lbl">{s.label}</span>
              </div>
            ))}
          </div>
          {/* حصادُ كلّ طورٍ تحت عقدته: المرشّحون تحت «ترشّح» والأصوات تحت «تصويت» والثالثةُ أعلاه.
              ثلاثُ خاناتٍ لثلاثِ عقد، فمركزُ كلٍّ تحت عقدتها. */}
          <div className="ecard-nums">
            <div className="ecard-num">
              <span className="ecard-v">{e.candidates}</span>
              <span className="ecard-l">مرشّحون</span>
            </div>
            <div className="ecard-num">
              <span className="ecard-v">{e.votes}</span>
              <span className="ecard-l">أصوات</span>
            </div>
            {harvest ? (
              <div className="ecard-num">
                <span className="ecard-v">{harvest.value}</span>
                <span className="ecard-l">{harvest.label}</span>
              </div>
            ) : <div className="ecard-num" />}
          </div>
          {live ? (
            <span className="scard-meta flex items-center gap-1.5">
              <span className={`tico tico-${await_.tone}`}>
                {await_.tone === "steel" ? <Timer aria-hidden /> : <Hourglass aria-hidden />}
              </span>
              <span>{await_.text}</span>
            </span>
          ) : null}
        </div>
      </CardBody>
      <CardFooter>
        {/* مَن فتح المقعد ومتى — سطران كتذييل كرت الاستبيان: الفاعلُ أوّلًا (القرارُ يُنسَب إلى
            صاحبه) وتاريخُه تحته أدقَّ خطًّا. ومن لم يُقرأ ملفُّه يبقى التاريخُ وحدَه بفعله
            («أُنشئ …») فلا يُترك السطرُ معلَّقًا بلا فاعل. */}
        <div className="flex flex-col gap-0.5">
          {e.createdByName ? (
            <>
              <span className="text-sm text-content-muted">أنشأه {e.createdByName}</span>
              <span className="text-xs text-content-muted">في {e.created}</span>
            </>
          ) : <span className="text-sm text-content-muted">أُنشئ {e.created}</span>}
        </div>
        {/* الزرُّ يتبع نغمة الكرت (ق٤: السطحُ المنغَّم لا يفقد نغمتَه). */}
        <Button variant={tone ?? "primary"} size="sm" className="shrink-0" onClick={onOpen}>فتح الانتخاب</Button>
      </CardFooter>
    </Card>
  );
}
