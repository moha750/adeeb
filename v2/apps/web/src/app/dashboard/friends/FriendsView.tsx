"use client";

import { useMemo, useState } from "react";
import { Badge, BarList, Button, Donut, Modal, SectionCard, Stat, matchesSearch } from "@adeeb/design-system";
import {
  AddressBook, CalendarCheck, ChatCircle, ChatsCircle, ClipboardText, Envelope, GameController, Phone, Radio,
  SquaresFour, Ticket, Trophy, UserCircleDashed, Users, UsersThree,
} from "@phosphor-icons/react";
import { Eye, MagnifyingGlass } from "@/app/_components/glyphs";
import { waHref } from "@/lib/whatsapp";
import { DataTable, type Column } from "../_components/DataTable";
import type { MenuGroup } from "../_components/DropdownMenu";
import { Avatar } from "../_components/Avatar";
import { Cell } from "../_components/Cell";
import { Section } from "../_components/Section";
import { StatsScope } from "../_components/StatsScope";
import { Toolbar } from "../_components/Toolbar";
import { Pagination } from "../_components/Pagination";
import { EmptyState } from "../_components/EmptyState";
import { PageHeader } from "../_components/PageHeader";
import type { FriendRow, Program } from "./data";

/**
 * **أصدقاء أدِيب** — أُقرّ شكلُه في `/ui/friends` (المالك ٢٠٢٦-١٠-٠٩).
 *
 * الصديقُ يُقرأ ببرامج أدِيب كلّها لا بالفعاليّات وحدها: الكشفُ يقول في أيّ البرامج هو، وتفصيلُ كلّ
 * برنامجٍ في نافذة حسابه، والبرنامجُ الذي لم يشارك فيه لا قسمَ له. ومن لا ملفَّ له يظهر ببريده.
 * والإذاعةُ تُعرف بالمتابعة: الاستماعُ يُسجَّل بالجهاز لا بالحساب.
 */

const PROGRAM: Record<Program, string> = {
  events: "الفعاليّات", darb: "دربك خضر", surveys: "الاستبيانات", radio: "الإذاعة", deebo: "ديبو",
};
const ORDER: Program[] = ["events", "darb", "surveys", "radio", "deebo"];
const UNIT = { one: "صديق", two: "صديقان", few: "أصدقاء" };
const GENDERS = ["فتيات", "شباب", "غير محدّد"] as const;
const genderOf = (f: FriendRow) => (f.gender === "female" ? "فتيات" : f.gender === "male" ? "شباب" : "غير محدّد");

type Rel = "" | "member" | "noprofile" | "idle";
const REL_LABEL: Record<Exclude<Rel, "">, string> = { member: "كانوا أعضاءً", noprofile: "بلا ملف", idle: "لم يشاركوا بعد" };
const relOk = (f: FriendRow, rel: Rel) =>
  !rel || (rel === "member" ? f.wasMember : rel === "noprofile" ? !f.hasProfile : f.programs.length === 0);

const nf = (n: number) => n.toLocaleString("en-US");

const columns: Column<FriendRow>[] = [
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
    render: (f) => (f.programs.length
      ? <span className="flex flex-wrap gap-1">{f.programs.map((p) => <Badge key={p} tone="info" variant="soft">{PROGRAM[p]}</Badge>)}</span>
      : <span className="txt na">لم يشارك بعد</span>),
  },
  { key: "last", header: "آخر نشاط", width: "1.1fr", render: (f) => <span className="txt">{f.lastActive}</span> },
  {
    key: "rel", header: "صلته بأدِيب", width: "1fr",
    render: (f) => (f.wasMember
      ? <Badge tone="neutral" variant="soft">كان عضوًا</Badge>
      : f.volunteeredBefore ? <Badge tone="info" variant="soft">تطوّع سابقًا</Badge> : <span className="txt na">صديق</span>),
  },
];

export function FriendsView({ rows }: { rows: FriendRow[] }) {
  const [search, setSearch] = useState("");
  const [program, setProgram] = useState<"" | Program>("");
  const [rel, setRel] = useState<Rel>("");
  const [hiddenGender, setHiddenGender] = useState<string[]>([]);
  const [open, setOpen] = useState<FriendRow | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // القاعدة ١٧: الأرقامُ تسمع المرشِّحاتِ والحلقة ولا تسمع البحث، وكلُّ كرتٍ لا يسمع بُعدَه
  const scope = useMemo(
    () => rows.filter((f) => (!program || f.programs.includes(program)) && relOk(f, rel) && !hiddenGender.includes(genderOf(f))),
    [rows, program, rel, hiddenGender],
  );
  const butProgram = useMemo(() => rows.filter((f) => relOk(f, rel) && !hiddenGender.includes(genderOf(f))), [rows, rel, hiddenGender]);
  const butGender = useMemo(() => rows.filter((f) => (!program || f.programs.includes(program)) && relOk(f, rel)), [rows, program, rel]);

  const byProgram = ORDER
    .map((p) => ({ label: PROGRAM[p], value: butProgram.filter((f) => f.programs.includes(p)).length }))
    .filter((x) => x.value > 0);
  const genders = GENDERS.map((g) => ({ label: g as string, value: butGender.filter((f) => genderOf(f) === g).length })).filter((g) => g.value > 0);

  const shown = useMemo(() => scope.filter((f) => matchesSearch(search, f.name, f.email, f.phone, f.city)), [scope, search]);
  const totalPages = Math.max(1, Math.ceil(shown.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = shown.slice((safePage - 1) * pageSize, safePage * pageSize);

  // كلُّ تغييرٍ في النطاق يعود إلى الصفحة الأولى، في موضع التغيير نفسِه لا بأثرٍ يلحقه
  const clearAll = () => { setProgram(""); setRel(""); setHiddenGender([]); setPage(1); };
  const onGender = (g: string[]) => { setHiddenGender(g); setPage(1); };

  const actions = (f: FriendRow): MenuGroup[] => [{
    items: [
      { label: "عرض الحساب", icon: <Eye />, onSelect: () => setOpen(f) },
      ...(f.phone ? [{ label: "مراسلة عبر واتساب", icon: <ChatCircle />, onSelect: () => window.open(waHref(f.phone!), "_blank", "noopener") }] : []),
      ...(f.email ? [{ label: "مراسلة بالبريد", icon: <Envelope />, onSelect: () => { window.location.href = `mailto:${f.email}`; } }] : []),
    ],
  }];

  const emptyState = search || program || rel || hiddenGender.length ? (
    <EmptyState
      variant="soft"
      icon={<MagnifyingGlass />}
      title="لا نتيجةَ تطابق طلبك"
      description="لم يطابق بحثُك ولا تصفيتُك أحدًا."
      action={<Button variant="ghost" size="sm" onClick={() => { setSearch(""); clearAll(); }}>مسحُ البحث والتصفية</Button>}
    />
  ) : (
    <EmptyState variant="soft" icon={<UsersThree />} title="لا أصدقاء بعد" description="من فتح حسابًا في أدِيب بلا عضويّةٍ ولا تطوّع ظهر هنا." />
  );

  return (
    <>
      <PageHeader title="أصدقاء أدِيب" />

      <StatsScope
        labels={[
          program ? PROGRAM[program] : null,
          rel ? REL_LABEL[rel] : null,
          hiddenGender.length ? `بلا ${hiddenGender.join("، ")}` : null,
        ]}
        onClear={clearAll}
      />

      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<UsersThree />} value={scope.length} label="صديقٌ لأدِيب" />
        <Stat icon={<SquaresFour />} value={scope.filter((f) => f.programs.length > 0).length} label="شارك في برنامج أدِيب" tone="success" />
        <Stat icon={<UserCircleDashed />} value={scope.filter((f) => !f.hasProfile).length} label="بلا ملف" />
      </div>

      <div className="st-grid2" style={{ marginBottom: 18 }}>
        <SectionCard title="برامج أدِيب" icon={<SquaresFour />}>
          <BarList items={byProgram} total={butProgram.length} unit={UNIT} empty="لم يشارك أحدٌ في هذا الكشف." />
        </SectionCard>
        <SectionCard title="الجنس" icon={<Users />}>
          <Donut items={genders} unit={UNIT} stack hidden={hiddenGender} onHiddenChange={onGender} empty="لا أصدقاء في هذا الكشف." />
        </SectionCard>
      </div>

      <Toolbar
        searchPlaceholder="اسم أو جوّال أو بريد"
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: "program", label: "البرنامج", options: ORDER.map((p) => ({ value: p, label: PROGRAM[p] })) },
          { key: "rel", label: "الحساب", options: (Object.keys(REL_LABEL) as Exclude<Rel, "">[]).map((k) => ({ value: k, label: REL_LABEL[k] })) },
        ]}
        filterValues={{ program, rel }}
        onFilter={(k, v) => { if (k === "program") setProgram(v as "" | Program); else setRel(v as Rel); setPage(1); }}
        onReset={clearAll}
      />

      <DataTable
        columns={columns}
        rows={pageRows}
        getRowId={(f) => f.id}
        rowActions={actions}
        onRowClick={(f) => setOpen(f)}
        emptyState={emptyState}
        footer={shown.length ? (
          <Pagination page={safePage} pageSize={pageSize} total={shown.length} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} noun="صديق" />
        ) : undefined}
      />

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
              <div className="pvb-role">{open.hasProfile ? (open.gender === "female" ? "صديقة أدِيب" : "صديق أدِيب") : "صاحب حساب بلا ملف"}</div>
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
                <Section icon={<Ticket />} title="الفعاليّات">
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
                <Section icon={<Radio />} title="الإذاعة">
                  <Cell full noCopy wrap label="يتابع" icon={<Radio />} value={open.radio.join("، ")} />
                </Section>
              ) : null}
              {open.surveys ? (
                <Section icon={<ClipboardText />} title="الاستبيانات">
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
