"use client";

import { Badge } from "@adeeb/design-system";
import { ChatCircleDots, ChatsCircle, Clock, Fingerprint, SignIn, UserCircle } from "@phosphor-icons/react";
import { Trash } from "@/app/_components/glyphs";
import { PageHeader, type HeaderStatus } from "../../_components/PageHeader";
import { Section } from "../../_components/Section";
import { Cell } from "../../_components/Cell";
import { fmtDateAndTime } from "@/lib/dates";
import { moodSrc, MOOD_ALT } from "@/lib/deebo/mood";
import { hasGuardBlock } from "../talk";
import type { DeeboConversation } from "../data";

/**
 * **صفحةُ المحادثة** — الحوارُ يُقرأ كما جرى، بفقاعات المكتبة نفسِها (`.dch-*`) التي رآها
 * الزائرُ في `/deebo`. اختارها المالك ٢٠٢٦-٠٨-٢٢ على النافذة بعد معاينةٍ في `/ui`.
 *
 * **ولا رسمَ ثانٍ للمحادثة**: من يقرأ السجلَّ يقرأ ما وقع لا صياغةً إداريّةً له. ولذلك لم
 * يُخترَع لها شكلٌ «إداريّ» بأعمدةٍ وحقول: الفقاعةُ موجودةٌ في المكتبة، وإعادةُ رسمها ههنا
 * تُنشئ جوابين لسؤالٍ واحد يوم يتغيّر أحدُهما.
 *
 * **وحقائقُها خلايا عرضٍ لا صفَّ شارات** (ق٨، وحكمُ المالك ٢٠٢٦-٠٨-٢٢: «طريقةُ عرض هذه
 * البيانات بدائيّة»): كان الرأسُ صفًّا من شاراتٍ متلاصقةٍ تحمل كلَّ شيء — اسمًا وبصمةً
 * وتاريخًا وعددًا وحالًا — **فضاع الفرقُ بين حقيقةٍ وحال**، ولا تسميةَ لأيّ قيمة (رقمٌ
 * وحدَه لا يقول أهو عددُ رسائلَ أم شيءٌ آخر)، ولا نسخَ لبصمةٍ تُلاحَق بها محادثاتُ يومٍ
 * واحد. والنظامُ له جوابٌ واحدٌ لعرض حقائق سجلّ: `Section` + `Cell` (تسميةٌ بأيقونتها ثمّ
 * القيمة، ورُكنٌ ينسخ ما يُنسَخ)، وهو ما يلبسه ملفُّ العضو و«عضويّتي». فلا يُخترَع لديبو
 * شكلٌ ثالث.
 *
 * **والحالُ تصعد إلى الرأس** (خانةُ `status`): «حجب الحارسُ رقمًا» حكمٌ على المحادثة كلِّها،
 * وموضعُ الحال في هذا النظام سطرُ الاسم لا متنُ الصفحة. **والحقيقةُ تبقى خليّة**: حذفُ
 * صاحبها إيّاها واقعةٌ **لها وقت**، فهي خليّةٌ بقيمتها لا شارةٌ تقول «حُذفت» بلا متى.
 *
 * **وعميليّةٌ بحكم الأيقونة لا بحكم الحالة**: لا حالةَ فيها ولا تفاعل، وكان الطبيعيُّ أن
 * تُرسَم على الخادم — غير أنّ `@phosphor-icons/react` يُنشئ سياقَ الوزن (`createContext`)
 * عند تحميل الوحدة، فيسقط استيرادُها في مكوّنٍ خادميّ. والمخرجُ الآخرُ (`dist/ssr`) يردّه
 * حارسُ `glyph-weights` لأنّه يتجاوز سياقَ الـduotone فتخرج أيقونةٌ بوزنٍ يتيم.
 */
export function TalkView({ talk }: { talk: DeeboConversation }) {
  /** حالُ المحادثة: نوعٌ مضيَّقٌ يرسمه الرأس، وواحدةٌ لا اثنتان (فالأشدُّ أولى). */
  const status: HeaderStatus | undefined = hasGuardBlock(talk)
    ? { label: "حجب الحارسُ رقمًا", tone: "warning" }
    : talk.hiddenAt
      ? { label: "حذفها صاحبُها", tone: "neutral", variant: "outline" }
      : undefined;

  return (
    <>
      {/* الفتاتُ يسمّي الورقة «محادثة» فيصير بندُ «ديبو» فوقه رابطًا يردّ إلى السجلّ
          (`crumbFor`)، ومنه يشتقّ الرأسُ زرَّ الرجوع. */}
      <PageHeader title="محادثةٌ مع ديبو" crumbLeaf="محادثة" status={status} />

      <Section icon={<ChatCircleDots />} title="عن المحادثة">
        <Cell
          label="السائل"
          icon={<UserCircle />}
          value={talk.ownerName ?? "زائرٌ مجهول"}
          noCopy={!talk.ownerName}
        />
        <Cell label="الرسائل" icon={<ChatsCircle />} value={`${talk.messages.length}`} noCopy />
        {/* البصمةُ تُنسَخ لأنّها الأداةُ الوحيدة لجمع محادثات زائرٍ في يومٍ واحد (وهي تدور
            كلّ يوم بأمر الترحيل، فلا تصل يومين بشخصٍ واحد). و`.pva-grid` تمدّ اليتيمَ في صفّه. */}
        {talk.ownerName ? null : (
          <Cell label="بصمةُ الزائر" icon={<Fingerprint />} lat value={talk.visitorHash.slice(0, 8)} />
        )}
        {/* `full` لأنّ القيمةَ سطرٌ واحدٌ لا يلتفّ (`.pva-val` تقتطع بـ«…»)، و«22 أغسطس 2026،
            14:30» أطولُ من نصف الصفّ على جوّالٍ 375 فكانت تُقصّ. */}
        <Cell full label="بدأت" icon={<Clock />} value={fmtDateAndTime(talk.startedAt)} noCopy />
        {talk.entryPath ? (
          <Cell full lat label="دخل من صفحة" icon={<SignIn />} value={talk.entryPath} noCopy />
        ) : null}
        {talk.hiddenAt ? (
          <Cell full label="حذفها صاحبُها" icon={<Trash />} value={fmtDateAndTime(talk.hiddenAt)} noCopy />
        ) : null}
      </Section>

      <ul className="dch">
        {talk.messages.map((m) => (
          <li key={m.id} className="dch-turn" data-who={m.role}>
            {/* وجهٌ واحدٌ ثابتٌ لا وجهَ يُختار: `mood` في الغرفة الحيّة تقوله حالُ الجواب لحظةَ
                قوله، ولا يُعاد استنباطُه من نصٍّ قديمٍ بعد أيّام. */}
            {m.role === "assistant" ? (
              <img className="dch-av" src={moodSrc("chatting")} alt={MOOD_ALT.chatting} width={64} height={64} />
            ) : null}
            <span className="dch-who">
              <b>{m.role === "user" ? talk.ownerName ?? "الزائر" : "ديبو"}</b>
              {m.role === "assistant" && m.latencyMs ? (
                <span className="font-latin text-xs text-content-muted" dir="ltr">
                  {(m.latencyMs / 1000).toFixed(1)}s
                </span>
              ) : null}
              {m.guardBlocked ? <Badge tone="warning" size="sm" dot>حجب رقمًا</Badge> : null}
            </span>
            <p className="dch-say">{m.content}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
