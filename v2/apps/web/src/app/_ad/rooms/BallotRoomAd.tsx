"use client";

/**
 * **ورقةُ التصويت بالهويّة** (`/dashboard/elections/vote/[electionId]`؛ رحلةُ العضو ع٨، ٢٠٢٦-١١-١٨).
 *
 * **التنافس: كرتُ الشخص من الهويّة لكلّ مرشّح** (`AdCard face`، «التذكرةُ واقفة»؛ اعتمده محمد ٢٠٢٦-١١-١٩ بعد سبعة أشكالٍ رُدّت):
 * الكعبُ شريطٌ بنقش أدِيب ووجهُ المرشّح على حدّه واسمُه تحته، ثمّ **مدخلُ بيانه** (خمسةُ أسطرٍ في العريض وأربعةٌ في الجوّال، بالقصّ نفسه للجميع)
 * وملفُّه أو سطرُ غيابه (`AdLineVoid`)، والأفعالُ في القاع: «قراءة البيان كاملًا» (نافذةٌ يُختار منها) و«اختيار».
 * - **المختارُ شارةٌ على حدّ وجهه** («اخترتَه» مصمتةً بكحليّ اللوح، قطعةُ «أنت» في صفّ القيادة): لا حدٌّ ولا وهجٌ ولا رأسٌ يتلوّن (رُدّت ثلاثتها).
 * - **الاختيارُ ليس الصوت:** شريطٌ يقول «اخترت نورة» و«ختم صوتي»، والختمُ تأكيدٌ يعيد الاسم؛ والشريطُ يلازم القاعَ في الجوّال وحده.
 * - **الحياد:** الترتيبُ لكلّ ناخبٍ بترتيبه (`ballotOrder`)، ولا عددَ كلمات، والكروتُ متساويةٌ في قصّها وأزرارها.
 * - **ورقتُك إن كنت مرشّحًا:** آخرُ الكروت بشارة «ورقتك»، تُقرأ ولا تُختار. **وبعد الختم** الكروتُ نفسُها بلا «اختيار»، وشارةُ «صوتُك» على من صوّتَّ له.
 * **وتصويتُ الثقة** (مرشّحٌ وحيد، اعتمده محمد): المرشّحُ في الصدر، ورأيُك بجانبه، ثمّ الختم.
 * **وبعد الإعلان الورقةُ نفسُها نتيجتُه** (`outcome`، محمد ٢٠٢٦-١١-١٩: «لا صفحةَ نتيجةٍ مستقلّة»): لمن صوّت فيها أو ترشّح لها، الكروتُ
 * نفسُها بلا «اختيار»، والفائزُ أوّلُها بشارة «فائز»، و«صوتُك» على من صوّتَّ له، و«اكتمل الانتخاب» في الرأس. بلا أرقام (المادتان ٥ و٢٨).
 * وللفائز نفسِه نافذةُ «ألف مبروك» حين يفتحها.
 * **ولا رقمَ انتخابيّ** (بديلُ الاسم أيّامَ التعمية، والمرشّحُ اليوم باسمه وصورته — قرار ٢٠٢٦-١١-٠٧)، **ولا اسمَ ملفٍّ خام**: «الملفّ الانتخابي» بنوعه وحجمه.
 */
import { useState, useTransition } from "react";
import { Modal } from "@adeeb/design-system";
import { BookOpenText, CalendarX, FileDashed, FileText, Paperclip, Scales, ThumbsDown, ThumbsUp, Timer, Trophy } from "@phosphor-icons/react";
import { ArrowRight, ArrowSquareOut, Check, Checks } from "@/app/_components/glyphs";
import type { BallotCandidate, MyVote, VoteItem } from "@/app/dashboard/elections/member-data";
import { useElectionApi } from "@/app/dashboard/elections/actions-context";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { firstAndLastOf } from "@/lib/personName";
import { formatBytesAr } from "@/lib/bytes";
import { ballotOrder } from "@/lib/elections/ballotOrder";
import { AdBadge, AdButton, AdCard, AdConfirm, AdEmpty, AdNote } from "../primitives";
import { AdLine, AdLineVoid, AdSection } from "../account";
import { RecordTicket } from "../record";
import { dayParts } from "../format";
import { AdConfetti } from "../confetti";

const nameOf = (c: BallotCandidate) => c.name ?? `المرشّح ${c.number}`;
const she = (c: BallotCandidate) => c.gender === "female";
const face = (c: BallotCandidate, size: "sm" | "lg" | "xl" | "2xl" = "sm") => <Avatar name={c.name ?? "مرشّح"} src={c.avatarUrl ?? undefined} gender={c.gender === "female" ? "female" : c.gender === "male" ? "male" : null} size={size} />;
/** الملفُّ بنوعه وحجمه لا باسمه الخام («ملف-نهائي(2).pdf») */
const fileSub = (c: BallotCandidate) => [c.fileMime?.includes("pdf") || c.fileName?.toLowerCase().endsWith(".pdf") ? "PDF" : c.fileName?.split(".").pop()?.toUpperCase(), c.fileSize ? formatBytesAr(c.fileSize) : null].filter(Boolean).join("، ");

export function BallotRoomAd({ election: e, candidates: given, myVote, voterId, outcome }: {
  election: VoteItem; candidates: BallotCandidate[]; myVote: MyVote | null;
  /** الورقةُ بعد إعلان الفائز (`getSeatOutcome`): تُقرأ ولا يُصوَّت فيها */
  outcome?: { winnerId: string; youWon: boolean; declaredRaw: string | null };
  /** يرتّب الورقةَ لصاحبها (`ballotOrder`): لا يتصدّر مرشّحٌ عند كلّ الناخبين */
  voterId?: string;
}) {
  const candidates = voterId ? ballotOrder(given, voterId) : given;
  const api = useElectionApi();
  const toast = useToast();
  const [busy, start] = useTransition();
  const [pick, setPick] = useState("");
  const [reading, setReadingOf] = useState<BallotCandidate | null>(null);
  const [sealing, setSealing] = useState(false);
  const [cheer, setCheer] = useState(!!outcome?.youWon);

  const sole = candidates.length === 1 ? candidates[0] : null;
  const chosen = sole ? null : candidates.find((c) => c.id === pick) ?? null;
  const ready = sole ? pick === "approve" || pick === "reject" : !!chosen;
  const looking = !!outcome || e.hasVoted || e.viewOnly;
  const winner = outcome ? candidates.find((c) => c.id === outcome.winnerId) ?? null : null;

  const openFile = async (c: BallotCandidate) => { if (c.fileUrl && !(await api.openFile(c.fileUrl))) toast.error("تعذّر فتح الملفّ، أعِد المحاولة."); };
  const seal = () => start(async () => {
    const r = sole ? await api.castVote(e.electionId, sole.id, pick as "approve" | "reject") : chosen ? await api.castVote(e.electionId, chosen.id) : null;
    if (!r) return;
    setSealing(false);
    if (!r.ok) { toast.error(r.message); return; }
    toast.success(r.message);
    api.refresh();
  });

  /** مرشّحُ تصويت الثقة قسمٌ في الصدر: وجهُه واسمه، وبيانُه بخطّ القراءة كاملًا، وملفُّه سطرًا يُفتح (اعتمده محمد ٢٠٢٦-١١-١٨) */
  const card = (c: BallotCandidate) => {
    const mine = myVote?.candidateId === c.id;
    return (
      <AdSection key={c.id} icon={face(c)} title={nameOf(c)}
        sub={outcome && c.id === outcome.winnerId ? (c.isSelf ? (she(c) ? "فزتِ بتأييد المصوّتين" : "فزتَ بتأييد المصوّتين") : she(c) ? "فازت بتأييد المصوّتين" : "فاز بتأييد المصوّتين")
          : c.isSelf ? "ورقتك، ولا تصوّت لنفسك" : mine ? (myVote?.choice === "reject" ? "اعترضتَ عليه" : "صوتك له") : undefined}
        media={<p className="ad-elw-stmt-t">{c.statement.trim() || "لم يكتب بيانًا."}</p>}>
        {c.fileUrl
          ? <AdLine icon={<Paperclip />} v="الملفّ الانتخابي" sub={fileSub(c) || undefined} onClick={() => { void openFile(c); }} act={{ icon: <ArrowSquareOut />, text: "فتح", label: `فتح الملفّ الانتخابي لـ${nameOf(c)}` }} />
          : <AdLine icon={<FileText />} v="لم يرفق ملفًّا انتخابيًّا" tone="muted" />}
      </AdSection>
    );
  };

  // ورقتُك آخرُ الكروت ما دام التصويت؛ وبعد الإعلان الفائزُ أوّلُها (لا حيادَ يُحرس بعد أن قال الناخبون كلمتهم)
  const ranked = [...candidates].sort((a, b) => outcome
    ? Number(b.id === outcome.winnerId) - Number(a.id === outcome.winnerId)
    : Number(a.isSelf) - Number(b.isSelf));
  const fileLine = (c: BallotCandidate) => c.fileUrl ? (
    <ul className="ad-lines ad-elw-why"><AdLine icon={<Paperclip />} v="الملفّ الانتخابي" sub={fileSub(c) || undefined} onClick={() => { void openFile(c); }} act={{ icon: <ArrowSquareOut />, text: "فتح", label: `فتح الملفّ الانتخابي لـ${nameOf(c)}` }} /></ul>
  ) : null;
  /** كرتُ المرشّح: كرتُ الشخص بشارته على وجهه، ومدخلُ بيانه وملفُّه، والأفعالُ في قاعه — و«اختيار» ما دامت الورقةُ مفتوحة */
  const person = (c: BallotCandidate) => {
    const on = pick === c.id;
    const mine = looking && myVote?.candidateId === c.id;
    const mark = outcome && c.id === outcome.winnerId ? <AdBadge icon={<Trophy />}>{she(c) ? "فائزة" : "فائز"}</AdBadge>
      : c.isSelf ? <AdBadge>ورقتك</AdBadge>
      : mine ? <AdBadge icon={<Checks />}>صوتُك</AdBadge>
      : on ? <AdBadge icon={<Check />}>{she(c) ? "اخترتَها" : "اخترتَه"}</AdBadge> : undefined;
    return (
      <AdCard key={c.id} seed={c.id} title={nameOf(c)}
        face={{ name: nameOf(c), src: c.avatarUrl, gender: c.gender === "female" ? "female" : c.gender === "male" ? "male" : null, mark }}
        extra={
          <div className="ad-blt-pc">
            <p className="ad-elw-stmt-t ad-blt-pc-stmt">{c.statement.trim() || "لم يكتب بيانًا."}</p>
            {fileLine(c) ?? <AdLineVoid icon={<FileDashed />} text={she(c) ? "لم ترفق ملفًّا انتخابيًّا" : "لم يرفق ملفًّا انتخابيًّا"} />}
          </div>
        }
        foot={<>
          <AdButton variant="soft" size="sm" icon={<BookOpenText />} onClick={() => setReadingOf(c)}>قراءة البيان كاملًا</AdButton>
          {looking || c.isSelf ? null : <AdButton variant={on ? "fill" : "soft"} size="sm" icon={<Check />} pressed={on} onClick={() => setPick(on ? "" : c.id)}>{on ? (she(c) ? "اخترتَها" : "اخترتَه") : "اختيار"}</AdButton>}
        </>} />
    );
  };

  const votedName = myVote?.candidateId ? candidates.find((c) => c.id === myVote.candidateId) : null;

  return (
    <div className="ad-room ad-elw-pg">
      <RecordTicket
        path="/dashboard/elections/vote"
        title={e.position}
        seed={e.electionId}
        stub={(outcome ? outcome.declaredRaw : e.votingEndRaw) ? (() => { const d = dayParts((outcome ? outcome.declaredRaw : e.votingEndRaw)!); return { big: d.day, small: d.month }; })() : undefined}
        chips={outcome ? <AdBadge tone="ok" icon={<Trophy />}>اكتمل الانتخاب</AdBadge> : e.hasVoted ? <AdBadge tone="ok" icon={<Checks />}>صوتُك مختوم</AdBadge> : e.viewOnly ? <AdBadge tone="info">مقعدُك</AdBadge> : <AdBadge tone="ok">التصويت مفتوح</AdBadge>}
        info={outcome ? (winner ? [{ icon: <Trophy />, text: `${she(winner) ? "فازت" : "فاز"} ${firstAndLastOf(nameOf(winner))} بالمقعد` }] : []) : [
          ...(e.votingEnd ? [{ icon: <CalendarX />, text: `يُغلق التصويت ${e.votingEnd}، أو حين يصوّت الجميع` }] : []),
          { icon: <Scales />, text: sole ? "تصويتُ ثقة: مرشّحٌ واحد، تؤيّده أو تعترض" : `${candidates.length} مرشّحين، وصوتٌ واحد لمرشّحٍ واحد` },
        ]}
        acts={<AdButton variant="soft" size="sm" icon={<ArrowRight />} href="/dashboard/elections/vote">العودة إلى التصويت</AdButton>}
      />

      {outcome ? null : <>
      {e.revote && !e.hasVoted ? <AdNote tone="warn" label="صوّت من جديد" title="انتهى ترشّح من صوّتَّ له، فبطل صوتك وعادت ورقتك مفتوحة بوزنك الأوّل." /> : null}
      {e.viewOnly ? <AdNote tone="info" label="أنت مرشّحُ هذا المقعد" title="لا مرشّحَ سواك، ولا يجوز التصويت للنفس: فهذه ورقتُك تطّلع عليها، والقرارُ للمصوّتين." /> : null}
      {e.hasVoted ? (
        <AdNote tone="ok" label="صوتُك مختوم" title={myVote?.choice === "reject" ? "اعترضتَ في تصويت الثقة." : votedName ? `صوّتّ لـ${firstAndLastOf(nameOf(votedName))}.` : "صوّتّ في هذا المقعد."}>
          لا يُغيَّر، ويبقى لك أن تقرأ ما كتبه المرشّحون حتى يُغلق التصويت. ولا يرى صوتَك غيرُك ومديرو الانتخابات.
        </AdNote>
      ) : null}
      </>}

      {/* ── المطّلع: يقرأ ولا صندوق — الثقةُ قسمُها، والتنافسُ كروتُه نفسُها بلا «اختيار» ── */}
      {looking && sole ? <div className="ad-elw-pg-main">{card(sole)}</div> : null}
      {looking && !sole ? <div className="ad-grid ad-blt-people">{ranked.map(person)}</div> : null}

      {/* ── تصويتُ الثقة: المرشّحُ ورأيُك تحته، ثمّ الختم ── */}
      {!looking && sole ? (
        <div className="ad-elw-pg-cols">
          <div className="ad-elw-pg-main">{card(sole)}</div>
          <div className="ad-elw-pg-side">
            <AdSection icon={<Scales />} title="رأيك" sub="يتولّى المقعد إن غلب وزنُ التأييد وزنَ الاعتراض."
              foot={<div className="ad-elw-pg-acts"><AdButton variant="fill" icon={<Check />} disabled={!ready} onClick={() => setSealing(true)}>ختم صوتي</AdButton></div>}>
              <AdLine icon={<ThumbsUp />} v={she(sole) ? "أؤيّد توليَها المقعد" : "أؤيّد توليَه المقعد"} sub={she(sole) ? "أراها أهلًا لهذا المقعد" : "أراه أهلًا لهذا المقعد"} current={pick === "approve"} onClick={() => setPick("approve")} />
              <AdLine icon={<ThumbsDown />} v="أعترض" sub={she(sole) ? "لا أرى توليَها هذا المقعد" : "لا أرى توليَه هذا المقعد"} current={pick === "reject"} onClick={() => setPick("reject")} />
            </AdSection>
          </div>
        </div>
      ) : null}

      {/* ── التنافس: ورقتُك آخرُ المرشّحين (تقول عن نفسها)، فيبدأ الصفُّ بمن يُختار؛ وشريطُ الختم ثابتٌ في القاع ── */}
      {!looking && !sole ? (
        <>
          <div className="ad-grid ad-blt-people">{ranked.map(person)}</div>
          <div className="ad-blt-dock" data-on={chosen ? true : undefined}>
            {chosen ? face(chosen) : null}
            <span className="ad-blt-dock-t">{chosen ? <><small>اخترت</small><b>{firstAndLastOf(nameOf(chosen))}</b></> : <><small>لم تختر بعد</small><b>اختر مرشّحًا واحدًا</b></>}</span>
            <AdButton variant="fill" icon={<Check />} disabled={!ready} onClick={() => setSealing(true)}>ختم صوتي</AdButton>
          </div>
        </>
      ) : null}

      {/* القراءة: البيانُ كاملًا بعرض القراءة، وملفُّه، ويُختار منها */}
      {reading ? (
        <Modal open onClose={() => setReadingOf(null)} size="lg" title={nameOf(reading)} description={reading.isSelf ? "ورقتك" : undefined}
          footer={reading.isSelf || looking
            ? <AdButton plain onClick={() => setReadingOf(null)}>إغلاق</AdButton>
            : <>
                <AdButton variant="fill" icon={<Check />} onClick={() => { setPick(reading.id); setReadingOf(null); }}>{pick === reading.id ? "هذا اختياري" : `اختيار ${firstAndLastOf(nameOf(reading))}`}</AdButton>
                <AdButton plain onClick={() => setReadingOf(null)}>إغلاق</AdButton>
              </>}>
          <p className="ad-elw-stmt-t">{reading.statement.trim() || "لم يكتب بيانًا."}</p>
          {fileLine(reading)}
        </Modal>
      ) : null}

      {!candidates.length ? <AdEmpty icon={<Timer />} title="لا مرشّحين في الورقة الآن" desc="يغيب عنها من يُنظر في استبعاده حتى يُحسم أمره." /> : null}

      <AdConfirm
        open={sealing}
        onClose={() => { if (!busy) setSealing(false); }}
        tone="success"
        icon={<Check />}
        title="ختم صوتك"
        text={sole
          ? (pick === "reject" ? `تعترض على تولّي ${firstAndLastOf(nameOf(sole))} المقعد.` : `تؤيّد تولّي ${firstAndLastOf(nameOf(sole))} المقعد.`) + " والصوتُ لا يُغيَّر بعد ختمه."
          : chosen ? `صوتُك لـ${firstAndLastOf(nameOf(chosen))}، ولا يُغيَّر بعد ختمه.` : undefined}
        confirmLabel="ختم صوتي"
        loading={busy}
        onConfirm={seal}
      />

      {/* الفائزُ حين يفتح ورقته بعد الإعلان (من إشعار الفوز): تهنئةٌ واحدة، والورقةُ وراءها كما رآها الناخبون */}
      {/* تنطلق مرّةً مع النافذة وتُتمّ دورتها ولو أُغلقت قبلها: إيقافُها في منتصفها يُبقي آخرَ إطارٍ معلّقًا على الشاشة */}
      {outcome?.youWon ? <AdConfetti on /> : null}
      {winner ? (
        <AdConfirm open={cheer} onClose={() => setCheer(false)} tone="success" icon={<Trophy />} single
          title="ألف مبروك"
          text={`${she(winner) ? "فزتِ" : "فزتَ"} بمقعد «${e.position}»، وصار ${she(winner) ? "لكِ" : "لكَ"} من يوم إعلانه.`}
          confirmLabel="شكرًا" onConfirm={() => setCheer(false)} />
      ) : null}
    </div>
  );
}
