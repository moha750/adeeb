"use client";

import { useState } from "react";
import { Badge, Container } from "@adeeb/design-system";
import { Envelope, WarningOctagon } from "@phosphor-icons/react";
import { Eye, PencilSimple, Trash } from "@/app/_components/glyphs";
import { DataTable, type Column, type Group } from "../../dashboard/_components/DataTable";
import { DataCards, type CardSpec, type CardVariant } from "../../dashboard/_components/DataCards";
import type { MenuGroup } from "../../dashboard/_components/DropdownMenu";
import { Avatar } from "../../dashboard/_components/Avatar";
import { Toolbar, type ViewMode } from "../../dashboard/_components/Toolbar";

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-6">
      <h2 className="mb-3 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}
function Note({ children }: { children: React.ReactNode }) {
  return <p className="mb-6 max-w-[70ch] text-sm leading-7 text-content-muted">{children}</p>;
}
function Lab({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.16em] text-content-muted">{children}</p>;
}

/* ══ بيانةُ رسائل التواصل: صفٌّ نصُّه هو خبرُه (نظير `ContactRow`) ══════════════ */

type MsgStatus = "new" | "read" | "replied";
type Msg = { id: string; name: string; email: string; subject: string; message: string; status: MsgStatus; created: string };

const MSG_TONE: Record<MsgStatus, { label: string; tone: "warning" | "neutral" | "success" }> = {
  new: { label: "جديدة", tone: "warning" },
  read: { label: "مقروءة", tone: "neutral" },
  replied: { label: "أُجيبت", tone: "success" },
};

const MSGS: Msg[] = [
  { id: "m1", name: "نورة الدوسري", email: "noura@example.com", subject: "طلب انضمام للجنة الإعلام", message: "السلام عليكم، أدرس في كلية الآداب وأتابع أعمال النادي منذ سنة. أرغب في الانضمام إلى لجنة الإعلام، ولي تجربة في التصوير والمونتاج وأستطيع عرض أعمالي السابقة.", status: "new", created: "19 أغسطس 2026" },
  { id: "m2", name: "سلطان الحربي", email: "sultan@example.com", subject: "استفسار عن موعد الأمسية", message: "هل أمسية الشعر يوم الأربعاء مفتوحة لغير طلاب الجامعة؟ ومتى يفتح باب الحجز؟", status: "read", created: "18 أغسطس 2026" },
  { id: "m3", name: "دانة العنزي", email: "dana@example.com", subject: "عرض رعاية", message: "نمثّل مكتبة الرشد ونودّ رعاية معرض الكتاب القادم، ولنا عرضٌ مفصّل نرسله متى ناسبكم.", status: "replied", created: "16 أغسطس 2026" },
  { id: "m4", name: "ماجد القرني", email: "majed@example.com", subject: "خطأ في صفحة المكتبة", message: "عند فتح كتاب «إرثٌ يُروى» من الجوّال لا تظهر الصفحة الأخيرة ويعلق القارئ عند التحميل.", status: "new", created: "15 أغسطس 2026" },
];

const msgColumns: Column<Msg>[] = [
  { key: "name", header: "المُرسِل", width: "1.1fr", render: (m) => <span className="txt">{m.name}</span> },
  { key: "email", header: "البريد", width: "1.2fr", render: (m) => <span className="txt font-latin" dir="ltr">{m.email}</span> },
  { key: "subject", header: "الموضوع", width: "1.2fr", render: (m) => <span className="txt">{m.subject}</span> },
  { key: "message", header: "الرسالة", width: "2fr", wrap: true, render: (m) => <span className="txt">{m.message}</span> },
  { key: "created", header: "وردت في", width: "140px", render: (m) => <span className="txt">{m.created}</span> },
  { key: "status", header: "الحال", width: "120px", render: (m) => <Badge tone={MSG_TONE[m.status].tone} dot>{MSG_TONE[m.status].label}</Badge> },
];

const msgSpec: CardSpec = { title: "subject", subtitle: "name", badge: "status", body: "message", facts: ["email", "created"] };
const msgActions = (): MenuGroup[] => [
  { items: [{ label: "فتح", icon: <Eye /> }, { label: "وسمها مقروءة", icon: <PencilSimple /> }] },
  { danger: true, items: [{ label: "حذف", icon: <Trash />, danger: true }] },
];

/* ══ بيانةُ الإنذارات: صفٌّ صاحبُه إنسانٌ وحالُه نغمة (نظير `WarningRow`) ═════════ */

type Warn = { id: string; name: string; gender: "male" | "female"; role: string; category: string; reason: string; date: string; ordinal: number; state: "active" | "cancelled" };

const WARNS: Warn[] = [
  { id: "w1", name: "فهد العتيبي", gender: "male", role: "عضو لجنة الإعلام", category: "غياب متكرّر", reason: "تخلّف عن ثلاث ورش متتالية بلا اعتذار مسبق.", date: "12 أغسطس 2026", ordinal: 2, state: "active" },
  { id: "w2", name: "ليلى المطيري", gender: "female", role: "منسّقة الفعاليّات", category: "تأخّر في التسليم", reason: "تأخّر تسليم تقرير الأمسية أسبوعين عن موعده.", date: "4 أغسطس 2026", ordinal: 1, state: "active" },
  { id: "w3", name: "عبدالله الشمري", gender: "male", role: "عضو لجنة المكتبة", category: "مخالفة اللائحة", reason: "أُلغي بعد مراجعة اللجنة وثبوت العذر.", date: "28 يوليو 2026", ordinal: 0, state: "cancelled" },
];

const warnColumns: Column<Warn>[] = [
  {
    key: "member", header: "العضو", width: "1.3fr",
    render: (w) => (
      <span className="dt-mem">
        <Avatar name={w.name} gender={w.gender} size="sm" />
        <span className="dt-mm"><b>{w.name}</b><i>{w.role}</i></span>
      </span>
    ),
  },
  { key: "avatar", header: "", width: "48px", render: (w) => <Avatar name={w.name} gender={w.gender} size="sm" /> },
  { key: "name", header: "العضو", width: "1fr", render: (w) => <span className="txt">{w.name}</span> },
  { key: "role", header: "المنصب", width: "1fr", render: (w) => <span className="txt">{w.role}</span> },
  { key: "category", header: "السبب", width: "1fr", render: (w) => <span className="txt">{w.category}</span> },
  { key: "reason", header: "التفصيل", width: "2fr", wrap: true, render: (w) => <span className="txt">{w.reason}</span> },
  { key: "date", header: "بتاريخ", width: "140px", render: (w) => <span className="txt">{w.date}</span> },
  { key: "ordinal", header: "الرتبة", width: "110px", render: (w) => (w.state === "cancelled" ? <span className="txt">ملغى</span> : <span className="txt num">{w.ordinal} من ٣</span>) },
];

const warnSpec: CardSpec = { title: "name", subtitle: "role", lead: "avatar", badge: "ordinal", body: "reason", facts: ["category", "date"] };
const warnTone = (w: Warn) => (w.state === "cancelled" ? "neutral" as const : w.ordinal >= 2 ? "danger" as const : "warning" as const);
const warnGroups: Group<Warn>[] = [
  { key: "active", label: "إنذاراتٌ قائمة", hint: "اثنان", tone: "danger", rows: WARNS.filter((w) => w.state === "active") },
  { key: "cancelled", label: "ملغاة", hint: "واحد", tone: "neutral", rows: WARNS.filter((w) => w.state === "cancelled") },
];

/* ══ الصفحة ═══════════════════════════════════════════════════════════════ */

/** الهيئاتُ الثلاثُ مصفوفةً على البيانة نفسِها — عمودٌ لكلٍّ، فالمقارنةُ بالعين لا بالوصف. */
function Trio({ children }: { children: React.ReactNode }) {
  return <div className="cvlab">{children}</div>;
}

export default function CardsViewPage() {
  const [view, setView] = useState<ViewMode>("cards");
  const [q, setQ] = useState("");
  const [variant, setVariant] = useState<CardVariant>("facts");

  return (
    <Container className="space-y-14 py-10">
      <header className="space-y-3">
        <h1 className="font-display text-4xl font-black text-content">عرضُ الكروت للجداول</h1>
        <Note>
          إحدى عشرة شاشةً في اللوحة جدولٌ محضٌ بلا مبدّل عرض. وهذه الصفحةُ تعرض الخدمةَ التي تمنحها كروتَها:
          مكوّنٌ واحدٌ يقرأ أعمدة الجدول نفسَها فيرسم منها كرتًا، والشاشةُ لا تكتب إلّا خريطةً تقول أيُّ
          عمودٍ عنوانٌ وأيُّها حقائق. فالقيمةُ تُرسَم مرّةً واحدة، ولا تفترق صياغةُ الكرت عن صياغة الجدول يومًا.
          والمطلوبُ منك اختيارُ هيئةٍ من ثلاث، ثمّ تُركَّب على الشاشات الإحدى عشرة.
        </Note>
      </header>

      <Sec title="١) البيانة الأولى: رسائل التواصل">
        <Note>
          صفٌّ نصُّه هو خبرُه: عنوانٌ ومُرسِلٌ ونصٌّ حرٌّ طويل. هذه الشاشةُ اليوم جدولٌ لا غير.
        </Note>
        <Lab>الجدول كما هو اليوم</Lab>
        <DataTable columns={msgColumns} rows={MSGS} getRowId={(m) => m.id} rowActions={msgActions} />

        <div className="mt-8 space-y-8">
          <div>
            <Lab>هيئة أ: الحقائق في شريطٍ أسفل الكرت</Lab>
            <DataCards columns={msgColumns} rows={MSGS} getRowId={(m) => m.id} spec={msgSpec} variant="facts" rowActions={msgActions} onRowClick={() => {}} />
          </div>
          <div>
            <Lab>هيئة ب: الحقائق صفوفًا مسطورة</Lab>
            <DataCards columns={msgColumns} rows={MSGS} getRowId={(m) => m.id} spec={msgSpec} variant="rows" rowActions={msgActions} onRowClick={() => {}} />
          </div>
          <div>
            <Lab>هيئة ج: مضغوطٌ في عمودٍ واحد</Lab>
            <DataCards columns={msgColumns} rows={MSGS} getRowId={(m) => m.id} spec={msgSpec} variant="compact" rowActions={msgActions} onRowClick={() => {}} oneColumn />
          </div>
        </div>
      </Sec>

      <Sec title="٢) البيانة الثانية: الإنذارات، بمجموعاتها ونغماتها">
        <Note>
          صفٌّ صاحبُه إنسانٌ وحالُه نغمة، ومجموعاتُه تُطوى. الشريطُ هو شريطُ الجدول نفسُه، إلّا أنّه هنا سطحٌ
          قائمٌ بذاته لأنّه لا إطارَ فوقه يحويه.
        </Note>
        <Lab>الجدول كما هو اليوم</Lab>
        <DataTable columns={warnColumns.filter((c) => c.key !== "avatar" && c.key !== "name" && c.key !== "role")} groups={warnGroups} getRowId={(w) => w.id} rowTone={warnTone} rowActions={msgActions} />
        <div className="mt-8">
          <Lab>الكروت بالهيئة نفسِها التي تختارها</Lab>
          <div className="mb-4"><Toolbar view={view} onViewChange={setView} search={q} onSearch={setQ} searchPlaceholder="ابحث باسم العضو" /></div>
          <div className="mb-5 flex flex-wrap gap-2">
            {(["facts", "rows", "compact"] as CardVariant[]).map((v) => (
              <button key={v} type="button" className={"tb-filt" + (variant === v ? " on" : "")} onClick={() => setVariant(v)}>
                {v === "facts" ? "هيئة أ" : v === "rows" ? "هيئة ب" : "هيئة ج"}
              </button>
            ))}
          </div>
          {view === "table" ? (
            <DataTable columns={warnColumns.filter((c) => c.key !== "avatar" && c.key !== "name" && c.key !== "role")} groups={warnGroups} getRowId={(w) => w.id} rowTone={warnTone} rowActions={msgActions} />
          ) : (
            <DataCards columns={warnColumns} groups={warnGroups} getRowId={(w) => w.id} spec={warnSpec} variant={variant} rowTone={warnTone} rowActions={msgActions} onRowClick={() => {}} oneColumn={variant === "compact"} />
          )}
        </div>
      </Sec>

      <Sec title="٣) الحكمُ على عرض الجوّال">
        <Note>
          اللوحةُ منتَجُ جوّال: مئتان وثلاثون عضوًا من مئتين وواحدٍ وتسعين لم يفتحوها من حاسوبٍ قطّ. فالحكمُ
          هنا لا في الشبكة العريضة أعلاه. والأعمدةُ الثلاثةُ التالية بعرض جوّالٍ حقيقيّ.
        </Note>
        <div className="flex flex-wrap gap-6">
          {(["facts", "rows", "compact"] as CardVariant[]).map((v) => (
            <div key={v}>
              <Lab>{v === "facts" ? "هيئة أ" : v === "rows" ? "هيئة ب" : "هيئة ج"}</Lab>
              <Trio>
                <DataCards columns={msgColumns} rows={MSGS.slice(0, 3)} getRowId={(m) => m.id} spec={msgSpec} variant={v} rowActions={msgActions} onRowClick={() => {}} />
              </Trio>
            </div>
          ))}
        </div>
      </Sec>

      <Sec title="٤) الحالات الطرفيّة">
        <div className="space-y-8">
          <div>
            <Lab>التحميل</Lab>
            <DataCards columns={msgColumns} rows={[]} getRowId={(m) => m.id} spec={msgSpec} loading />
          </div>
          <div>
            <Lab>لا نتيجة</Lab>
            <DataCards
              columns={msgColumns}
              rows={[]}
              getRowId={(m) => m.id}
              spec={msgSpec}
              emptyState={
                <div className="empty empty-aurora">
                  <span className="empty-ic"><Envelope /></span>
                  <b className="empty-title">لا رسائل</b>
                  <span className="empty-desc">صندوقُ الموقع خالٍ الآن.</span>
                </div>
              }
            />
          </div>
          <div>
            <Lab>كرتٌ بلا إجراءات ولا فتح</Lab>
            <DataCards columns={warnColumns} rows={WARNS.slice(0, 2)} getRowId={(w) => w.id} spec={{ ...warnSpec, badge: undefined }} variant="facts" rowTone={warnTone} />
          </div>
          <div>
            <Lab>شارةُ صفحةٍ خارجَ البيانة</Lab>
            <p className="text-sm text-content-muted"><WarningOctagon className="inline" aria-hidden /> الهيئةُ المختارةُ تصير الافتراضَ في المكوّن، والشاشةُ لا تُبدّلها إلّا بحجّة.</p>
          </div>
        </div>
      </Sec>

    </Container>
  );
}
