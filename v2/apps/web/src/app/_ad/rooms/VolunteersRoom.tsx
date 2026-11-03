"use client";

/**
 * غرفةُ سجلّ المتطوّعين على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣) — السلوكُ سلوكُ
 * `volunteering/volunteers/VolunteersView.tsx` القديم وكرتِه (`VolunteerCard.tsx`): تبويبا «متطوّعون» و«سابقون»، والبحثُ بالاسم
 * والجوّال والبريد والمدينة، ومرشّحُ الرغبة **بأيّ رغبة** لا بالأولى وحدها، و«السجلُّ الكامل» في نافذته (`VolunteerRecord` كما هو)،
 * و**إهداءُ العضويّة** لمن يملكه (`canGrant` من الصفحة) واللجنةُ المقترحةُ رغبتُه الأولى، و**إنهاءُ التطوّع** بسببٍ مكتوب —
 * ونافذتُهما نافذةُ الغرفة القديمة كما هي (فيها حقلٌ لا يحمله `AdConfirm`).
 *
 * **والإحصاءُ القديم**: عددُ الكشف عددُ موضعه، و«لم يشارك ولا مرّة» حالٌ تقود إلى فعلٍ (يُدعى إلى الفرص القادمة) فصار موضعًا
 * بعدده. و«دخل في آخر ثلاثين يومًا» والرغبةُ الأولى والمدنُ والجنسُ مجاميعُ وتوزيعاتٌ لا حال: مكانُها صفحةُ الإحصاء.
 */
import type { RoomView } from "../view";
import { VOLUNTEERS_ROOM } from "./volunteers.meta";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Select, Textarea, matchesSearch } from "@adeeb/design-system";
import {
  CalendarPlus, CalendarX, Certificate, IdentificationBadge, ClipboardText, Envelope, Gift, HandHeart, ListNumbers, Phone, SignIn,
  UserCircle,
} from "@phosphor-icons/react";
import { PencilSimple } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { endVolunteering, grantMembership } from "@/app/dashboard/volunteering/actions";
import type { VolunteerRow } from "@/app/dashboard/volunteering/data";
import { VolunteerHero, VolunteerRecord } from "@/app/dashboard/volunteering/volunteers/VolunteerRecord";
import { AR_VOLUNTEER } from "@/lib/arabicCount";
import { AdActs, AdCard, AdRow, type AdAction, type AdFigure, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { fmtNum } from "../format";

type Ask = { kind: "grant" | "end"; row: VolunteerRow } | null;

/** شارك فعلًا: طلبٌ مقبولٌ أُكّد حضورُه — حكمُ «لم يشارك ولا مرّة» القديم (`stats.idle`). */
const participated = (v: VolunteerRow) => v.apps.some((a) => a.status === "accepted" && a.attendance === "attended");

/**
 * **كم مرّةً شارك** (`VolunteerCard`، المالك ٢٠٢٦-١٠-٠٣): فرصٌ أُكّد حضورُه فيها، تُعدّ بالفرصة لا بالفترة (فترتان من فرصةٍ مشاركةٌ
 * واحدة)، كما تُعدّ الشهادة.
 */
const timesOf = (v: VolunteerRow) =>
  new Set(v.apps.filter((a) => a.status === "accepted" && a.attendance === "attended").map((a) => a.opportunityId)).size;

/**
 * **المواضع: تبويبا الكشف القديم، وبينهما «لم يشارك ولا مرّة»** — كان أوسطَ كاردات الإحصاء بنغمة التحذير («تحتاج إجراءً منك»)
 * باسمه الذي اختاره المالك (٢٠٢٦-١٠-٠٣)، فصار موضعًا بعدده من المتطوّعين النشطين: هم من يُدعَون إلى الفرص القادمة.
 */
/**
 * **من نال العضويّة ترقّى ولم يخرج** (محمد ٢٠٢٦-١١-٠٣): إهداءُ العضويّة (`grant_membership_to_volunteer`) يُطفئ تطوّعَه ويكتب سببًا
 * ثابتًا «نال العضويّة» — فكان يظهر في «سابقون» بسطر «سببُ انتهاء التطوّع: نال العضويّة» كأنّه أُنهي. وذلك النصُّ الثابت علامتُه الوحيدة
 * في القاعدة (لا عمودَ لنوع الانتهاء)، فإن تغيّر في الدالّة تغيّر هنا.
 */
const PROMOTED = "نال العضويّة";
const promoted = (v: VolunteerRow) => v.status === "former" && v.endReason?.trim() === PROMOTED;

const POSITIONS: Position<VolunteerRow>[] = [
  { key: "active", label: "متطوّعون", match: (v) => v.status === "active", empty: "لا متطوّعين هنا." },
  { key: "idle", label: "لم يشارك ولا مرّة", match: (v) => v.status === "active" && !participated(v), empty: "شارك كلُّ متطوّعٍ مرّةً على الأقلّ." },
  { key: "members", label: "صاروا أعضاء", match: (v) => promoted(v), empty: "لم يصر أحدٌ من المتطوّعين عضوًا بعد." },
  { key: "former", label: "سابقون", match: (v) => v.status === "former" && !promoted(v), empty: "لا متطوّعين سابقين." },
];

/** `canGrant`: يملك `manage_membership_applications` (الصفحة)، وبلاها لا يظهر الإهداء. و`serverNow` يمرّره كلُّ مسارٍ على القالب. */
export function VolunteersRoom({ rows, committees, canGrant, view }: {
  rows: VolunteerRow[];
  committees: { id: number; name: string }[];
  canGrant: boolean;
  serverNow: number;
  view?: RoomView;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [ask, setAsk] = useState<Ask>(null);
  const [record, setRecord] = useState<VolunteerRow | null>(null);
  const [committee, setCommittee] = useState("");
  const [reason, setReason] = useState("");

  const openAsk = (kind: "grant" | "end", row: VolunteerRow) => {
    setCommittee(row.prefs[0] ? String(row.prefs[0].id) : "");
    setReason("");
    setAsk({ kind, row });
  };

  const confirm = async () => {
    if (!ask) return;
    setBusy(ask.row.userId);
    const r = ask.kind === "grant"
      ? await grantMembership(ask.row.userId, Number(committee))
      : await endVolunteering(ask.row.userId, reason);
    setBusy(null);
    if (!r.ok) { toast.error(r.message); return; }
    toast.success(r.message);
    setAsk(null);
    router.refresh();
  };

  /**
   * **الأساسيُّ أبرزُ أزرار الكرت القديم**: «إهداءُ العضويّة» للنشط حين يملكه الرائي، وإلّا بابُ السجلّ («السجلُّ الكامل»، بصيغة
   * «افتح …»). ثمّ البقيّةُ بترتيبها: السجلُّ (ما لم يكن هو الأساسيّ)، و«إنهاءُ التطوّع» للنشط وحده آخرَها (كان وحدَه في قائمة ⋮ بالأحمر).
   */
  const grantable = (v: VolunteerRow) => canGrant && v.status === "active";
  const openRecord: (v: VolunteerRow) => AdAction = (v) => ({ label: "افتح السجلّ", icon: <ClipboardText />, onClick: () => setRecord(v) });
  const primaryOf = (v: VolunteerRow): AdAction =>
    grantable(v) ? { label: "إهداءُ العضويّة", icon: <Gift />, onClick: () => openAsk("grant", v) } : openRecord(v);
  const opsOf = (v: VolunteerRow): AdOp[] => [
    ...(grantable(v) ? [{ key: "record", label: "افتح السجلّ", icon: <ClipboardText />, onClick: () => setRecord(v) }] : []),
    ...(v.status === "active"
      ? [{ key: "end", label: "إنهاءُ التطوّع", icon: <HandHeart />, onClick: () => openAsk("end", v), danger: true }]
      : []),
  ];
  const acts = (v: VolunteerRow, inRow?: boolean) => <AdActs inRow={inRow} primary={primaryOf(v)} ops={opsOf(v)} />;

  /**
   * **لا شارةَ في كرت المتطوّع** (محمد ٢٠٢٦-١١-٠٣): كانت الرغبةُ الأولى شارةً برمز «①» فلم يُفهم الرقم، والصفةُ «متطوّع» يقولها
   * الموضع. فالرغباتُ كلُّها سطرٌ واحدٌ بترتيبها («الرغبات بالترتيب: …»)، وترتيبُها يقوله النصّ لا رمز.
   */

  /**
   * **السطورُ مصدرُها واحدٌ وترتيبُها واحد** — ترتيبُ صفوف الكرت القديم (بأمر المالك): الجوّالُ (والبريدُ بعده سطرَ تواصلٍ على
   * نمط كرت الشخص)، ثمّ الرغباتُ التالية، ثمّ آخرُ دخولٍ بطابعه وساعته (لا يُختصر، المالك ٢٠٢٦-٠٩-٢٦) — وللسابق سببُ انتهاء
   * تطوّعه مكانَه، بلا لون (الموضعُ «سابقون» يقولها).
   */
  const info = (v: VolunteerRow): AdMeta[] => {
    return [
      v.phone ? { icon: <Phone />, text: v.phone, ltr: true } : { icon: <Phone />, text: "الجوّال غير متوفّر", tone: "muted" },
      ...(v.email ? [{ icon: <Envelope />, text: v.email, ltr: true }] : []),
      v.prefs.length === 0
        ? { icon: <ListNumbers />, text: "بلا رغبات", tone: "muted" as const }
        : { icon: <ListNumbers />, text: `${v.prefs.length > 1 ? "الرغبات بالترتيب" : "الرغبة"}: ${v.prefs.map((p) => p.name).join("، ")}`, clip: true },
      promoted(v)
        ? { icon: <IdentificationBadge />, text: v.endedAt ? `صار عضوًا في ${v.endedAt}` : "صار عضوًا" }
        : v.status === "former"
        ? (v.endReason
            ? { icon: <CalendarX />, text: `سببُ انتهاء التطوّع: ${v.endReason}`, clip: true }
            : { icon: <CalendarX />, text: "سببُ انتهاء التطوّع غير مذكور", tone: "muted" })
        : (v.lastSignInAt
            ? { icon: <SignIn />, text: `آخرُ دخول ${v.lastSignInAt}` }
            : { icon: <SignIn />, text: "لم يدخل قطّ", tone: "muted" }),
    ];
  };

  /**
   * **أرقامُ الكرت = أعمدةُ السطر**: بدايةُ التطوّع (رقمُ «الانضمام» في كرت الشخص)، ثمّ وساما الصورة القديمان عددين — المشاركاتُ
   * والشهاداتُ النافذة. وكانا لا يظهران لمن لم ينل شيئًا؛ والرقمُ هنا صفرٌ يميّز المشاركَ من غيره كما ميّزه غيابُ الوسام.
   */
  const figuresOf = (v: VolunteerRow): AdFigure[] => [
    { icon: <CalendarPlus />, label: "بداية التطوّع", value: v.appliedAt },
    { icon: <HandHeart />, label: "المشاركات", value: fmtNum(timesOf(v)) },
    { icon: <Certificate />, label: "الشهادات", value: fmtNum(v.certificates) },
  ];
  const face = (v: VolunteerRow) => ({ src: v.avatarUrl, gender: v.gender, name: v.name });

  return (
    <>
      <CollectionRoom<VolunteerRow>
        navPath={VOLUNTEERS_ROOM.navPath}
        title={VOLUNTEERS_ROOM.title}
        noun={AR_VOLUNTEER}
        items={rows}
        positions={POSITIONS}
        defaultPosition="active"
        searchPlaceholder="ابحث بالاسم أو الجوّال أو البريد…"
        // البحثُ يبلغ البريدَ والمدينةَ أيضًا كما في القديمة
        matchSearch={(v, q) => matchesSearch(q, v.name, v.phone, v.email, v.city)}
        filters={[
          // **بأيّ رغبة** لا بالأولى وحدها (بكلمة المالك ٢٠٢٦-٠٩-٢٤)
          {
            key: "committee", label: "الرغبة",
            options: committees.map((c) => ({ value: String(c.id), label: c.name })),
            match: (v, val) => v.prefs.some((p) => String(p.id) === val),
            // من جعلها رغبتَه الأولى أوّلًا ثمّ الثانية ثمّ الثالثة — كما كانت القديمةُ تقدّمهم (محمد ٢٠٢٦-١١-٠٣)
            rank: (v, val) => v.prefs.findIndex((p) => String(p.id) === val),
          },
        ]}
        viewKey={VOLUNTEERS_ROOM.viewKey}
        initialView={view}
        idOf={(v) => v.userId}
        table={{
          // الترتيبُ بالاسم وبالعددين من رؤوسها كجداول الغرف كلّها (لم يكن للغرفة القديمة جدول)
          head: "المتطوّع",
          headSortBy: (v) => v.name,
          stub: { key: "face", label: "", icon: <UserCircle /> },
          columns: [
            { key: "since", label: "بداية التطوّع", icon: <CalendarPlus /> },
            { key: "times", label: "المشاركات", icon: <HandHeart />, sortBy: timesOf },
            { key: "certs", label: "الشهادات", icon: <Certificate />, sortBy: (v) => v.certificates },
          ],
        }}
        emptyAll={{ title: "لا متطوّعين هنا", desc: "من قدّم للعضويّة ورتّب رغباته ظهر في هذا الكشف." }}
        renderCard={(v) => (
          <AdCard
            key={v.userId}
            seed={v.userId}
            face={face(v)}
            title={v.name}
            onOpen={() => setRecord(v)}
            meta={info(v)}
            figures={figuresOf(v)}
            foot={acts(v)}
          />
        )}
        renderRow={(v) => (
          <AdRow
            key={v.userId}
            face={face(v)}
            title={v.name}
            onOpen={() => setRecord(v)}
            sub={info(v)}
            cells={figuresOf(v).map((f) => ({ label: f.label, value: f.value }))}
            acts={acts(v, true)}
          />
        )}
      />

      {/* السجلُّ الكامل : نافذةُ الغرفة القديمة كما هي (بهيئة عرض الملفّ في تبويب الأعضاء) */}
      <Modal
        open={record !== null}
        onClose={() => setRecord(null)}
        title={record?.name ?? "السجلّ الكامل"}
        size="md"
        className="pvb-modal"
        hero={record ? <VolunteerHero v={record} /> : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setRecord(null)}>إغلاق</Button>}
      >
        {record ? <VolunteerRecord v={record} /> : null}
      </Modal>

      {/* الإهداءُ والإنهاء : نافذةُ الغرفة القديمة كما هي — فيها اللجنةُ أو السببُ، ولا يحمل `AdConfirm` حقلًا */}
      <Modal
        open={ask !== null}
        onClose={() => setAsk(null)}
        busy={busy !== null}
        title={ask?.kind === "grant" ? "إهداءُ العضويّة" : "إنهاءُ التطوّع"}
        description={
          ask?.kind === "grant"
            ? "يصير عضوًا في أدِيب ويُسنَد إلى لجنته، وينتهي تطوّعُه في الفعل نفسه."
            : "يبقى في السجلّ سابقًا بسببه المكتوب، ويُخرَج من قروب المتطوّعين."
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAsk(null)}>إلغاء</Button>
            <Button
              variant={ask?.kind === "grant" ? "primary" : "danger"} size="md"
              loading={busy !== null} onClick={confirm}
            >
              {ask?.kind === "grant" ? "إهداء" : "إنهاء"}
            </Button>
          </>
        }
      >
        {ask?.kind === "grant" ? (
          <Select
            label="اللجنة"
            options={committees.map((c) => ({ value: String(c.id), label: c.name }))}
            value={committee}
            onValueChange={setCommittee}
            helper="المقترحةُ رغبتُه الأولى، ولك أن تغيّرها."
            required
          />
        ) : (
          <Textarea
            label="السبب" icon={<PencilSimple />} innerIcon={<PencilSimple />}
            placeholder="يبقى في سجلّه" rows={3}
            value={reason} onChange={(e) => setReason(e.target.value)} required
          />
        )}
      </Modal>
    </>
  );
}
