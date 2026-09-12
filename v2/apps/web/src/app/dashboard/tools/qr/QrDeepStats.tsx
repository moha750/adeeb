"use client";

import { Badge, Card, CardBody, CardHeader, ColumnBars, HeatGrid, SectionCard } from "@adeeb/design-system";
import { CalendarBlank, Clock } from "@phosphor-icons/react";
import { formatThousands as fmt } from "@/app/_components/format";
import { hour12, hour12Long } from "@/lib/dates";
import type { QrStats } from "./data";

/**
 * **القراءةُ الأعمق** — ثلاثةُ أسئلةٍ لا يجيبها الخطُّ اليوميّ:
 *
 * · **متى يُمسح ملصقُك؟** أربعٌ وعشرون ساعةً بتوقيت الرياض. يُعرَف بها وقتُ النشر ووقتُ
 *   الوقوف عند الطاولة، وهو قرارٌ يُتَّخذ لا رقمٌ يُنظَر إليه.
 * · **وفي أيّ يوم؟** شبكةُ الأيّام في الساعات: النمطُ الأسبوعيُّ لا يظهر في مجموعٍ يوميّ.
 * · **أيصعد أم يهبط؟** أسبوعٌ مقابل أسبوع، بفارقٍ منطوق.
 *
 * وكلُّها محسوبةٌ من صفوف المسح نفسِها التي تُقرأ للمخطّط، فلا استعلامَ زائد.
 */

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
// أعمدةُ الشبكة أربعةٌ وعشرون، فتُكتَب بلا مسافةٍ («11ص») كي لا تتزاحم.
const HOURS = Array.from({ length: 24 }, (_, h) => hour12(h, false));

/**
 * **الرسومُ وحدَها هنا** (صُحّح ٢٠٢٦-٠٩-٠٥): كانت معها أربعةُ كروتٍ تحت المخطّطات، فصار
 * في الصفحة صفّا أرقامٍ يفصلهما رسم، ورقمان يتكرّران («مسحة للباركود» و«هذا الأسبوع»).
 * فرُفعت الأرقامُ إلى صفّ الصدر الواحد، وبقيت الساعاتُ والشبكةُ حيث تُقرأ.
 */
export function QrDeepStats({ stats }: { stats: QrStats }) {
  const { hours, heat } = stats;
  const peak = hours.indexOf(Math.max(...hours));
  const silent = hours.every((h) => h === 0);


  return (
    <>
      <div className="card-grid mt-4">
        <SectionCard headerVariant="soft" icon={<Clock />} title="ساعاتُ المسح">
          <ColumnBars
            bars={hours.map((v, h) => ({ tick: hour12(h, false), label: `الساعة ${hour12(h)}`, value: v }))}
            height={150}
            formatValue={(n) => `${fmt(n)} مسحة`}
          />
        </SectionCard>

        <Card className="card-full">
          <CardHeader
            variant="soft"
            icon={<CalendarBlank />}
            title="الأسبوعُ في ساعاته"
            actions={silent ? null : <Badge tone="info" size="sm">{`الذروة ${hour12Long(peak)}`}</Badge>}
          />
          <CardBody>
            <div className="qheat">
              <HeatGrid
                rows={DAYS}
                cols={HOURS}
                values={heat}
                // الرقمُ فوق ووحدتُه تحته: سطرٌ واحدٌ في خليّةٍ ضيّقةٍ يُقرأ زحامًا.
                formatValue={(n) => <><b>{fmt(n)}</b><i>مسحة</i></>}
                legendLow="أهدأ"
                legendHigh="أزحم"
                empty="لا مسحات بعد."
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
