"use client";

/**
 * **سجلُّ محادثات ديبو** على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `dashboard/deebo/DeeboLogView.tsx` القديم:
 * غرفةُ اطّلاعٍ لا فعلَ فيها، مئتا محادثةٍ من الأحدث (`getDeeboLog`)، يُبحث فيها بنصّ المحادثة كلِّها (سؤالًا وجوابًا) واسمِ
 * سائلها ونموذجِها، وتُرشَّح بالسائل والنموذج، وتُفتح كلٌّ في صفحتها (`/dashboard/deebo/[id]`).
 * - **المحادثةُ سجلٌّ يُفتح لا واقعةٌ تُقرأ في سطرها** (محمد ٢٠٢٦-١١-٠٢: «كيف يفهم أنّه بضغطه على نصّ السؤال يدخل المحادثة؟»):
 *   كانت على الخطّ الزمنيّ وسؤالُها رابطٌ مسطّر، فعادت كرتًا وسطرًا كرسائل التواصل — يومُها في الكعب، وسؤالُها عنوانُها،
 *   و«افتح المحادثة» فعلُها الظاهر، والكرتُ كلُّه يُنقر.
 * - **كاردُ «حجبٌ لرقم» ومرشّحُ «حارس الأرقام» موضعٌ واحد** («حجب رقمًا» بعدده؛ القاعدة: حالاتُ السجلّ مواضعُ لا مرشّح)،
 *   وكاردُ «محادثة» عددُ «الكلّ». (والمرشّحُ القديمُ لم يكن يعمل: `filters.blocked` لا يُقرأ في `DeeboLogView`.)
 */
import { matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChatCircleText, ChatsCircle } from "@phosphor-icons/react";
import { type ArForms } from "@/lib/arabicCount";
import { hasGuardBlock } from "@/app/dashboard/deebo/talk";
import type { DeeboConversation } from "@/app/dashboard/deebo/data";
import type { RoomView } from "../view";
import { AdActs, AdCard, AdRow } from "../primitives";
import { CollectionRoom, type FilterDef, type Position } from "../collection";
import { fmtNum } from "../format";
import { DEEBO_LOG_ROOM } from "./deebo-log.meta";
import { askTitle, talkChips, talkHref, talkInfo, talkStub } from "./deebo-ticket";

const AR_TALK: ArForms = ["محادثةٌ واحدة", "محادثتان", "محادثات", "محادثةً"];

/**
 * **مواضعُ المحادثات**: كان فوق الكروت القديمة كاردا إحصاء («محادثة»، «حجبٌ لرقم») ومرشّحُ «حارس الأرقام» («حجب جملةً») —
 * فصارت موضعين بعدديهما، والكلُّ أوّلُهما. وكان الكاردُ الثاني يعدّ **الجملَ** المحجوبة، والموضعُ يعدّ **المحادثاتِ** التي حُجب
 * فيها شيء: عددُ الجمل مجموعٌ لا حال، مكانُه صفحةُ الإحصاء.
 */
const POSITIONS: Position<DeeboConversation>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لم يسأل أحدٌ ديبو بعد." },
  { key: "blocked", label: "حجب رقمًا", match: hasGuardBlock, empty: "لم يحجب حارسُ الأرقام جملةً بعد." },
];

/* عنوانُ المحادثة وشاراتُها وسطورُها وكعبُها ورابطُها من `deebo-ticket.tsx`: مصدرٌ واحدٌ لكرتها وسطرها ورأسِ صفحتها (٢٠٢٦-١١-٠٧) */
const hrefOf = talkHref;
const chips = talkChips;
const info = talkInfo;
const stubOf = talkStub;
const acts = (c: DeeboConversation, inRow?: boolean) => (
  <AdActs inRow={inRow} primary={{ label: "افتح المحادثة", icon: <ChatCircleText />, href: hrefOf(c) }} ops={[]} />
);

export function DeeboLogRoom({ rows, view }: { rows: DeeboConversation[]; serverNow: number; view?: RoomView }) {
  /** النماذجُ الحاضرةُ في السجلّ نفسِه لا قائمةٌ مكتوبةٌ بجانبه، ومرشّحُها لا يظهر ما دام النموذجُ واحدًا — كما كان. */
  const models = [...new Set(rows.map((c) => c.model))];
  const filters: FilterDef<DeeboConversation>[] = [
    {
      key: "who",
      label: "السائل",
      options: [
        { value: "member", label: "أصحاب الحسابات" },
        { value: "guest", label: "زوّارٌ مجهولون" },
      ],
      match: (c, v) => (v === "member" ? !!c.ownerName : !c.ownerName),
    },
    ...(models.length > 1
      ? [{
          key: "model",
          label: "النموذج",
          options: models.map((m) => ({ value: m, label: m })),
          match: (c: DeeboConversation, v: string) => c.model === v,
        }]
      : []),
  ];

  return (
    <CollectionRoom<DeeboConversation>
      navPath={DEEBO_LOG_ROOM.navPath}
      title={DEEBO_LOG_ROOM.title}
      noun={AR_TALK}
      items={rows}
      positions={POSITIONS}
      defaultPosition="all"
      searchPlaceholder="ابحث عن كلمة في المحادثات أو عن السائل…"
      // البحثُ في نصّ المحادثة كلِّها لا في عنوانها: كلمةٌ قيلت في سؤالٍ أو جواب، أو اسمُ من سأل، أو النموذج — كما كان حرفًا
      matchSearch={(c, q) => matchesSearch(q, `${c.model} ${c.ownerName ?? ""} ${c.messages.map((m) => m.content).join(" ")}`)}
      filters={filters}
      idOf={(c) => c.id}
      emptyAll={{
        title: "لم يسأل أحدٌ ديبو بعد",
        desc: "أوّلُ محادثةٍ تُكتب هنا من نفسها متى فتح أحدٌ صفحةَ ديبو وسأل. ومن سأل بحسابه كُتب اسمُه، ومن سأل زائرًا فبصمةٌ تدور كلّ يوم لا اسمَ فيها ولا بريدَ ولا عنوان.",
      }}
      viewKey={DEEBO_LOG_ROOM.viewKey}
      initialView={view}
      table={{
        head: "المحادثة",
        stub: { key: "date", label: "التاريخ", icon: <CalendarBlank />, sortBy: (c) => +new Date(c.startedAt) },
        columns: [{ key: "msgs", label: "الرسائل", icon: <ChatsCircle />, sortBy: (c) => c.messages.length }],
      }}
      renderCard={(c) => (
        <AdCard key={c.id} seed={c.id} stub={stubOf(c)} chips={chips(c)} title={askTitle(c)} href={hrefOf(c)} meta={info(c, true)} foot={acts(c)} />
      )}
      renderRow={(c) => (
        <AdRow
          key={c.id}
          title={askTitle(c)}
          href={hrefOf(c)}
          stub={{ ...stubOf(c), seed: c.id }}
          badge={chips(c)}
          sub={info(c, false)}
          cells={[{ label: "الرسائل", value: fmtNum(c.messages.length) }]}
          acts={acts(c, true)}
        />
      )}
    />
  );
}
