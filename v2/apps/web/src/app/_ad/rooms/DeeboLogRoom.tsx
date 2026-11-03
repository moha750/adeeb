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
import { CalendarBlank, ChatCircleText, ChatsCircle, Clock, ShieldWarning, UserCircle } from "@phosphor-icons/react";
import { EyeSlash } from "@/app/_components/glyphs";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { firstNameOf } from "@/lib/personName";
import { standingName } from "@/lib/standing";
import { NAMELESS_OWNER, firstAsk, hasGuardBlock } from "@/app/dashboard/deebo/talk";
import type { DeeboConversation } from "@/app/dashboard/deebo/data";
import type { RoomView } from "../view";
import { AdActs, AdBadge, AdCard, AdRow, type AdMeta } from "../primitives";
import { CollectionRoom, type FilterDef, type Position } from "../collection";
import { dayParts, fmtClock, fmtNum } from "../format";
import { DEEBO_LOG_ROOM } from "./deebo-log.meta";

const AR_TALK: ArForms = ["محادثةٌ واحدة", "محادثتان", "محادثات", "محادثةً"];
const AR_MSG: ArForms = ["رسالةٌ واحدة", "رسالتان", "رسائل", "رسالةً"];

/**
 * **مواضعُ المحادثات**: كان فوق الكروت القديمة كاردا إحصاء («محادثة»، «حجبٌ لرقم») ومرشّحُ «حارس الأرقام» («حجب جملةً») —
 * فصارت موضعين بعدديهما، والكلُّ أوّلُهما. وكان الكاردُ الثاني يعدّ **الجملَ** المحجوبة، والموضعُ يعدّ **المحادثاتِ** التي حُجب
 * فيها شيء: عددُ الجمل مجموعٌ لا حال، مكانُه صفحةُ الإحصاء.
 */
const POSITIONS: Position<DeeboConversation>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لم يسأل أحدٌ ديبو بعد." },
  { key: "blocked", label: "حجب رقمًا", match: hasGuardBlock, empty: "لم يحجب حارسُ الأرقام جملةً بعد." },
];

/** أطولُ السؤال عنوانًا — والسؤالُ حتى ٦٠٠ حرف (`MAX_QUESTION` في `api/deebo`)، وكاملُه في صفحة المحادثة */
const TITLE_MAX = 120;
/** السؤالُ عنوانًا: سطرٌ واحدٌ بلا أسطره، مقصوصٌ عند كلمةٍ لا عند حرف (سابقةُ `conversationTitle` في `api/deebo`). */
function askTitle(c: DeeboConversation): string {
  const flat = firstAsk(c).replace(/\s+/g, " ").trim();
  if (flat.length <= TITLE_MAX) return flat;
  const cut = flat.slice(0, TITLE_MAX);
  const space = cut.lastIndexOf(" ");
  return `${(space > TITLE_MAX / 2 ? cut.slice(0, space) : cut).trim()}…`;
}

/**
 * **مَن سأل** شارةً: صفتُه في أدِيب من القاعدة (`lib/standing`: «عضو أدِيب»، «متطوّع أدِيب»، «صديق أدِيب»)، و«زائر» لمن سأل
 * بلا حساب — وهي قسمةُ مرشّح «السائل» نفسُه. واسمُ صاحب الحساب سطرٌ تحتها، والزائرُ لا اسمَ له فلا يُكرَّر «زائرٌ مجهول» تحت «زائر».
 */
const askerOf = (c: DeeboConversation): string => (c.ownerName ? standingName(c.ownerStanding ?? "account", c.ownerGender) : "زائر");

/**
 * مَن حذفها: صاحبُها وحده يحذفها من عنده، فيُسمّى باسمه الأوّل (الثلاثيُّ يطفح بالشارة) — والفعلُ للمحادثة لا لفاعلها
 * («حُذفت بيد سارة»)، فلا جنسَ يُخمَّن. ومن لا اسمَ في ملفّه «صاحبُ الحساب»، ومن لا حسابَ له «الزائر».
 */
const deletedBy = (c: DeeboConversation): string =>
  !c.ownerName ? "حُذفت بيد الزائر"
  : c.ownerName === NAMELESS_OWNER ? "حُذفت بيد صاحب الحساب"
  : `حُذفت بيد ${firstNameOf(c.ownerName)}`;

/**
 * **شاراتُ المحادثة**: مَن سأل أوّلًا، ثمّ حالُها إن كانت — والحجبُ أشدُّ خبرًا من الحذف فيتقدّم (كانت شارةً واحدةً في الكرت القديم،
 * ونغمتُه `warning` للحجب و`danger` للحذف).
 */
const chips = (c: DeeboConversation) => (
  <>
    <AdBadge icon={<UserCircle />}>{askerOf(c)}</AdBadge>
    {hasGuardBlock(c) ? <AdBadge tone="warn" icon={<ShieldWarning />}>حجب رقمًا</AdBadge>
      : c.hiddenAt ? <AdBadge tone="bad" icon={<EyeSlash />}>{deletedBy(c)}</AdBadge>
      : null}
  </>
);

/** سطورُ المعلومات بترتيبٍ واحدٍ في العرضين: اسمُ صاحب الحساب، وساعتُها (يومُها في الكعب)، وعددُ رسائلها — وفي السطر عددُها عمودٌ فيخرج منها. */
const info = (c: DeeboConversation, inCard: boolean): AdMeta[] => [
  ...(c.ownerName ? [{ icon: <UserCircle />, text: c.ownerName }] : []),
  { icon: <Clock />, text: fmtClock(c.startedAt) },
  ...(inCard ? [{ icon: <ChatsCircle />, text: arCount(c.messages.length, AR_MSG) }] : []),
];
const stubOf = (c: DeeboConversation) => { const d = dayParts(c.startedAt); return { big: d.day, small: d.month }; };
const hrefOf = (c: DeeboConversation) => `/dashboard/deebo/${c.id}`;
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
