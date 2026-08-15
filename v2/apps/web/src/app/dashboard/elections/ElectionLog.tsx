"use client";

import { useState } from "react";
import { CaretDown } from "@/app/_components/glyphs";
import { KIND_TONE } from "./log";
import { KIND_ICON } from "./logIcons";
import { eventToneVars } from "./journeyTone";
import type { ElectionLogEvent } from "./data";

/**
 * سجلُّ الانتخاب — **مَن فعل ماذا**. القاعدةُ تكتب كلَّ فعلٍ بفاعله، وهذه الشاشةُ تُنطقه:
 * سطرٌ لكلّ حدثٍ بجملته وصاحبِه ولحظته، ومَن وقع عليه الفعلُ يُسمّى برقمه واسمه.
 *
 * **ولغتُه لغةُ «مسيرتي في أديب»** (`.mjr` من المكتبة) لا لغةُ «رحلة ترشُّحي» — قرارُ المالك
 * ٢٠٢٦-٠٨-١٤ من معاينةٍ عرضت الاثنتين على بيانٍ واحد: الشاشتان **وقائعُ تُقرأ** فتشتركان في
 * العقدة الـsquircle وخيطِ حدّ الكرت وسطحِ Aurora (وهو أيضًا ما يوافق قانونَ الزوايا: الأيقونات
 * squircle لا دوائر). أمّا الرحلةُ فسردُ شخصٍ في لحظته، تبقى بعقدتها الكبيرة ونبضِها.
 *
 * والنغمةُ لكلّ سطرٍ من **طبيعة حدثه** (`KIND_TONE`): الاعتمادُ أخضرُ والرفضُ أحمرُ حيثما وقعا
 * في الترتيب، إذ لا «محطّةَ حاليّة» في سجلٍّ كلُّه ماضٍ. و**الأحدثُ أوّلًا** (ترتيبُ
 * `getElectionLog`): آخرُ ما جرى في الرأس، والأقدمُ ينزل.
 *
 * وعقدةُ «عرض بقيّة السجلّ» في **الذيل** (أمرُ المالك ٢٠٢٦-٠٨-١٥): زرٌّ في رأس الشاشة يسبق
 * الخبرَ إلى العين، فأُنزل تحت السطور. والترتيبُ يوافقه: المطويُّ أقدمُ ممّا فوقه، فينزل عند
 * فتحه **تحت العقدة** في موضعه الزمنيّ، فلا يهبط سطرٌ قُرئ ولا ينقلب العرض بضغطة.
 */
type Props = {
  events: ElectionLogEvent[];
  /** اسمُ من وقع عليه الفعل من معرّف مرشّحه — تصوغه الشاشةُ الأمّ من صفوفها. */
  subjectOf?: (candidateId: string) => string | null;
  /** كم سطرًا يُعرَض قبل «عرض السجلّ كاملًا» — و`0` يعرضه كلَّه بلا زرّ. */
  initial?: number;
};

/** فاعلٌ لا اسمَ له = الكنّاسة: الفعلُ وقع بحكم الموعد لا بقرار أحد، فلا يُنسَب إلى أحد. */
const SYSTEM = "النظام";

/** عدُّ الأحداث بعربيّةٍ سليمة: مفردٌ ومثنًّى، ثمّ جمعُ قلّةٍ إلى العشرة، ثمّ تمييزٌ مفرد منصوب. */
const eventsCount = (n: number): string =>
  n === 1 ? "حدثٌ واحد" : n === 2 ? "حدثان" : n <= 10 ? `${n} أحداث` : `${n} حدثًا`;

export function ElectionLog({ events, subjectOf, initial = 0 }: Props) {
  const [all, setAll] = useState(false);
  if (!events.length) return <p className="txt">لا أحداث في هذا الانتخاب بعد.</p>;

  const capped = initial > 0 && !all && events.length > initial;
  // الأحدثُ أوّلًا، والمعروضُ رأسُ القائمة: يُقتطع ذيلُها (وهو **أقدمُ** ما جرى) فيُفتح بعقدةٍ
  // تحته. فالفتحُ زيادةٌ في الأسفل لا إزاحةٌ من الأعلى.
  const shown = capped ? events.slice(0, initial) : events;

  return (
    <>
      <ol className="mjr">
        {shown.map((e) => {
          const subject = e.candidateId ? subjectOf?.(e.candidateId) ?? null : null;
          return (
            <li key={e.id} className="mjr-i ev" style={eventToneVars(KIND_TONE[e.kind])}>
              <span className="mjr-dot">{KIND_ICON[e.kind]}</span>
              <div className="mjr-c">
                <div className="mjr-h"><b className="mjr-t">{e.label}</b><span className="mjr-d">{e.date}</span></div>
                {/* سطرُ النسبة: صاحبُ الفعل أوّلًا، ثمّ من وقع عليه — والقرارُ يُسأل عنه أحد */}
                <span className="mjr-by">
                  بواسطة <b>{e.actor ?? SYSTEM}</b>
                  {subject ? <span className="mjr-sub">{subject}</span> : null}
                </span>
                {e.note ? <div className="mjr-note">{e.note}</div> : null}
              </div>
            </li>
          );
        })}

        {/* عقدةُ الطلب آخرَ عنصرٍ في القائمة، فيقطع خيطَها `.mjr-i:last-child::before` فلا يتدلّى
            تحتها خيطٌ إلى لا شيء. وما تفتحه أقدمُ ممّا فوقها، فيُقال في عدّه «أقدم». */}
        {capped ? (
          <li className="mjr-i mjr-more">
            <button type="button" className="mjr-more-btn" onClick={() => setAll(true)}>
              <span className="mjr-dot"><CaretDown aria-hidden /></span>
              <span className="mjr-more-tx">
                <b className="mjr-more-t">عرض بقيّة السجلّ</b>
                <span className="mjr-more-n">{eventsCount(events.length - initial)} أقدم</span>
              </span>
            </button>
          </li>
        ) : null}
      </ol>
    </>
  );
}
