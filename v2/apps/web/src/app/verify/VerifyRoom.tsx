"use client";

import type { ReactNode } from "react";
import {
  CalendarBlank, CalendarCheck, Certificate, ChatCircleText, Hash, Hourglass, IdentificationBadge, Medal, QrCode, SealCheck, SealQuestion, SealWarning,
  TextAa, User, UserSwitch,
} from "@phosphor-icons/react";
import { WarningCircle } from "@/app/_components/glyphs";
import { PubIndex } from "@/app/_ad/public";
import { AdNote } from "@/app/_ad/primitives";
import { AdLine, AdSection } from "@/app/_ad/account";
import { fmtDateOnly } from "@/lib/dates";
import type { FormerName, VerifyResult } from "./data";

/**
 * **التحقّق من شهادة — أوّلُ صفحات قالب «الأداة»** (اعتمده محمد ٢٠٢٦-١١-٢٤ من نسختين).
 *
 * قارئُها غريبٌ بيده وثيقة — مطبوعةً أو ملفًّا — جهةُ عملٍ أو لجنةُ قبول. فاللوحُ يقول ما الصفحة في سطر، و**الأداةُ في اللوح** خانةٌ وزرّ
 * (كخانة البحث في الفهارس: الأداةُ هي الصفحة)، والجوابُ **قسمٌ واحدٌ يتدلّى منه بعرضها**: ختمُ رأسه بلون الحكم والكرتُ أبيض (`stamp`)،
 * ورأسُه بصبغته، ثمّ سطورُ ما شهدت له الوثيقة يُطابَق كلٌّ بما فيها. وقبل الرقم يتدلّى «كيف تتحقّق».
 * (رُدّت: نموذجٌ تحت اللوح يكرّر «الرقم المرجعيّ» عنوانًا وتسمية؛ و«الملاحظةُ» المصبوغةُ فوق اللوح — «لونٌ مزعج» — وخانةٌ أقصرُ من الجواب)
 *
 * والنموذجُ **HTML خالص** (`method="get"`) كما كان: الرقمُ في العنوان، فالرابطُ نفسُه دليلٌ يُشارَك، والصفحةُ تعمل قبل أن يُحمَّل شيء.
 */
export function VerifyRoom({ result, code }: { result: VerifyResult; code?: string }) {
  return (
    <PubIndex title="التحقّق من شهادة" deck="امسح الرمز في الشهادة، أو اكتب رقمها المرجعيّ، فتعرف أصحيحةٌ هي."
      chips={
        <form method="get" action="/verify" className="ad-vf" role="search" aria-label="تحقّق من شهادة">
          <div className="ad-pi-search">
            <Hash className="ad-pi-search-ic" aria-hidden />
            <input type="text" name="code" dir="ltr" className="ad-pi-search-in" defaultValue={code ?? ""} placeholder="ADEEB-VOL-2026-0001-…"
              aria-label="الرقم المرجعيّ" autoComplete="off" spellCheck={false} required />
          </div>
          <button type="submit" className="ad-btn ad-btn-inverse"><SealCheck aria-hidden />تحقّق</button>
        </form>
      }>
      <div className="ad-vr">
        {result.state === "empty" ? <HowTo /> : <Answer result={result} code={code ?? ""} />}
      </div>
    </PubIndex>
  );
}

/** قبل الرقم: كيف تتحقّق، وما الذي نؤكّده لك */
function HowTo() {
  return (
    <AdSection icon={<SealCheck />} title="كيف تتحقّق" sub="كلُّ شهادةٍ تصدر من أدِيب لها رقمٌ لا يتكرّر.">
      <AdLine icon={<QrCode />} k="امسح الرمز" v="في أسفل الشهادة رمزٌ يفتح هذه الصفحة بجوابها" />
      <AdLine icon={<Hash />} k="أو اكتب الرقم" v="مكتوبٌ تحت الرمز، يبدأ بـ ADEEB" />
      <AdLine icon={<Certificate />} k="ما نؤكّده لك" v="صاحبَ الشهادة، وما شهدت له، ومدّتَه، ويومَ صدورها" />
    </AdSection>
  );
}

const hoursText = (h: number) =>
  !Number.isInteger(h) ? `${h} ساعة` : h === 1 ? "ساعةٌ واحدة" : h === 2 ? "ساعتان" : h <= 10 ? `${h} ساعات` : `${h} ساعةً`;

function Answer({ result, code }: { result: Exclude<VerifyResult, { state: "empty" }>; code: string }) {
  if (result.state === "error") {
    return <AdSection stamp="warn" icon={<WarningCircle />} title="تعذّر التحقّق" sub="حدث خطأٌ في الاتّصال. أعِد المحاولة بعد قليل." />;
  }
  // **لم نجد ≠ مزوّرة** (١١-٢٤): أكثرُ ما يأتي هنا رقمٌ أُخطئ في كتابته، فالحكمُ كهرمانيٌّ لا أحمر (الأحمرُ للمُبطَلة وحدها: حكمٌ قاطع)،
  // والقسمُ يقول ما كُتب، وكيف يُصحَّح، وإلى من يُرجَع — لا جملةٌ يتيمةٌ تحكم على الوثيقة وحدها
  if (result.state === "missing") {
    return (
      <AdSection stamp="warn" icon={<SealQuestion />} title="لم نجد شهادةً بهذا الرقم" sub="فلا تُعتمد الوثيقةُ حتى يثبت رقمُها.">
        <AdLine icon={<Hash />} k="الرقم الذي كتبته" v={code} ltr />
        <AdLine icon={<TextAa />} k="تأكّد من كتابته" v="حرفًا برقمٍ كما في الوثيقة، ويبدأ بـ ADEEB" />
        <AdLine icon={<QrCode />} k="أو امسح رمزها" v="الرمزُ يكتب الرقمَ عنك فلا يخطئ" />
        <AdLine icon={<ChatCircleText />} k="وإن بقي مجهولًا" v="راسلنا لنتحقّق منها معك" href="/#contact"
          act={{ icon: <ChatCircleText />, text: "راسلنا", label: "راسل نادي أدِيب" }} />
      </AdSection>
    );
  }

  const valid = result.state === "valid";
  const exp = result.kind === "experience";
  const from = result.periodFrom ? fmtDateOnly(result.periodFrom) : null;
  const to = result.periodTo ? fmtDateOnly(result.periodTo) : null;
  const period = from && to && from !== to ? `من ${from} إلى ${to}` : from ?? to;
  return (
    <>
      <AdSection stamp={valid ? "ok" : "bad"} icon={valid ? <SealCheck /> : <SealWarning />} title={valid ? "شهادةٌ صحيحة" : "شهادةٌ مُبطَلة"}
        sub={valid
          ? "طابِق ما تشهد له بما في الوثيقة التي بين يديك."
          : `أُبطلت${result.revokedOn ? ` في ${fmtDateOnly(result.revokedOn)}` : ""}، فلا يُعتدّ بها.`}>
        <AdLine icon={<Certificate />} k="نوعُها" v={exp ? "شهادة خبرة" : "شهادة مشاركة تطوّعيّة"} />
        <AdLine icon={<User />} k="صاحبُها" v={result.holderName} />
        <AdLine icon={<IdentificationBadge />} k={exp ? "المنصب" : "المشاركة"} v={result.positionTitle} />
        {period ? <AdLine icon={<CalendarBlank />} k="المدّة" v={period} /> : null}
        {result.hours ? <AdLine icon={<Hourglass />} k="الساعات" v={hoursText(result.hours)} /> : null}
        {/* يومُ الصدور سطرٌ لا جملةٌ في رأس الحكم: كان الرأسُ جملتين تصيران في الجوّال ثلاثةَ أسطر */}
        {result.issuedOn ? <AdLine icon={<CalendarCheck />} k="صدرت من نادي أدِيب" v={fmtDateOnly(result.issuedOn)} /> : null}
        {/* جملةُ المشرف بوزن السطور العريض لا بوزن القراءة، وبالأخضر حالِها (محمد ١١-٢٤: بوزن القراءة انفصلت عن أخواتها) */}
        {result.distinction ? <AdLine icon={<Medal />} k="بتميّز" v={`«${result.distinction}»`} tone="ok" /> : null}
        <AdLine icon={<Hash />} k="الرقم المرجعيّ" v={result.serial} ltr />
      </AdSection>
      {result.formerNames.length ? <FormerNames names={result.formerNames} current={result.holderName} valid={valid} /> : null}
    </>
  );
}

/**
 * **الأسماءُ التي حملتها الشهادةُ قبل اسمها اليوم** (قرارُ المالك ٢٠٢٦-١٠-٠١). صحّح صاحبُها اسمَه بعد الإصدار فتبعته الشهادة، وقد تكون بيد
 * هذه الجهة نسخةٌ قديمة. فيُقال الاسمُ القديمُ **حرفًا بحرف** ويومُ انتهائه، لتُطابَق الوثيقةُ ولا تبدو مزوّرة. ولا كشفَ فيه: الاسمُ مكتوبٌ فيها أصلًا.
 * (على الأرض لا على اللوح، فـ«الملاحظةُ» بنغمتها الهادئة في موضعها)
 */
function FormerNames({ names, current, valid }: { names: FormerName[]; current: string; valid: boolean }): ReactNode {
  const one = names.length === 1;
  const list = names.map((f) => `«${f.name}» حتى ${fmtDateOnly(f.until)}`).join("، ثمّ ");
  const lead = one ? `حملت هذه الشهادةُ اسم ${list}، ثمّ صار «${current}».` : `حملت هذه الشهادةُ قبل اسمها اليوم: ${list}.`;
  const close = valid
    ? one ? " ونسختُها بأيّ الاسمين صحيحة." : " ونسختُها بأيٍّ من هذه الأسماء صحيحة."
    : one ? " ونسختُها بأيّ الاسمين هي هذه الشهادةُ المُبطَلة." : " ونسختُها بأيٍّ منها هي هذه الشهادةُ المُبطَلة.";
  return <AdNote tone="info" icon={<UserSwitch />} title="صُحّح اسمُ صاحبها بعد إصدارها">{lead}{close}</AdNote>;
}
