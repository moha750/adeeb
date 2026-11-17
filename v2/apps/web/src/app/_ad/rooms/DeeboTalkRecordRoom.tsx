"use client";

/**
 * **محادثةُ ديبو على قالب «التذكرة المفتوحة»** (`_ad/record.tsx`، اعتمده محمد ٢٠٢٦-١١-٠٧). السلوكُ سلوكُ `dashboard/deebo/[id]/TalkView.tsx`
 * حرفًا: صفحةُ اطّلاعٍ لا فعلَ فيها إلّا النسخ — السائلُ لصاحب الحساب، والبصمةُ للزائر (أداةُ جمع محادثات زائرٍ في يومٍ واحد) — وحقائقُها
 * (السائل، والرسائل، والبصمة، والبداية، وصفحةُ الدخول، والحذفُ بوقته)، وحالُ الحجب، ثمّ الحوارُ كما جرى بالترتيب. والفرقُ في الشكل:
 * - **الرأسُ تذكرةُ المحادثة في سجلّها مفتوحة** (`deebo-ticket.tsx` مصدرٌ واحدٌ للكرت والسطر والرأس): يومُها في الكعب، وسؤالُها الأوّلُ
 *   اسمُها (`h1`)، ومَن سأل وحالُها شاراتٌ، وسطورُ الكرت ثمّ ما لا يحمله الكرت (البصمةُ، وصفحةُ الدخول، والحذفُ بوقته). كان الرأسُ لوحًا
 *   باسمٍ عامّ («محادثةٌ مع ديبو») وتحته قسمُ خلايا؛ والحالُ («حجب الحارسُ رقمًا») شارةُ الكرت نفسُها.
 * - **«نسخ البصمة» للزائر وحده** زرٌّ باسمه في طرف الشارات (كان ركنَ خليّةٍ بلا اسم). و«نسخ السائل» لصاحب الحساب حُذف بقرار محمد
 *   (٢٠٢٦-١١-٠٧): كان ينسخ صفتَه واسمَه، والاسمُ ظاهرٌ في الرأس يُحدَّد ويُنسخ. والبصمةُ لا تُرى كاملةً، وبها تُجمع محادثاتُ زائرٍ في يومه.
 * - **صفحةُ الدخول جملةٌ باسمها لا رابطٌ خام** (محمد: «إيش المفروض يُفهم منها؟»): «فتحه من صفحة ديبو». وتبقى في كلّ محادثةٍ وإن كان
 *   ديبو لا يُفتح اليومَ إلّا من صفحته: أُخفيت حين كانت «/deebo» فردّها محمد — «تبني للمستقبل»، فأدِيبُ يكبر ومداخلُ ديبو ستكثر.
 *   والصفحةُ المسمّاة في `ENTRY_NAMES`، وما لم يُسمَّ بعدُ يُكتب برابطه معزولًا باتّجاهه.
 * - **الحوارُ «قطعةُ الحوار»** (`_ad/transcript.tsx`، اختارها محمد من ثلاثة اتّجاهات): فقاعةُ السائل ورقةٌ، وفقاعةُ ديبو من اللوح،
 *   والاسمُ والوقتُ وزمنُ الجواب فوقها، والحجبُ تنبيهٌ بجانب الاسم.
 */
import { useState } from "react";
import { ChatCircleDots, Copy, Fingerprint, SignIn } from "@phosphor-icons/react";
import { Check, EyeSlash, Warning } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { copyText } from "@/lib/clipboard";
import type { DeeboConversation, DeeboMessage } from "@/app/dashboard/deebo/data";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { moodSrc } from "@/lib/deebo/mood";
import { AdRoom, AdButton, type AdMeta } from "../primitives";
import { RecordTicket } from "../record";
import { AdTranscript, type AdTurn } from "../transcript";
import { fmtClock, fmtDayFull, fmtNum } from "../format";
import { askTitle, talkChips, talkInfo, talkStub } from "./deebo-ticket";

/** أسماءُ الصفحات التي يُفتح منها ديبو — يُضاف إليها كلُّ مدخلٍ جديد، وما غاب عنها يُكتب برابطه */
const ENTRY_NAMES: Record<string, string> = { "/deebo": "صفحة ديبو", "/": "الصفحة الرئيسيّة" };
/** «فتحه من …»: الصفحةُ باسمها، أو رابطُها معزولًا باتّجاهه (U+2066…U+2069) فلا تقفز شرطتُه المائلة إلى طرفه الآخر */
const entryLine = (path: string): string => {
  const name = ENTRY_NAMES[path.split(/[?#]/)[0].replace(/(.)\/$/, "$1")];
  return name ? `فتحه من ${name}` : `فتحه من \u2066${path}\u2069`;
};

export function DeeboTalkRecordRoom({ talk }: { talk: DeeboConversation }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  /** البصمةُ مقطوعةً إلى ثمانية كما كانت خليّتُها: تكفي للتمييز داخل اليوم */
  const hash = talk.visitorHash.slice(0, 8);

  /** نسخُ البصمة للزائر وحده، والرسالةُ رسالةُ الخليّة القديمة حرفًا (`Cell`) */
  const onCopy = async () => {
    try {
      await copyText(hash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
      toast.success("نُسِخ: بصمةُ الزائر");
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  /**
   * **سطورُ الكرت أوّلًا ثمّ ما لا يحمله الكرت** (ترتيبُ خلايا القديمة): البصمةُ للزائر، وصفحةُ الدخول، والحذفُ بوقته — ومَن حذفها شارتُه
   * (والحجبُ يتقدّمها في الشارات، فالسطرُ هنا يقول الحذفَ وإن غابت شارتُه). والبدايةُ يومُها في الكعب وساعتُها في سطر الكرت، فلا تُكرَّر.
   */
  const info: AdMeta[] = [
    ...talkInfo(talk, true),
    ...(!talk.ownerName ? [{ icon: <Fingerprint />, text: hash, ltr: true }] : []),
    ...(talk.entryPath ? [{ icon: <SignIn />, text: entryLine(talk.entryPath) }] : []),
    ...(talk.hiddenAt ? [{ icon: <EyeSlash />, text: `حُذفت ${fmtDayFull(talk.hiddenAt)}، ${fmtClock(talk.hiddenAt)}` }] : []),
  ];

  /**
   * **الأدوارُ بترتيبها كما جرت** (`getDeeboTalk` يرتّبها بالوقت صاعدًا): مَن قال (اسمُ صاحب الحساب أو «الزائر»، و«ديبو»)، وساعتُه،
   * وزمنُ جواب ديبو معها بالثواني (كان «1.2s»)، والحجبُ تنبيهٌ. ووجهُ ديبو صورةُ «chatting» كما كانت فقاعتُه في `/deebo`.
   */
  const turnOf = (m: DeeboMessage): AdTurn => {
    const at = fmtClock(m.at);
    if (m.role === "user") {
      const who = talk.ownerName ?? "الزائر";
      return { id: m.id, side: "them", who, when: at, text: m.content, face: <Avatar name={who} src={talk.ownerAvatar ?? undefined} gender={talk.ownerGender} size="sm" /> };
    }
    const secs = m.latencyMs ? Math.max(0.1, Math.round(m.latencyMs / 100) / 10) : null;
    return {
      id: m.id, side: "us", who: "ديبو", text: m.content,
      when: secs ? `${at}، ردّ في ${fmtNum(secs)} ثانية` : at,
      // eslint-disable-next-line @next/next/no-img-element -- صورةٌ ثابتةٌ صغيرة من `public/deebo`
      face: <img src={moodSrc("chatting")} alt="" width={36} height={36} />,
      flag: m.guardBlocked ? <><Warning />حجب رقمًا</> : undefined,
    };
  };

  return (
    <AdRoom label="محادثةٌ مع ديبو">
      <RecordTicket
        title={askTitle(talk)}
        seed={talk.id}
        stub={talkStub(talk)}
        chips={talkChips(talk)}
        acts={talk.ownerName ? undefined : (
          <AdButton variant="soft" size="sm" icon={copied ? <Check /> : <Copy />} done={copied} onClick={() => void onCopy()}>
            نسخ البصمة
          </AdButton>
        )}
        info={info}
      />
      <AdTranscript icon={<ChatCircleDots />} title="الحوار" turns={talk.messages.map(turnOf)} />
    </AdRoom>
  );
}
