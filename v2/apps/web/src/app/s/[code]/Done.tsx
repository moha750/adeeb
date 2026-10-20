"use client";

/**
 * **شاشةُ «وصلت إجابتك»: إيصال** (`Ticket`): علامةٌ تُرسم مرّةً وعنوانٌ، ثمّ أسطرُ الإيصال (الاستبيان،
 * وما أُجيب، ووقتُ الإرسال) فالأزرار. رُدّت قبلها دائرةُ نقشٍ تدور حول العلامة (المالك ٢٠٢٦-١٠-٢٠:
 * «حركتُها غيرُ جميلة»)، وسقط مقترحُ «امتداد» بجانبه («لم أفهمها»).
 *
 * و«إجابةٌ أخرى» **زرٌّ حقيقيّ** تحت «موقع أدِيب» لا رابطٌ باهتٌ في الهامش، ولا يظهر إلّا لاستبيانٍ يقبل
 * أكثرَ من إجابة (`allow_multiple_responses`): ما لا يقبلها لا يُعرض فيه بابٌ يُغلق في وجه صاحبه.
 */

import Link from "next/link";
import { ArrowCounterClockwise } from "@/app/_components/glyphs";
import { fmtStamp } from "@/lib/dates";
import type { PublicSurvey } from "./SurveyRespond";
import { Drawn, Ticket } from "./Ticket";

export function Done({ survey, answered, total, sentAt, onAgain }: {
  survey: PublicSurvey;
  answered: number;
  total: number;
  sentAt: string;
  onAgain: () => void;
}) {
  return (
    <Ticket mark={<Drawn />} title="وصلت إجابتك" text={survey.thankYou ?? "شكرًا لمشاركتك."}>
      <dl className="spt-ticket-rows">
        <div><dt>الاستبيان</dt><dd>{survey.title}</dd></div>
        <div><dt>أجبت عن</dt><dd><b>{answered}</b> من {total}</dd></div>
        <div><dt>أُرسلت</dt><dd>{fmtStamp(sentAt)}</dd></div>
      </dl>
      <div className="spt-ticket-acts">
        <Link href="/" className="abtn abtn-primary abtn-lg spt-btn">موقع أدِيب</Link>
        {survey.allowMultiple ? (
          <button type="button" className="abtn abtn-ghost abtn-lg spt-btn" onClick={onAgain}>
            <ArrowCounterClockwise aria-hidden />
            إجابةٌ أخرى
          </button>
        ) : null}
      </div>
    </Ticket>
  );
}
