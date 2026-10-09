"use client";

import { useMemo, useState } from "react";
import { Badge, BarList, Button, Container, Donut, Modal, SectionCard, Stat } from "@adeeb/design-system";
import {
  AddressBook, CalendarCheck, ChatCircle, ChatsCircle, ClipboardText, Envelope, GameController, Phone, Radio,
  SquaresFour, Ticket, Trophy, UserCircleDashed, Users, UsersThree,
} from "@phosphor-icons/react";
import { Eye } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../dashboard/_components/DataTable";
import type { MenuGroup } from "../../dashboard/_components/DropdownMenu";
import { Avatar } from "../../dashboard/_components/Avatar";
import { Cell } from "../../dashboard/_components/Cell";
import { Section } from "../../dashboard/_components/Section";
import { StatsScope } from "../../dashboard/_components/StatsScope";
import { Toolbar } from "../../dashboard/_components/Toolbar";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";

/**
 * **معاينةُ تبويب «أصدقاء أدِيب»** (المالك ٢٠٢٦-١٠-٠٩، للرئاسة وحدها).
 *
 * الصديقُ كلُّ صاحب حسابٍ ليس عضوًا ولا متطوّعًا، **أكمل ملفَّه أو لم يُكمله**: من لا ملفَّ له يظهر ببريده
 * وعلامة «بلا ملف» (قرار المالك). والصديقُ يُقرأ ببرامج أدِيب كلّها لا بالفعاليّات وحدها (اعتراضُ
 * المالك على المعاينة الأولى): الكشفُ يقول **في أيّ البرامج هو**، وتفصيلُ كلّ برنامجٍ في نافذة حسابه.
 * والإذاعةُ تُعرَف بالمتابعة لا بالاستماع: الاستماعُ لا يُسجَّل باسم أحد.
 *
 * الأسماءُ والأرقامُ والجوّالاتُ والعناوينُ مخترَعة: `/ui` صفحةٌ عامّة.
 */

type Program = "events" | "darb" | "radio" | "surveys" | "deebo";
const PROGRAM: Record<Program, string> = {
  events: "الفعاليّات", darb: "دربك خضر", radio: "الإذاعة", surveys: "الاستبيانات", deebo: "ديبو",
};
const ORDER: Program[] = ["events", "darb", "surveys", "radio", "deebo"];

type Friend = {
  id: string;
  name: string | null; email: string; phone: string | null; gender: "male" | "female" | null; city: string | null;
  wasMember: boolean; volunteeredBefore: boolean; lastActive: string;
  events?: { booked: number; attended: number; last: string | null };
  darb?: { nickname: string; best: number; runs: number; tamr: number };
  radio?: string[];
  surveys?: number;
  deebo?: number;
};

const FRIENDS: Friend[] = [
  { id: "1", name: "لمى خالد السبيعي", email: "lama@example.com", phone: "0500000101", gender: "female", city: "الأحساء", wasMember: false, volunteeredBefore: false, lastActive: "12 سبتمبر 2026", events: { booked: 3, attended: 2, last: "12 سبتمبر 2026" }, surveys: 2 },
  { id: "2", name: "نورة سعد الهاجري", email: "noura@example.com", phone: "0500000102", gender: "female", city: "الهفوف", wasMember: true, volunteeredBefore: false, lastActive: "28 أغسطس 2026", events: { booked: 2, attended: 1, last: "28 أغسطس 2026" } },
  { id: "3", name: null, email: "runner.falcon@example.com", phone: null, gender: null, city: null, wasMember: false, volunteeredBefore: false, lastActive: "23 سبتمبر 2026", darb: { nickname: "صقر الأحساء", best: 1840, runs: 37, tamr: 212 } },
  { id: "4", name: "عبد الله فهد المري", email: "abdullah@example.com", phone: "0500000104", gender: "male", city: "المبرز", wasMember: false, volunteeredBefore: false, lastActive: "1 أكتوبر 2026", events: { booked: 1, attended: 1, last: "5 مايو 2026" }, darb: { nickname: "برق", best: 920, runs: 11, tamr: 64 }, radio: ["منعطف"] },
  { id: "5", name: "رغد سامي البقمي", email: "raghad@example.com", phone: "0500000105", gender: "female", city: "الأحساء", wasMember: false, volunteeredBefore: true, lastActive: "3 أكتوبر 2026", events: { booked: 4, attended: 3, last: "3 أكتوبر 2026" }, surveys: 1, deebo: 3 },
  { id: "6", name: null, email: "night.star@example.com", phone: null, gender: null, city: null, wasMember: false, volunteeredBefore: false, lastActive: "20 سبتمبر 2026", darb: { nickname: "نجم الشرقية", best: 610, runs: 6, tamr: 31 } },
  { id: "7", name: "سارة تركي الدوسري", email: "sara@example.com", phone: "0500000107", gender: "female", city: "الدمام", wasMember: false, volunteeredBefore: false, lastActive: "14 أغسطس 2026", events: { booked: 1, attended: 0, last: null } },
  { id: "8", name: "يزن عادل الحربي", email: "yazan@example.com", phone: "0500000108", gender: "male", city: "الهفوف", wasMember: true, volunteeredBefore: false, lastActive: "7 أغسطس 2026" },
  { id: "9", name: "ريم ناصر القحطاني", email: "reem@example.com", phone: "0500000109", gender: "female", city: "الأحساء", wasMember: false, volunteeredBefore: false, lastActive: "30 سبتمبر 2026", surveys: 3, radio: ["منعطف", "مُخلّدات"] },
  { id: "10", name: null, email: "hello.world@example.com", phone: null, gender: null, city: null, wasMember: false, volunteeredBefore: false, lastActive: "2 يونيو 2026" },
  { id: "11", name: "دانة عمر الغامدي", email: "dana@example.com", phone: "0500000111", gender: "female", city: "الأحساء", wasMember: false, volunteeredBefore: false, lastActive: "2 مايو 2026", events: { booked: 1, attended: 1, last: "2 مايو 2026" } },
  { id: "12", name: "فيصل منصور العتيبي", email: "faisal@example.com", phone: "0500000112", gender: "male", city: "المبرز", wasMember: true, volunteeredBefore: false, lastActive: "14 مايو 2026", events: { booked: 1, attended: 1, last: "14 مايو 2026" }, deebo: 1 },
];

const programsOf = (f: Friend): Program[] => ORDER.filter((p) => f[p] != null && !(Array.isArray(f[p]) && (f[p] as unknown[]).length === 0));
const UNIT = { one: "صديق", two: "صديقان", few: "أصدقاء" };
const GENDER_LABEL = (f: Friend) => (f.gender === "female" ? "فتيات" : f.gender === "male" ? "شباب" : "غير محدّد");

const cols: Column<Friend>[] = [
  {
    key: "who", header: "الصديق", width: "minmax(240px, 2.2fr)",
    render: (f) => (
      <div className="dt-mem">
        <Avatar name={f.name ?? f.email} gender={f.gender} size="sm" />
        <span className="dt-mm">
          <b>{f.name ?? <span className="lat" dir="ltr">{f.email}</span>}</b>
          <span>{f.name ? (f.city ?? "غير متوفّر") : "بلا ملف"}</span>
        </span>
      </div>
    ),
  },
  {
    key: "programs", header: "البرامج", width: "minmax(200px, 2fr)", wrap: true,
    render: (f) => {
      const ps = programsOf(f);
      return ps.length
        ? <span className="flex flex-wrap gap-1">{ps.map((p) => <Badge key={p} tone="info" variant="soft">{PROGRAM[p]}</Badge>)}</span>
        : <span className="txt na">لم يشارك بعد</span>;
    },
  },
  { key: "last", header: "آخر نشاط", width: "1.1fr", render: (f) => <span className="txt">{f.lastActive}</span> },
  {
    key: "rel", header: "صلته بأدِيب", width: "1fr",
    render: (f) => (f.wasMember
      ? <Badge tone="neutral" variant="soft">كان عضوًا</Badge>
      : f.volunteeredBefore ? <Badge tone="info" variant="soft">تطوّع سابقًا</Badge> : <span className="txt na">صديق</span>),
  },
];

// الخليّةُ تنسخ وتُعلن بالإشعار، فالصفحةُ تحت مزوّد الإشعارات كشاشة اللوحة
export default function FriendsPreviewPage() {
  return <ToastProvider><FriendsPreview /></ToastProvider>;
}

function FriendsPreview() {
  const [q, setQ] = useState("");
  const [program, setProgram] = useState("");
  const [rel, setRel] = useState("");
  const [hiddenGender, setHiddenGender] = useState<string[]>([]);
  const [open, setOpen] = useState<Friend | null>(null);

  // النطاق: المرشِّحات والحلقة؛ والبحثُ يضيّق الكشفَ وحده (القاعدة ١٧)
  const scope = useMemo(() => FRIENDS.filter((f) =>
    (!program || programsOf(f).includes(program as Program))
    && (!rel || (rel === "member" ? f.wasMember : rel === "noprofile" ? !f.name : rel === "idle" ? programsOf(f).length === 0 : true))
    && !hiddenGender.includes(GENDER_LABEL(f))), [program, rel, hiddenGender]);
  const shown = scope.filter((f) => !q.trim() || (f.name ?? "").includes(q.trim()) || f.email.includes(q.trim()) || (f.phone ?? "").includes(q.trim()));

  // كرتُ البرامج موضوعُه البرنامجُ نفسُه، فلا يسمع مرشِّحَه (القاعدة ١٧، حدُّ البُعد)
  const butProgram = FRIENDS.filter((f) =>
    (!rel || (rel === "member" ? f.wasMember : rel === "noprofile" ? !f.name : rel === "idle" ? programsOf(f).length === 0 : true))
    && !hiddenGender.includes(GENDER_LABEL(f)));
  const byProgram = ORDER.map((p) => ({ label: PROGRAM[p], value: butProgram.filter((f) => programsOf(f).includes(p)).length })).filter((x) => x.value > 0);
  const genders = (["فتيات", "شباب", "غير محدّد"] as const)
    .map((g) => ({ label: g, value: FRIENDS.filter((f) => GENDER_LABEL(f) === g && (!program || programsOf(f).includes(program as Program))).length }))
    .filter((g) => g.value > 0);

  const actions = (f: Friend): MenuGroup[] => [{
    items: [
      { label: "عرض الحساب", icon: <Eye />, onSelect: () => setOpen(f) },
      ...(f.phone ? [{ label: "مراسلة عبر واتساب", icon: <ChatCircle /> }] : []),
      { label: "مراسلة بالبريد", icon: <Envelope /> },
    ],
  }];

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Dashboard, Friends</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أصدقاء أدِيب</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          للرئاسة وحدها. كلُّ صاحب حسابٍ ليس عضوًا ولا متطوّعًا، ومن لا ملفَّ له يظهر ببريده. افتح حسابَ صديقٍ لترى تفصيلَ
          كلّ برنامجٍ شارك فيه. الأسماءُ والأرقامُ مخترَعة.
        </p>

        {/* بلا إطارٍ حاضن: الكروتُ والجدولُ سطوحٌ مؤطَّرة (القاعدة ١٢) */}
        <section className="mt-10">
          <h2 className="font-display text-2xl font-black text-content" style={{ marginBottom: 16 }}>أصدقاء أدِيب</h2>

          <StatsScope
            labels={[
              program ? PROGRAM[program as Program] : null,
              rel === "member" ? "كانوا أعضاءً" : rel === "noprofile" ? "بلا ملف" : rel === "idle" ? "لم يشاركوا بعد" : null,
              hiddenGender.length ? `بلا ${hiddenGender.join("، ")}` : null,
            ]}
            onClear={() => { setProgram(""); setRel(""); setHiddenGender([]); }}
          />

          <div className="stat-grid" style={{ marginBottom: 18 }}>
            <Stat icon={<UsersThree />} value={scope.length} label="صديقٌ لأدِيب" />
            <Stat icon={<SquaresFour />} value={scope.filter((f) => programsOf(f).length > 0).length} label="شارك في برنامج أدِيب" tone="success" />
            <Stat icon={<UserCircleDashed />} value={scope.filter((f) => !f.name).length} label="بلا ملف" />
          </div>

          <div className="st-grid2" style={{ marginBottom: 18 }}>
            <SectionCard title="برامج أدِيب" icon={<SquaresFour />}>
              <BarList items={byProgram} total={butProgram.length} unit={UNIT} empty="لم يشارك أحدٌ في هذا الكشف." />
            </SectionCard>
            <SectionCard title="الجنس" icon={<Users />}>
              <Donut items={genders} unit={UNIT} stack hidden={hiddenGender} onHiddenChange={setHiddenGender} />
            </SectionCard>
          </div>

          <Toolbar
            searchPlaceholder="اسم أو جوّال أو بريد"
            search={q}
            onSearch={setQ}
            filters={[
              { key: "program", label: "البرنامج", options: ORDER.map((p) => ({ value: p, label: PROGRAM[p] })) },
              { key: "rel", label: "الحساب", options: [
                { value: "member", label: "كانوا أعضاءً" }, { value: "noprofile", label: "بلا ملف" }, { value: "idle", label: "لم يشاركوا بعد" },
              ] },
            ]}
            filterValues={{ program, rel }}
            onFilter={(k, v) => (k === "program" ? setProgram(v) : setRel(v))}
            onReset={() => { setProgram(""); setRel(""); }}
          />

          <DataTable columns={cols} rows={shown} getRowId={(f) => f.id} rowActions={actions} onRowClick={(f) => setOpen(f)} />
        </section>
      </Container>

      {/* نافذةُ الحساب: كلُّ برنامجٍ قسمٌ، والبرنامجُ الذي لم يشارك فيه لا قسمَ له */}
      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? (open.name ?? open.email) : "حساب صديق"}
        size="sm"
        className="pvb-modal"
        hero={open ? <Avatar name={open.name ?? open.email} gender={open.gender} size="2xl" className="pvb-av" /> : undefined}
        footer={<Button variant="ghost" size="md" onClick={() => setOpen(null)}>إغلاق</Button>}
      >
        {open ? (
          <>
            <div className="pvb-head">
              <div className="pvb-name">{open.name ?? <span className="lat" dir="ltr">{open.email}</span>}</div>
              <div className="pvb-role">{open.name ? (open.gender === "male" ? "صديق أدِيب" : "صديقة أدِيب") : "صاحب حساب بلا ملف"}</div>
              {open.wasMember ? <div className="pvb-badges"><Badge tone="neutral" variant="soft">كان عضوًا</Badge></div> : null}
            </div>
            <div className="pva-sections">
              <Section icon={<AddressBook />} title="بيانات التواصل">
                <Cell full lat label="البريد الإلكترونيّ" icon={<Envelope />} value={open.email} />
                {open.phone ? <Cell full lat label="رقم الجوّال" icon={<Phone />} value={open.phone} /> : null}
              </Section>
              {open.events ? (
                <Section icon={<Ticket />} title="الفعاليّات">
                  <Cell noCopy label="حجوزات" icon={<Ticket />} value={String(open.events.booked)} />
                  <Cell noCopy label="حضور" icon={<CalendarCheck />} value={String(open.events.attended)} />
                  <Cell full noCopy label="آخر حضور" icon={<CalendarCheck />} value={open.events.last} />
                </Section>
              ) : null}
              {open.darb ? (
                <Section icon={<GameController />} title="دربك خضر">
                  <Cell noCopy label="اللقب" icon={<GameController />} value={open.darb.nickname} />
                  <Cell noCopy label="أبعد مسافة" icon={<Trophy />} value={`${open.darb.best} م`} />
                  <Cell noCopy label="عدد الجولات" icon={<GameController />} value={String(open.darb.runs)} />
                  <Cell noCopy label="التمر" icon={<Trophy />} value={String(open.darb.tamr)} />
                </Section>
              ) : null}
              {open.radio?.length ? (
                <Section icon={<Radio />} title="الإذاعة">
                  <Cell full noCopy label="يتابع" icon={<Radio />} value={open.radio.join("، ")} />
                </Section>
              ) : null}
              {open.surveys ? (
                <Section icon={<ClipboardText />} title="الاستبيانات">
                  <Cell full noCopy label="استبياناتٌ أجاب عنها" icon={<ClipboardText />} value={String(open.surveys)} />
                </Section>
              ) : null}
              {open.deebo ? (
                <Section icon={<ChatsCircle />} title="ديبو">
                  <Cell full noCopy label="محادثاتٌ محفوظة" icon={<ChatsCircle />} value={String(open.deebo)} />
                </Section>
              ) : null}
            </div>
          </>
        ) : null}
      </Modal>
    </main>
  );
}
