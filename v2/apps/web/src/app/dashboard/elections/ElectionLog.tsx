"use client";

import { useState, type ReactNode } from "react";
import { Gear, IdentificationBadge, Note, UserCircle } from "@phosphor-icons/react";
import { CaretDown } from "@/app/_components/glyphs";
import { AdLog, type AdLogEvent } from "@/app/_ad/log";
import { AdButton, type AdMeta, type AdTone } from "@/app/_ad/primitives";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { KIND_TONE, type LogTone } from "./log";
import { KIND_ICON } from "./logIcons";
import type { ElectionLogEvent } from "./data";

/**
 * سجلُّ الانتخاب — **مَن فعل ماذا**. القاعدةُ تكتب كلَّ فعلٍ بفاعله، وهذه الشاشةُ تُنطقه على **الخطّ الزمنيّ المشترك**
 * (`AdLog`، قاعدةُ محمد ٢٠٢٦-١١-٠٢: ما يجيب عن «مَن فعل ماذا ومتى» ويُقرأ ولا يُدار خطٌّ زمنيّ): كعوبُ الأيّام على المحور،
 * وتحت كلّ يومٍ وقائعُه الأحدثُ أوّلًا بساعتها.
 *
 * والواقعةُ **جملتُها بصوت الإدارة** (`describeEvent` بـ`audience: "admin"` في `getElectionLog` — ورحلةُ العضو تُقرأ
 * بصوته في `JourneyBody` ولا تمرّ من هنا)، ونوعُها شارةً بنغمة طبيعته (`KIND_TONE`: الاعتمادُ أخضرُ والرفضُ أحمرُ حيثما
 * وقعا)، وتحتها صاحبُ الفعل ثمّ مَن وقع عليه برقمه واسمه ثمّ ملاحظتُه — والقرارُ يُسأل عنه أحد.
 *
 * و«عرض بقيّة السجلّ» في **الذيل** (أمرُ المالك ٢٠٢٦-٠٨-١٥): المعروضُ أحدثُ `initial` حدثًا (ترتيبُ `getElectionLog`)،
 * والمطويُّ أقدمُ منه، فينزل عند فتحه تحت ما قُرئ في موضعه الزمنيّ، فلا يهبط سطرٌ ولا ينقلب العرض بضغطة.
 */
type Props = {
  events: ElectionLogEvent[];
  /** ساعةُ الطلب (`requestNow`) — «اليوم» و«أمس» على الخطّ بساعة الخادم لا الجهاز. */
  now: number;
  /** رأسُ القسم حين يكون السجلُّ قسمًا في الصفحة؛ ونافذةُ المرشّح تعنونه بعنوانها فلا رأسَ له فيها. */
  title?: string;
  icon?: ReactNode;
  /** اسمُ من وقع عليه الفعل من معرّف مرشّحه — تصوغه الشاشةُ الأمّ من صفوفها. */
  subjectOf?: (candidateId: string) => string | null;
  /** كم حدثًا يُعرَض قبل «عرض بقيّة السجلّ» — و`0` يعرضه كلَّه بلا زرّ. */
  initial?: number;
};

/** فاعلٌ لا اسمَ له = الكنّاسة: الفعلُ وقع بحكم الموعد لا بقرار أحد، فلا يُنسَب إلى أحد. */
const SYSTEM = "النظام";

/** عدُّ الأحداث بعربيّةٍ سليمة («حدثٌ واحد»، «حدثان»، «5 أحداث»، «12 حدثًا») */
const AR_EVENT: ArForms = ["حدثٌ واحد", "حدثان", "أحداث", "حدثًا"];

/** نغمةُ المعجم (`LogTone`) بأسماء الأساس الجديد */
const TONE: Record<LogTone, AdTone> = { success: "ok", warning: "warn", danger: "bad", info: "info", neutral: "neutral" };

/**
 * **يُطوى المتكرّرُ المتتالي** (`same`): الجملةُ نفسُها على المرشّح نفسِه بيد الفاعل نفسِه وبلا ملاحظة — تمديدُ المهلة
 * تلقائيًّا مرّاتٍ، أو بيانٌ يُحفظ مرّاتٍ في دقيقة. وما له ملاحظةٌ أو جملةٌ غيرُ أختها يبقى وحده.
 */
const same = (a: ElectionLogEvent, b: ElectionLogEvent) =>
  a.kind === b.kind && a.label === b.label && a.candidateId === b.candidateId && a.actor === b.actor && !a.note && !b.note;

export function ElectionLog({ events, now, title, icon, subjectOf, initial = 0 }: Props) {
  const [all, setAll] = useState(false);
  const capped = initial > 0 && !all && events.length > initial;
  // الأحدثُ أوّلًا، والمعروضُ رأسُ القائمة: يُقتطع ذيلُها (وهو **أقدمُ** ما جرى) فيُفتح بزرٍّ تحته.
  const shown = capped ? events.slice(0, initial) : events;

  const event = (e: ElectionLogEvent): AdLogEvent => {
    const subject = e.candidateId ? subjectOf?.(e.candidateId) ?? null : null;
    const meta: AdMeta[] = [
      { icon: e.actor ? <UserCircle /> : <Gear />, text: `بيد ${e.actor ?? SYSTEM}` },
      ...(subject ? [{ icon: <IdentificationBadge />, text: subject }] : []),
      ...(e.note ? [{ icon: <Note />, text: e.note }] : []),
    ];
    // بلا شارة نوع: الجملةُ نفسُها تقوله («تمّ اعتماد الترشّح»)، ورمزُ النقطة ونغمتُها يقولانه بلمحة
    return { icon: KIND_ICON[e.kind], tone: TONE[KIND_TONE[e.kind]], title: e.label, meta };
  };

  return (
    <AdLog<ElectionLogEvent>
        title={title}
        icon={icon}
        // نافذةُ المرشّح تعنونه بعنوانها: هناك بلا رأسٍ ولا إطار (`bare`)، فلا يكون إطارًا في إطار النافذة
        bare={!title}
        total={events.length}
        items={shown}
        at={(e) => e.at}
        idOf={(e) => String(e.id)}
        event={event}
        same={same}
        noun={AR_EVENT}
        now={now}
        empty={{ title: "لا أحداث في هذا الانتخاب بعد", text: "كلُّ فعلٍ فيه يُقيَّد هنا بفاعله ولحظته." }}
        more={capped ? (
          <AdButton variant="soft" icon={<CaretDown />} onClick={() => setAll(true)}>
            {`عرض بقيّة السجلّ، ${arCount(events.length - initial, AR_EVENT)} أقدم`}
          </AdButton>
        ) : undefined}
      />
  );
}
