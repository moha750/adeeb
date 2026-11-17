"use client";

/**
 * **تذكرةُ محادثة ديبو من مصدرٍ واحد** (٢٠٢٦-١١-٠٧): عنوانُها وشاراتُها وسطورُها وكعبُها — يقرؤها كرتُها وسطرُها في سجلّ المحادثات
 * (`DeeboLogRoom`) ورأسُ صفحتها (`DeeboTalkRecordRoom`، قالب «التذكرة المفتوحة») فلا تفترق المحادثةُ في القائمة عنها مفتوحة.
 * نُقلت من `DeeboLogRoom.tsx` كما هي حرفًا (سابقةُ `opportunity-ticket.tsx`).
 */
import { ChatsCircle, Clock, ShieldWarning, UserCircle } from "@phosphor-icons/react";
import { EyeSlash } from "@/app/_components/glyphs";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { firstNameOf } from "@/lib/personName";
import { standingName } from "@/lib/standing";
import { NAMELESS_OWNER, firstAsk, hasGuardBlock } from "@/app/dashboard/deebo/talk";
import type { DeeboConversation } from "@/app/dashboard/deebo/data";
import { AdBadge, type AdMeta, type AdStub } from "../primitives";
import { dayParts, fmtClock } from "../format";

export const AR_MSG: ArForms = ["رسالةٌ واحدة", "رسالتان", "رسائل", "رسالةً"];

/** أطولُ السؤال عنوانًا — والسؤالُ حتى ٦٠٠ حرف (`MAX_QUESTION` في `api/deebo`)، وكاملُه في صفحة المحادثة */
const TITLE_MAX = 120;
/** السؤالُ عنوانًا: سطرٌ واحدٌ بلا أسطره، مقصوصٌ عند كلمةٍ لا عند حرف (سابقةُ `conversationTitle` في `api/deebo`). */
export function askTitle(c: DeeboConversation): string {
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
export const talkChips = (c: DeeboConversation) => (
  <>
    <AdBadge icon={<UserCircle />}>{askerOf(c)}</AdBadge>
    {hasGuardBlock(c) ? <AdBadge tone="warn" icon={<ShieldWarning />}>حجب رقمًا</AdBadge>
      : c.hiddenAt ? <AdBadge tone="bad" icon={<EyeSlash />}>{deletedBy(c)}</AdBadge>
      : null}
  </>
);

/** سطورُ المعلومات بترتيبٍ واحدٍ في العرضين: اسمُ صاحب الحساب، وساعتُها (يومُها في الكعب)، وعددُ رسائلها — وفي السطر عددُها عمودٌ فيخرج منها. */
export const talkInfo = (c: DeeboConversation, inCard: boolean): AdMeta[] => [
  ...(c.ownerName ? [{ icon: <UserCircle />, text: c.ownerName }] : []),
  { icon: <Clock />, text: fmtClock(c.startedAt) },
  ...(inCard ? [{ icon: <ChatsCircle />, text: arCount(c.messages.length, AR_MSG) }] : []),
];
export const talkStub = (c: DeeboConversation): AdStub => { const d = dayParts(c.startedAt); return { big: d.day, small: d.month }; };
export const talkHref = (c: DeeboConversation) => `/dashboard/deebo/${c.id}`;
