"use client";

/**
 * غرفةُ رسائل التواصل على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠١) — السلوكُ سلوكُ `contact/ContactView.tsx` القديم:
 * البحثُ بالاسم والبريد والموضوع ونصّ الرسالة، ومرشّحُ الحالة، وفتحُ الرسالة يعلّمها مقروءةً من نفسه، ونافذتُها بالمحادثة
 * والردِّ الذي يخرج بريدًا والملاحظةِ الداخليّة، ونسخُ البريد، و«تعليمها مقروءة» للجديدة وحدها.
 * والفرقُ في الشكل: كروتٌ أو جدولٌ بكعب التاريخ، والحالُ شارةٌ تتصدّر كما تصدّرت عمودَها، والأفعالُ ظاهرة.
 */
import type { RoomView } from "../view";
import { CONTACT_ROOM } from "./contact.meta";
import { useState, useTransition } from "react";
import { Badge, Button, Modal, Textarea, matchesSearch } from "@adeeb/design-system";
import { Article, At, CalendarBlank, ChatCircleText, Copy, Envelope, EnvelopeOpen, NotePencil, PaperPlaneTilt } from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { ContactRow } from "@/app/dashboard/contact/data";
import { statusLabel, statusTone } from "@/lib/contact/vocab";
import { saveContactNotes, sendContactReply, setContactStatus } from "@/app/dashboard/contact/actions";
import { copyText } from "@/lib/clipboard";
import { AdActs, AdBadge, AdCard, AdRow, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { dayParts, fmtDayFull } from "../format";
import type { ArForms } from "@/lib/arabicCount";

const TONE: Record<ReturnType<typeof statusTone>, AdTone> = { success: "ok", warning: "warn", danger: "bad", info: "info", neutral: "neutral" };
const AR_MESSAGE: ArForms = ["رسالةٌ واحدة", "رسالتان", "رسائل", "رسالةً"];
/** بلا مواضع: لم تكن للغرفة القديمة تبويبات، ومرشّحُها الوحيد الحالة. */
/**
 * **مواضعُ الرسائل بحالها** (محمد ٢٠٢٦-١١-٠١: «ابنِه كي أراه»): كانت فوق الجدول القديم كاردُ إحصاءٍ ثلاث («رسائل جديدة»، «بانتظار
 * الردّ»، «أُجيب عنها») ومرشّحُ حال — فصارت مواضعَ بأعدادها كما في الأخبار، فالعددُ بجانب كلّ موضعٍ يغني عن الكارد، وينقل إليها
 * بنقرة. و«جديدة» بعضُ «بانتظار الردّ» (لم تُقرأ ولم يُجَب)، كما «تنتظر المراجعة» بعضُ «قيد العمل» في الأخبار.
 */
const POSITIONS: Position<ContactRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا رسائل بعد." },
  { key: "new", label: "جديدة", match: (r) => r.status === "new", empty: "لا رسالة جديدة: قُرئت كلُّها." },
  { key: "waiting", label: "بانتظار الردّ", match: (r) => r.status !== "replied", empty: "لا رسالة تنتظر ردًّا." },
  { key: "replied", label: "أُجيب عنها", match: (r) => r.status === "replied", empty: "لم يُجَب عن رسالةٍ بعد." },
];

export function ContactRoom({ rows, view }: { rows: ContactRow[]; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState("");

  // الصفّ المفتوح يُقرأ من القائمة نفسها لا من نسخةٍ محفوظة — فيتبع تحديثَ الخادم بعد كلّ فعل.
  const detail = openId ? rows.find((r) => r.id === openId) ?? null : null;

  /** فتحُ الرسالة — وقراءتُها تُثبَّت في القاعدة إن كانت ما تزال «جديدة». */
  const open = (r: ContactRow) => {
    setOpenId(r.id);
    setReply("");
    setNotes(r.notes ?? "");
    if (r.status === "new") start(async () => { await setContactStatus(r.id, "read"); });
  };

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
    });

  const submitReply = () => {
    if (!detail) return;
    start(async () => {
      const res = await sendContactReply(detail.id, reply);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      setOpenId(null);
    });
  };

  const copyEmail = async (r: ContactRow) => {
    try {
      await copyText(r.email);
      toast.success("نُسخ البريد.");
    } catch {
      toast.error("تعذّر نسخ البريد.");
    }
  };

  /** الأساسيُّ فتحُ الرسالة (وجهةُ النقر على الصفّ في القديمة)، ثمّ نسخُ البريد، ثمّ «تعليمها مقروءة» للجديدة وحدها —
   *  وما بعدها لا رجعةَ فيه: القراءة واقعةٌ لا تُنقض. ولا فعلَ هدّامًا في الغرفة. */
  const ops = (r: ContactRow): AdOp[] => [
    { key: "copy", label: "نسخ البريد", icon: <Copy />, onClick: () => void copyEmail(r) },
    ...(r.status === "new"
      ? [{ key: "read", label: "تعليمها مقروءة", icon: <EnvelopeOpen />, onClick: () => run(() => setContactStatus(r.id, "read")) }]
      : []),
  ];
  const acts = (r: ContactRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "قراءة الرسالة والردّ", icon: <Eye />, onClick: () => open(r) }} ops={ops(r)} />
  );

  /**
   * **الكرتُ والسطرُ مصدرُهما واحد**: الحالُ شارةٌ في العرضين (كانت أوّلَ أعمدة الجدول القديم: أوّلُ ما يُسأل عن رسالةٍ
   * أَجُوبَت أم تنتظر)، ثمّ المُرسِلُ عنوانًا (كان اسمُه العريضَ في عموده)، ثمّ بريدُه وموضوعُه ونصُّ رسالته سطورًا بترتيب
   * أعمدتها القديمة — والبريدُ في السطر عمودٌ فيخرج من سطوره. والكعبُ يومُ الرسالة وشهرُها (كان عمودَ التاريخ).
   */
  const chips = (r: ContactRow) => (
    <AdBadge tone={TONE[statusTone(r.status)]} icon={r.status === "new" ? <Envelope /> : <EnvelopeOpen />}>{statusLabel(r.status)}</AdBadge>
  );
  const info = (r: ContactRow, inCard: boolean): AdMeta[] => [
    ...(inCard ? [{ icon: <At />, text: r.email, ltr: true }] : []),
    { icon: <Article />, text: r.subject?.trim() || "بلا موضوع" },
    // نصُّ الرسالة سطرٌ واحدٌ في العرضين (كان في الجدول القديم مقصوصًا)، وكاملُه في نافذة القراءة
    { icon: <ChatCircleText />, text: r.message, clip: true },
  ];
  const stubOf = (r: ContactRow) => { const d = dayParts(r.createdAt); return { big: d.day, small: d.month }; };

  return (
    <>
      <CollectionRoom<ContactRow>
        navPath={CONTACT_ROOM.navPath}
        title={CONTACT_ROOM.title}
        noun={AR_MESSAGE}
        items={rows}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث بالاسم أو البريد أو نصّ الرسالة…"
        matchSearch={(r, q) => matchesSearch(q, `${r.name} ${r.email} ${r.subject ?? ""} ${r.message}`)}

        viewKey={CONTACT_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.id}
        table={{
          // الترتيبُ بالتاريخ من رأس عموده كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن في الجدول القديم)
          head: "الرسالة",
          stub: { key: "date", label: "التاريخ", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) },
          columns: [{ key: "email", label: "البريد", icon: <At />, text: true }],
        }}
        emptyAll={{ title: "لا رسائل بعد", desc: "ما يكتبه الزائر في «تواصل معنا» بالصفحة الرئيسيّة يصل إلى هنا، فيُقرأ ويُردّ عليه من مكانه." }}
        renderCard={(r) => (
          <AdCard
            key={r.id}
            seed={r.id}
            stub={stubOf(r)}
            chips={chips(r)}
            title={r.name}
            onOpen={() => open(r)}
            meta={info(r, true)}
            foot={acts(r)}
          />
        )}
        renderRow={(r) => (
          <AdRow
            key={r.id}
            title={r.name}
            onOpen={() => open(r)}
            stub={{ ...stubOf(r), seed: r.id }}
            badge={chips(r)}
            sub={info(r, false)}
            // البريد لاتينيّ خطًّا (`.lat`) ومعزولٌ اتّجاهًا (`bdi`) — و`@` محرفٌ محايد،
            // فلولا العزل أخذ اتّجاه الفقرة العربيّة فانتقل صدرُ العنوان إلى آخره.
            cells={[{ label: "البريد", text: true, value: <bdi className="lat" dir="ltr">{r.email}</bdi> }]}
            acts={acts(r, true)}
          />
        )}
      />

      {/* الرسالة كاملةً، وتحتها الردُّ الذي يخرج بريدًا إلى صاحبها — نافذةُ الغرفة القديمة كما هي */}
      <Modal
        open={!!detail}
        onClose={() => setOpenId(null)}
        size="lg"
        busy={pending}
        title={detail ? detail.subject?.trim() || `رسالة من ${detail.name}` : ""}
        // البريد لا يُدسّ في نصّ الوصف: هو سلسلةُ نصٍّ عربيّة لا تحتمل خطًّا لاتينيًّا ولا عزلًا،
        // فيخرج شارةً في الجسد بخطّه واتّجاهه.
        description={detail ? `${detail.name}، ${fmtDayFull(detail.createdAt)}` : undefined}
        footer={
          detail ? (
            <>
              <Button
                variant="primary"
                size="md"
                loading={pending}
                disabled={reply.trim().length < 2}
                onClick={submitReply}
              >
                <PaperPlaneTilt aria-hidden /> {detail.turns.some((t) => t.direction === "out") ? "إرسال ردٍّ جديد" : "إرسال الردّ"}
              </Button>
              <Button variant="ghost" size="md" onClick={() => setOpenId(null)} disabled={pending}>إغلاق</Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <>
            <div>
              <Badge tone="info" variant="outline" icon={<Envelope />}>
                <bdi className="lat" dir="ltr">{detail.email}</bdi>
              </Badge>
            </div>

            {/* المحادثةُ كما جرت (٢٠٢٦-١٠-١٩): رسالتُه الأولى، ثمّ كلُّ ردٍّ منّا وكلُّ ردٍّ منه، الأقدمُ أوّلًا.
                رسائلُه فقاعاتٌ في جهة البدء وردودُنا في الجهة الأخرى، كما في بريده. */}
            <div className="ct-thread">
              <article className="ct-turn is-in">
                <header><b>{detail.name}</b><span>{fmtDayFull(detail.createdAt)}</span></header>
                <p>{detail.message}</p>
              </article>
              {detail.turns.map((t) => (
                <article key={t.id} className={`ct-turn is-${t.direction}`}>
                  <header>
                    <b>{t.direction === "out" ? "ردُّنا" : detail.name}</b>
                    {t.by ? <span>{t.by}</span> : null}
                    <span>{fmtDayFull(t.at)}</span>
                    {t.otherEmail ? <bdi className="lat" dir="ltr">{t.otherEmail}</bdi> : null}
                  </header>
                  <p>{t.body}</p>
                </article>
              ))}
            </div>

            <Textarea
              label="الردّ"
              icon={<PaperPlaneTilt />}
              innerIcon={<NotePencil />}
              placeholder="اكتب ردّك على الرسالة…"
              rows={5}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              helper="يُرسَل بريدًا إلى المُرسِل من نطاق النادي، ويُسجَّل هنا."
            />

            <Textarea
              label="ملاحظة داخليّة"
              icon={<NotePencil />}
              innerIcon={<NotePencil />}
              placeholder="لأهل اللوحة وحدهم، لا تُرسَل إلى أحد."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              optional
            />
            <div className="btn-row">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending || notes.trim() === (detail.notes ?? "").trim()}
                onClick={() => run(() => saveContactNotes(detail.id, notes))}
              >
                <NotePencil aria-hidden /> حفظ الملاحظة
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
