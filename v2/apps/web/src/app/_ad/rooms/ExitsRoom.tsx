"use client";

/**
 * غرفةُ طلبات الخروج على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٤) — السلوكُ سلوكُ `members/exits/ExitsView.tsx` القديم:
 * ما ينتظر القرارَ وما قُضي فيه، والقبولُ بنقرةٍ لمن يقضي في الطلب، والردُّ بسببٍ يصل صاحبَه (لا يقلّ عن `EXIT_REASON_MIN`)،
 * وسطرُ «ليس من مدى سلطتك» لمن يقضي في غير هذا الطلب.
 * والفرقُ في الشكل: القسمان موضعان بعدديهما، وكلُّ طلبٍ كرتٌ أو سطر، والكعبُ يومُ الطلب، والحالُ شارةٌ للمقضيّ.
 * **ونصُّ الطلب كاملًا في نافذته** («افتح الطلب»): الكرتُ يقصّ سطوره، والقرارُ يُتّخذ بعد قراءة السبب كلِّه — فالقبولُ والردُّ
 * فيها تحت النصّ كما كانا تحته في الكرت القديم.
 */
import type { RoomView } from "../view";
import { EXITS_ROOM } from "./exits.meta";
import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Textarea, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, CalendarCheck, ChatCircleText, ChatText, Hourglass, IdentificationBadge } from "@phosphor-icons/react";
import { ArrowUUpLeft, CheckCircle, Eye, Question, XCircle } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { EXIT_REASON_MIN } from "@/app/me/vocab";
import { decideExit } from "@/app/dashboard/members/exits/actions";
import type { ExitRow, ExitsData } from "@/app/dashboard/members/exits/data";
import { AdActs, AdBadge, AdCard, AdRow, type AdMeta, type AdTone } from "../primitives";
import { dayParts, fmtDayFull, relTime } from "../format";
import { CollectionRoom, type Position } from "../collection";
import type { ArForms } from "@/lib/arabicCount";

const AR_REQUEST: ArForms = ["طلبٌ واحد", "طلبان", "طلبات", "طلبًا"];

/**
 * حالُ الطلب المقضيّ شارةً بلونها كما كانت في القديمة — والمعنى في الكلمة لا في اللون وحده. والمعلَّقُ بلا شارة: موضعُه
 * «تنتظر القرار» يقولها، فتكرارُها على كلّ كرتٍ ضجيج.
 */
const STATUS: Record<Exclude<ExitRow["status"], "pending">, { label: string; tone: AdTone; icon: ReactNode }> = {
  approved: { label: "قُبل", tone: "ok", icon: <CheckCircle /> },
  rejected: { label: "رُدّ", tone: "bad", icon: <XCircle /> },
  withdrawn: { label: "سحبه صاحبُه", tone: "neutral", icon: <ArrowUUpLeft /> },
};

/** القسمان القديمان موضعان: «لا طلبَ ينتظر» فراغُ الأوّل كما كان. */
const POSITIONS: Position<ExitRow>[] = [
  { key: "pending", label: "تنتظر القرار", match: (r) => r.status === "pending", empty: "لا طلبَ ينتظر." },
  { key: "past", label: "ما قُضي فيه", match: (r) => r.status !== "pending", empty: "لم يُقضَ في طلبٍ بعد." },
];

export function ExitsRoom({ data, serverNow, view }: { data: ExitsData; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reject, setReject] = useState<ExitRow | null>(null);
  const [reason, setReason] = useState("");

  const rows = [...data.pending, ...data.past];
  // الطلبُ المفتوح يُقرأ من القائمة نفسها — فيتبع تحديثَ الخادم بعد القرار
  const detail = openId ? rows.find((r) => r.id === openId) ?? null : null;

  function decide(row: ExitRow, approve: boolean, why?: string) {
    start(async () => {
      const res = await decideExit({ id: row.id, approve, reason: why });
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
      if (res.ok) {
        setReject(null);
        setOpenId(null);
        setReason("");
        router.refresh();
      }
    });
  }

  /**
   * **الكرتُ والسطرُ مصدرُهما واحد**، وعلى نمط أختيها (التواصل والإنذارات): الكعبُ يومُ الطلب وشهرُه، والحالُ شارةٌ للمقضيّ،
   * ومقاعدُ صاحبه شاراتٌ (القرارُ يُتّخذ وهي تُرى)، ثمّ كم ينتظر أو متى قُضي، ثمّ سببُه وجوابُه.
   */
  const chips = (r: ExitRow) => {
    const st = r.status === "pending" ? null : STATUS[r.status];
    if (!st && !r.seats.length) return undefined;
    return (
      <>
        {st && <AdBadge tone={st.tone} icon={st.icon}>{st.label}</AdBadge>}
        {r.seats.map((s) => <AdBadge key={s} icon={<IdentificationBadge />}>{s}</AdBadge>)}
      </>
    );
  };
  const info = (r: ExitRow): AdMeta[] => [
    ...(r.status === "pending"
      ? [{ icon: <Hourglass />, text: `طلب ${relTime(r.createdAt, serverNow)}` }]
      : r.decidedIso ? [{ icon: <CalendarCheck />, text: `قُضي في ${fmtDayFull(r.decidedIso)}` }] : []),
    { icon: <ChatText />, text: r.reason, clip: true },
    ...(r.decisionReason ? [{ icon: <ChatCircleText />, text: `وجوابُه: ${r.decisionReason}`, clip: true }] : []),
  ];
  const stubOf = (r: ExitRow) => { const d = dayParts(r.createdAt); return { big: d.day, small: d.month }; };
  const acts = (r: ExitRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "افتح الطلب", icon: <Eye />, onClick: () => setOpenId(r.id) }} ops={[]} />
  );

  return (
    <>
      <CollectionRoom<ExitRow>
        navPath={EXITS_ROOM.navPath}
        title={EXITS_ROOM.title}
        noun={AR_REQUEST}
        items={rows}
        positions={POSITIONS}
        defaultPosition="pending"
        // لا تنبيهَ «الاطّلاعُ لك والقضاءُ لغيرك» (محمد ٢٠٢٦-١١-٠٤: «لا أريد هذه الرسالة أن تظهر من الأساس»): قفلُ الغرفة
        // `decide_membership_exits` لا يحمله إلّا الثلاثةُ الذين يقضون (`can_decide_membership_exit`)، فلا يراه أحد
        searchPlaceholder="ابحث بالاسم أو المنصب أو السبب…"
        matchSearch={(r, q) => matchesSearch(q, `${r.name} ${r.seats.join(" ")} ${r.reason}`)}
        viewKey={EXITS_ROOM.viewKey}
        initialView={view}
        idOf={(r) => r.id}
        table={{ head: "الطلب", stub: { key: "date", label: "التاريخ", icon: <CalendarBlank />, sortBy: (r) => +new Date(r.createdAt) }, columns: [] }}
        emptyAll={{ title: "لا طلبَ ينتظر", desc: "حين يطلب صاحبُ منصبٍ إنهاءَ عضويّته، وقف طلبُه هنا." }}
        renderCard={(r) => (
          <AdCard key={r.id} seed={r.id} stub={stubOf(r)} chips={chips(r)} title={r.name} onOpen={() => setOpenId(r.id)} meta={info(r)} foot={acts(r)} />
        )}
        renderRow={(r) => (
          <AdRow key={r.id} title={r.name} onOpen={() => setOpenId(r.id)} stub={{ ...stubOf(r), seed: r.id }} badge={chips(r)} sub={info(r)} cells={[]} acts={acts(r, true)} />
        )}
      />

      {/* الطلبُ كاملًا، وتحته القرارُ لمن يقضي فيه — كما كان نصُّه وزرّاه في الكرت القديم */}
      <Modal
        open={!!detail}
        onClose={() => setOpenId(null)}
        busy={busy}
        title={detail ? detail.name : ""}
        description={detail ? [...detail.seats, fmtDayFull(detail.createdAt)].join("، ") : undefined}
        size="md"
        footer={
          detail ? (
            detail.canDecide && detail.status === "pending" ? (
              <>
                <Button variant="danger" size="md" loading={busy} onClick={() => decide(detail, true)}>اقبل الطلب</Button>
                <Button variant="ghost" size="md" disabled={busy} onClick={() => { setReason(""); setReject(detail); setOpenId(null); }}>ردَّ الطلب</Button>
              </>
            ) : (
              <Button variant="ghost" size="md" onClick={() => setOpenId(null)}>إغلاق</Button>
            )
          ) : null
        }
      >
        {detail ? (
          <>
            <p>{detail.reason}</p>
            {detail.decisionReason ? <p>وجوابُه: {detail.decisionReason}</p> : null}
            {detail.status === "pending" && data.mayDecide && !detail.canDecide ? (
              <p>هذا الطلبُ ليس من مدى سلطتك، وسلطةُ القضاء تتبع مقعدَ صاحبه.</p>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* ردُّ الطلب لا يكون صمتًا: من طلب الخروجَ يستحقّ جوابًا، والقاعدةُ تشترطه أصلًا — نافذةُ القديمة حرفًا */}
      <Modal
        open={reject !== null}
        onClose={() => setReject(null)}
        busy={busy}
        title="ردُّ الطلب"
        description="يصل سببُك إلى صاحب الطلب، فاكتبه له لا للسجلّ."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setReject(null)} disabled={busy}>تراجع</Button>
            <Button
              variant="danger"
              size="md"
              loading={busy}
              disabled={reason.trim().length < EXIT_REASON_MIN}
              onClick={() => reject && decide(reject, false, reason)}
            >
              ردَّ الطلب
            </Button>
          </>
        }
      >
        <Textarea
          label="سببُ الردّ"
          icon={<ChatText />}
          innerIcon={<Question />}
          placeholder="لماذا لا يخرج الآن؟"
          rows={3}
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          helper={`مطلوب، ${EXIT_REASON_MIN} محارف على الأقلّ.`}
        />
      </Modal>
    </>
  );
}
