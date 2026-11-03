"use client";

/**
 * غرفةُ أصدقاء أدِيب على قالب «قائمة السجلّات» بكرت الشخص (٢٠٢٦-١١-٠٣) — السلوكُ سلوكُ `friends/FriendsView.tsx` القديم وكرتِه
 * (`FriendCard.tsx`): البحثُ بالاسم والبريد والجوّال والمدينة، ومرشّحا البرنامج والحساب، وفتحُ حساب الصديق في نافذته (كلُّ برنامجٍ
 * قسمٌ، والبرنامجُ الذي لم يشارك فيه لا قسمَ له — نافذةُ الغرفة القديمة كما هي)، والمراسلةُ عبر واتساب لمن له جوّال وبالبريد.
 *
 * **والإحصاءُ القديم**: «صديقٌ لأدِيب» عددُ الكشف، و«لم يُكملوا ملفّهم» و«شارك في برنامج» يقولهما مرشّحُ الحساب بعدد النتائج
 * («لم يُكملوا ملفّهم»، «لم يشاركوا بعد»). ومخطّطا البرامج والجنس توزيعان لا حال: مكانُهما صفحةُ الإحصاء — ومعهما سقط إخفاءُ جنسٍ
 * من حلقته (كان يرشّح الكشف).
 */
import type { RoomView } from "../view";
import { FRIENDS_ROOM } from "./friends.meta";
import { useState } from "react";
import { Badge, Button, Modal, matchesSearch } from "@adeeb/design-system";
import {
  AddressBook, CalendarCheck, CalendarPlus, ChatCircle, ChatsCircle, ClipboardText, ClockCounterClockwise, Envelope, GameController,
  HandHeart, MapPin, Phone, Radio, SquaresFour, Ticket, Trophy, UserCircle, UserCircleDashed, UserMinus,
} from "@phosphor-icons/react";
import { waHref } from "@/lib/whatsapp";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import { Cell } from "@/app/dashboard/_components/Cell";
import { Section } from "@/app/dashboard/_components/Section";
import { lastParticipation } from "@/app/dashboard/friends/FriendCard";
import type { FriendRow, Program } from "@/app/dashboard/friends/data";
import type { ArForms } from "@/lib/arabicCount";
import { AdActs, AdBadge, AdCard, AdRow, type AdFigure, type AdMeta, type AdOp } from "../primitives";
import { CollectionRoom, type FilterDef, type Position } from "../collection";

const AR_FRIEND: ArForms = ["صديقٌ واحد", "صديقان", "أصدقاء", "صديقًا"];

/** أسماءُ البرامج وترتيبُها ومرشّحُ الحساب — من `FriendsView.tsx` القديم حرفًا (لا تُصدَّر منه، وهو باقٍ حتى يقرّر المالكُ حذفَه). */
const PROGRAM: Record<Program, string> = {
  // بأسمائها لا بأصنافها (المالك ٢٠٢٦-١٠-١٠): «الفعاليّات» وحدَها اسمُ قسمٍ أيضًا ولا تقول ما فعل الصديق
  events: "فعاليّات أدِيب", darb: "دربك خضر", surveys: "استبيانات أدِيب", radio: "إذاعة أدِيب", deebo: "ديبو",
};
const ORDER: Program[] = ["events", "darb", "surveys", "radio", "deebo"];
/**
 * **حالتا الحساب مواضعُ لا مرشّح** (محمد ٢٠٢٦-١١-٠٣، على قاعدة «حالاتُ السجلّ مواضع»): «لم يُكملوا ملفّهم» و«لم يشاركوا في أي برنامج» (كان «لم يشاركوا بعد» فلم يقل في ماذا) كانتا
 * خيارين في مرشّح «الحساب» مع «كانوا أعضاءً»، فصارتا موضعين بعدّهما. وبقيت الصلةُ بأدِيب مرشّحًا («الصلة»: كانوا أعضاءً، تطوّعوا
 * سابقًا — شارةُ الكرت نفسُها)؛ وخيارُها الثاني جديدٌ لأنّ مرشّحًا بخيارٍ واحدٍ يخفيه القالب.
 */
const POSITIONS: Position<FriendRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا أصدقاء بعد." },
  { key: "noprofile", label: "لم يُكملوا ملفّهم", match: (f) => !f.hasProfile, empty: "أكمل الجميعُ ملفّاتهم." },
  { key: "idle", label: "لم يشاركوا في أي برنامج", match: (f) => f.programs.length === 0, empty: "شارك الجميعُ في برنامجٍ واحدٍ على الأقلّ." },
];

const nf = (n: number) => n.toLocaleString("en-US");

const FILTERS: FilterDef<FriendRow>[] = [
  { key: "program", label: "البرنامج", options: ORDER.map((p) => ({ value: p, label: PROGRAM[p] })), match: (f, v) => f.programs.includes(v as Program) },
  {
    key: "rel", label: "الصلة",
    options: [{ value: "member", label: "كانوا أعضاءً" }, { value: "volunteer", label: "تطوّعوا سابقًا" }],
    match: (f, v) => (v === "member" ? f.wasMember : !f.wasMember && !!f.volunteeredBefore),
  },
];

/** `serverNow` يمرّره كلُّ مسارٍ على القالب؛ ولا وقتَ نسبيًّا يُعرض في الأصدقاء فلا يُقرأ هنا. */
export function FriendsRoom({ rows, view }: { rows: FriendRow[]; serverNow: number; view?: RoomView }) {
  const [open, setOpen] = useState<FriendRow | null>(null);

  /** الأساسيُّ فتحُ الحساب (وجهةُ النقر على الصفّ وأوّلُ القائمة القديمة، «عرض الحساب»)، ثمّ المراسلةُ بترتيب القائمة القديمة. */
  const ops = (f: FriendRow): AdOp[] => [
    ...(f.phone ? [{ key: "wa", label: "مراسلة عبر واتساب", icon: <ChatCircle />, onClick: () => window.open(waHref(f.phone!), "_blank", "noopener") }] : []),
    ...(f.email ? [{ key: "mail", label: "مراسلة بالبريد", icon: <Envelope />, onClick: () => { window.location.href = `mailto:${f.email}`; } }] : []),
  ];
  const acts = (f: FriendRow, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "افتح الحساب", icon: <UserCircle />, onClick: () => setOpen(f) }} ops={ops(f)} />
  );

  /**
   * **موقعُه شارةً تحت اسمه: صلتُه بأدِيب** (عمودُ «صلته بأدِيب» في الجدول القديم، ووسامُ «كان عضوًا» تحت صورة الكرت) — وإلّا
   * «صديق أدِيب». **ولكلّ كرتٍ شارتُه** (محمد ٢٠٢٦-١١-٠٣): حُذفت «صديق أدِيب» يومًا لأنّها تكرّر العنوان، فصارت الكروتُ بشارةٍ وبلا شارةٍ
   * متجاورةً بلا نسق. وتختلف عن مقعد «أعضاء الإدارة» (شارةٌ واحدةٌ على الكلّ = ضجيج): هنا الشارةُ تصنّف، و«صديق أدِيب» تعني «لا صلةَ
   * سابقة». ومعها «لم يُكمل ملفّه» لمن لم يُكمله (وسامُ الكرت القديم). بلا لون: الصلةُ حقيقةٌ لا حال.
   */
  const chips = (f: FriendRow) => (
    <>
      {f.wasMember ? <AdBadge icon={<UserMinus />}>كان عضوًا</AdBadge>
        : f.volunteeredBefore ? <AdBadge icon={<HandHeart />}>تطوّع سابقًا</AdBadge>
        : <AdBadge>{f.gender === "female" ? "صديقة أدِيب" : "صديق أدِيب"}</AdBadge>}
      {!f.hasProfile && <AdBadge icon={<UserCircleDashed />}>لم يُكمل ملفّه</AdBadge>}
    </>
  );

  /**
   * **السطورُ ثابتةٌ في كلّ كرت** (المالك ٢٠٢٦-١٠-١٠: «أريد توحيدها»)، والفارغُ منها يُقال بلونٍ خافت — بترتيب صفوف الكرت القديم:
   * آخرُ مشاركة، والبرامجُ بعمقها، والجوّال؛ ثمّ البريدُ (سطرُ تواصلٍ على نمط كرت الشخص، ما لم يكن هو العنوانَ لمن لا اسمَ له)،
   * والمدينةُ لمن كتبها (كانت تحت الاسم في الجدول القديم).
   */
  const info = (f: FriendRow): AdMeta[] => {
    const last = lastParticipation(f, PROGRAM);
    const took = f.programs.map((p) => (f.depth[p] ? `${PROGRAM[p]} (${f.depth[p]})` : PROGRAM[p])).join("، ");
    return [
      last ? { icon: <ClockCounterClockwise />, text: last, clip: true } : { icon: <ClockCounterClockwise />, text: "لم يشارك بعد", tone: "muted" },
      took
        ? { icon: <SquaresFour />, text: `${f.gender === "female" ? "شاركت" : "شارك"} في ${took}`, clip: true }
        : { icon: <SquaresFour />, text: "لا برامج بعد", tone: "muted" },
      f.phone ? { icon: <Phone />, text: f.phone, ltr: true } : { icon: <Phone />, text: "الجوّال غير مسجَّل", tone: "muted" },
      ...(f.name && f.email ? [{ icon: <Envelope />, text: f.email, ltr: true }] : []),
      ...(f.city ? [{ icon: <MapPin />, text: f.city }] : []),
    ];
  };

  /** رقمُ الكرت = عمودُ السطر: «في أدِيب منذ» شهرَ حسابه وسنتَه (أسفلُ جنب الكرت القديم) — رقمُ «الانضمام» في كرت الشخص. */
  const figuresOf = (f: FriendRow): AdFigure[] => [{ icon: <CalendarPlus />, label: "في أدِيب منذ", value: f.since || "غير معروف" }];
  const face = (f: FriendRow) => ({ gender: f.gender, name: f.name ?? f.email });

  return (
    <>
      <CollectionRoom<FriendRow>
        navPath={FRIENDS_ROOM.navPath}
        title={FRIENDS_ROOM.title}
        noun={AR_FRIEND}
        items={rows}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث بالاسم أو الجوّال أو البريد…"
        matchSearch={(f, q) => matchesSearch(q, f.name, f.email, f.phone, f.city)}
        filters={FILTERS}
        viewKey={FRIENDS_ROOM.viewKey}
        initialView={view}
        idOf={(f) => f.id}
        table={{
          // الترتيبُ بالاسم وبتاريخ الحساب من رأسيهما كجداول الغرف كلّها (لم يكن في الجدول القديم)
          head: "الصديق",
          headSortBy: (f) => f.name ?? f.email,
          stub: { key: "face", label: "", icon: <UserCircle /> },
          columns: [{ key: "since", label: "في أدِيب منذ", icon: <CalendarPlus />, sortBy: (f) => (f.sinceRaw ? +new Date(f.sinceRaw) : 0) }],
        }}
        emptyAll={{ title: "لا أصدقاء بعد", desc: "من فتح حسابًا في أدِيب بلا عضويّةٍ ولا تطوّع ظهر هنا." }}
        renderCard={(f) => (
          <AdCard
            key={f.id}
            seed={f.id}
            face={face(f)}
            chips={chips(f)}
            title={f.name ?? f.email}
            onOpen={() => setOpen(f)}
            meta={info(f)}
            figures={figuresOf(f)}
            foot={acts(f)}
          />
        )}
        renderRow={(f) => (
          <AdRow
            key={f.id}
            face={face(f)}
            title={f.name ?? f.email}
            onOpen={() => setOpen(f)}
            badge={chips(f)}
            sub={info(f)}
            cells={figuresOf(f).map((x) => ({ label: x.label, value: x.value }))}
            acts={acts(f, true)}
          />
        )}
      />

      {/* نافذةُ الحساب: كلُّ برنامجٍ قسمٌ، والبرنامجُ الذي لم يشارك فيه لا قسمَ له — نافذةُ الغرفة القديمة كما هي */}
      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? (open.name ?? open.email) : "حساب صديق"}
        size="sm"
        className="pvb-modal"
        hero={open ? <Avatar name={open.name ?? open.email} gender={open.gender} size="2xl" className="pvb-av" icon={open.hasProfile ? undefined : <UserCircleDashed />} /> : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setOpen(null)}>إغلاق</Button>}
      >
        {open ? (
          <>
            <div className="pvb-head">
              <div className="pvb-name">{open.name ?? <span className="lat" dir="ltr">{open.email}</span>}</div>
              <div className="pvb-role">{open.hasProfile ? (open.gender === "female" ? "صديقة أدِيب" : "صديق أدِيب") : "صديق أدِيب، لم يُكمل ملفّه"}</div>
              {open.wasMember || open.volunteeredBefore ? (
                <div className="pvb-badges">
                  {open.wasMember ? <Badge tone="neutral" variant="soft">كان عضوًا</Badge> : <Badge tone="info" variant="soft">تطوّع سابقًا</Badge>}
                </div>
              ) : null}
            </div>
            <div className="pva-sections">
              <Section icon={<AddressBook />} title="بيانات التواصل">
                <Cell full lat label="البريد الإلكترونيّ" icon={<Envelope />} value={open.email || null} />
                {open.phone ? <Cell full lat label="رقم الجوّال" icon={<Phone />} value={open.phone} href={waHref(open.phone)} /> : null}
              </Section>
              {open.events ? (
                <Section icon={<Ticket />} title={PROGRAM.events}>
                  <Cell noCopy label="حجوزات" icon={<Ticket />} value={nf(open.events.booked)} />
                  <Cell noCopy label="حضور" icon={<CalendarCheck />} value={nf(open.events.attended)} />
                  {open.events.lastAttended ? <Cell full noCopy label="آخر حضور" icon={<CalendarCheck />} value={open.events.lastAttended} /> : null}
                </Section>
              ) : null}
              {open.darb ? (
                <Section icon={<GameController />} title="دربك خضر">
                  <Cell noCopy label="اللقب" icon={<GameController />} value={open.darb.nickname || null} />
                  <Cell noCopy label="أبعد مسافة" icon={<Trophy />} value={`${nf(open.darb.best)} م`} />
                  <Cell noCopy label="عدد الجولات" icon={<GameController />} value={nf(open.darb.runs)} />
                  <Cell noCopy label="التمر" icon={<Trophy />} value={nf(open.darb.tamr)} />
                </Section>
              ) : null}
              {open.radio ? (
                <Section icon={<Radio />} title={PROGRAM.radio}>
                  <Cell full noCopy wrap label="يتابع" icon={<Radio />} value={open.radio.join("، ")} />
                </Section>
              ) : null}
              {open.surveys ? (
                <Section icon={<ClipboardText />} title={PROGRAM.surveys}>
                  <Cell full noCopy label="استبياناتٌ أجاب عنها" icon={<ClipboardText />} value={nf(open.surveys)} />
                </Section>
              ) : null}
              {open.deebo ? (
                <Section icon={<ChatsCircle />} title="ديبو">
                  <Cell full noCopy label="محادثاتٌ محفوظة" icon={<ChatsCircle />} value={nf(open.deebo)} />
                </Section>
              ) : null}
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
