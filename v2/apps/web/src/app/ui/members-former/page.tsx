"use client";

import { useMemo, useState } from "react";
import { Container, Donut, Segmented, SectionCard, Stat } from "@adeeb/design-system";
import { ChartDonut, UserMinus, UsersThree } from "@phosphor-icons/react";
import { ArrowCounterClockwise, Eye } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../dashboard/_components/DataTable";
import type { MenuGroup } from "../../dashboard/_components/DropdownMenu";
import { Avatar } from "../../dashboard/_components/Avatar";
import { StatsScope } from "../../dashboard/_components/StatsScope";
import { Toolbar } from "../../dashboard/_components/Toolbar";
import { TERMINATION_KINDS, type TerminationKind } from "@/lib/membershipFields";

/**
 * **معاينةُ «أعضاء أدِيب» بقسمَيه** (٢٠٢٦-١٠-٠٩): المالكُ قرّر أن يسكن الأعضاءُ السابقون داخل
 * تبويب الأعضاء لا في تبويبٍ مستقلّ، ليُعرف سببُ خروجهم وأنّهم كانوا أعضاءً. فهنا الشكلُ قبل البناء:
 * مبدّلٌ ممتدٌّ «أعضاء / سابقون» على سنّة سجلّ المتطوّعين، وفي قسم السابقين **أسبابُ الخروج مجمَّعة**.
 * وعُرض عليه شكلان للأسباب (أشرطةٌ وحلقة)، فاختار الحلقة، وحُذف الآخر. والشاشةُ الحيّة بُنيت عليها.
 *
 * الأسماءُ والأعدادُ مخترَعة: `/ui` صفحةٌ عامّة، فلا يُنشر فيها سجلُّ خروجٍ حقيقيّ ولا رقمُه.
 * والفئاتُ الخمس اقتراحٌ؛ السببُ في القاعدة نصٌّ حرٌّ (`termination_reason`) لا فئةَ له بعد.
 */

type Kind = TerminationKind;
// أسماءُ الفئات من مصدرها الواحد، كما في الشاشة الحيّة
const KIND = Object.fromEntries(TERMINATION_KINDS.map((k) => [k.value, k.label])) as Record<Kind, string>;

type Row = {
  id: string; name: string; gender: "male" | "female"; line: string;
  status: "active" | "former"; joined: string;
  endDate?: string; endBy?: string; reason?: string; kind?: Kind;
};

const A = (id: string, name: string, gender: "male" | "female", line: string, joined: string): Row =>
  ({ id, name, gender, line, joined, status: "active" });
const F = (id: string, name: string, gender: "male" | "female", line: string, endDate: string, endBy: string, kind: Kind, reason: string): Row =>
  ({ id, name, gender, line, joined: "", status: "former", endDate, endBy, kind, reason });

const ROWS: Row[] = [
  A("a1", "سديم بندر القحطاني", "female", "قائدة لجنة التصوير", "3 مارس 2025"),
  A("a2", "عبد الرحمن خالد الشيخ", "male", "عضو لجنة الفعاليات", "17 سبتمبر 2025"),
  A("a3", "لطيفة عبد العزيز السليطين", "female", "نائبة قائد لجنة الرواة", "2 يناير 2026"),
  A("a4", "سعد وليد العبود", "male", "عضو لجنة التسويق", "28 مايو 2025"),
  A("a5", "مريم هاني العلوي", "female", "عضو لجنة التأليف", "11 فبراير 2026"),
  A("a6", "نواف ثلاب الشمري", "male", "منسّق قسم الإعلام", "9 أكتوبر 2024"),
  F("f1", "ريما عبد العزيز المحسن", "female", "عضو لجنة التصوير", "15 أغسطس 2026", "قائدة لجنة التصوير", "idle", "عدم التفاعل مع أنشطة ومهام النادي خلال الفترة الماضية"),
  F("f2", "فهد ناصر العتيبي", "male", "عضو لجنة الفعاليات", "15 أغسطس 2026", "قائد لجنة الفعاليات", "idle", "الغياب المُستمر عن مهام اللجنة الموكلة"),
  F("f3", "هياء عبد العزيز العيد", "female", "عضو لجنة الرواة", "7 أغسطس 2026", "نائبة الرئيس", "idle", "لم تنضمّ إلى مجموعة اللجنة منذ قبولها"),
  F("f4", "زينب حجي الرشيد", "female", "عضو لجنة التسويق", "6 أغسطس 2026", "قائدة لجنة التسويق", "idle", "عدم التفاعل والمشاركة في أعمال اللجنة"),
  F("f5", "تركي سالم الدوسري", "male", "عضو لجنة التأليف", "3 أغسطس 2026", "منسّق قسم الإعلام", "idle", "عدم الالتزام بمتطلبات العضوية والمشاركة"),
  F("f6", "عذراء حامد السويح", "female", "عضو لجنة التصوير", "9 يوليو 2026", "قائدة الموارد البشرية", "silent", "خروج العضو من مجتمع أدِيب دون إبلاغ الموارد البشرية"),
  F("f7", "ماجد فيصل الحربي", "male", "عضو لجنة الفعاليات", "17 أبريل 2026", "قائدة الموارد البشرية", "silent", "خروج العضو من مجتمع أدِيب دون إبلاغ الموارد البشرية"),
  F("f8", "أريام محمد الشهري", "female", "عضو لجنة الرواة", "7 أكتوبر 2026", "الرئيس", "asked", "طلب العضو إنهاء العضوية"),
  F("f9", "يوسف عادل البقمي", "male", "قائد لجنة التسويق", "10 مايو 2026", "الرئيس", "asked", "تقدّم بإنهاء عضويته لانشغاله بحياته الوظيفية"),
  F("f10", "جود أحمد الغامدي", "female", "عضو لجنة التأليف", "24 يونيو 2026", "نائبة الرئيس", "asked", "لأسباب أكاديمية أو شخصية"),
  F("f11", "بدر عيسى المري", "male", "عضو لجنة التصوير", "3 أغسطس 2026", "الرئيس", "breach", "إساءة التعامل أو التطاول على الإدارة"),
  F("f12", "رهف عمر الزهراني", "female", "عضو لجنة الفعاليات", "17 مارس 2026", "الرئيس", "other", "قرّر المجلس الإداريّ سحب المنصب والعضوية"),
];

const UNIT = { one: "عضو", two: "عضوان", few: "أعضاء" };

const who: Column<Row> = {
  key: "member", header: "العضو", width: "minmax(220px, 2.2fr)",
  render: (m) => (
    <div className="dt-mem">
      <Avatar name={m.name} gender={m.gender} size="sm" />
      <span className="dt-mm"><b>{m.name}</b><span>{m.line}</span></span>
    </div>
  ),
};

const ACTIVE_COLS: Column<Row>[] = [
  who,
  { key: "joined", header: "تاريخ الانضمام", width: "1.1fr", render: (m) => <span className="txt">{m.joined}</span> },
];

// أعمدةُ السابقين نفسُها في الشاشة الحيّة اليوم (`makeSuspendedColumns`)، فلا جديدَ في الكشف.
const FORMER_COLS: Column<Row>[] = [
  who,
  { key: "endDate", header: "تاريخ إنهاء العضوية", width: "1.1fr", render: (m) => <span className="txt">{m.endDate}</span> },
  { key: "endBy", header: "من أنهى العضوية", width: "minmax(140px, 1.3fr)", render: (m) => <span className="txt txt-clip" title={m.endBy}>{m.endBy}</span> },
  { key: "endReason", header: "سبب إنهاء العضوية", width: "minmax(200px, 2.2fr)", render: (m) => <span className="txt txt-clip" title={m.reason}>{m.reason}</span> },
];

const FORMER_ACTIONS = (): MenuGroup[] => [
  { items: [{ label: "عرض التفاصيل", icon: <Eye /> }, { label: "إعادة العضوية", icon: <ArrowCounterClockwise /> }] },
];
const ACTIVE_ACTIONS = (): MenuGroup[] => [{ items: [{ label: "عرض الملف", icon: <Eye /> }] }];

export default function MembersFormerPage() {
  const [tab, setTab] = useState<"active" | "former">("former");
  // الحلقةُ مرشِّحُ السبب: الضغطُ على فئةٍ يُخفيها ويُخرج أصحابَها من الكشف (كالشاشة الحيّة)
  const [hiddenKinds, setHiddenKinds] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const inTab = ROWS.filter((r) => r.status === tab);
  // القاعدة ١٧: الأرقامُ تسمع التبويبَ والمرشِّح ولا تسمع البحث
  const inScope = useMemo(() => inTab.filter((r) => !r.kind || !hiddenKinds.includes(KIND[r.kind])), [inTab, hiddenKinds]);
  const shown = useMemo(() => inScope.filter((r) => !q.trim() || r.name.includes(q.trim())), [inScope, q]);

  // ورسمُ الأسباب موضوعُه السببُ نفسُه، فلا يسمع مرشِّحَ السبب (القاعدة ١٧، حدُّ البُعد): يبقى صورةَ الكلّ.
  const reasons = useMemo(() => {
    const counts = new Map<Kind, number>();
    for (const r of inTab) if (r.kind) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
    return TERMINATION_KINDS.map((k) => ({ label: k.label as string, value: counts.get(k.value) ?? 0 })).filter((k) => k.value > 0);
  }, [inTab]);


  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Dashboard, Members</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أعضاء أدِيب بقسمَيه</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          الأعضاءُ السابقون قسمٌ داخل تبويب الأعضاء، وفي قسمهم أسبابُ الخروج مجمَّعةً في خمس فئاتٍ حلقةً.
          اضغط فئةً في الحلقة لتُخفيها: يخرج أصحابُها من الكشف والعدّاد، وتبقى في الحلقة مشطوبةً بنسبتها. الأسماءُ والأعدادُ مخترَعة.
        </p>

        <section className="mt-10">
          {/* بلا إطارٍ حاضن: الكرتُ والجدولُ سطحان مؤطَّران، والمؤطَّرُ لا يحمل مؤطَّرًا (القاعدة ١٢) */}
          <h2 className="font-display text-2xl font-black text-content" style={{ marginBottom: 16 }}>أعضاء أدِيب</h2>

          <div style={{ marginBottom: 16 }}>
            <Segmented
              wide
              items={[{ value: "active", label: "أعضاء" }, { value: "former", label: "سابقون" }]}
              value={tab}
              onValueChange={(v) => { setTab(v as "active" | "former"); setHiddenKinds([]); setQ(""); }}
            />
          </div>

          <StatsScope labels={[hiddenKinds.length ? `بلا ${hiddenKinds.join("، ")}` : null]} onClear={() => setHiddenKinds([])} />

          <div className="stat-grid" style={{ marginBottom: 18 }}>
            {tab === "active"
              ? <Stat icon={<UsersThree />} value={inScope.length} label="عدد أعضاء أدِيب" />
              : <Stat icon={<UserMinus />} value={inScope.length} label="عضوٌ سابق" tone="danger" />}
          </div>

          {tab === "former" ? (
            <SectionCard title="أسباب الخروج" icon={<ChartDonut />} style={{ marginBottom: 18 }}>
              <Donut items={reasons} unit={UNIT} empty="لا خارجين." hidden={hiddenKinds} onHiddenChange={setHiddenKinds} />
            </SectionCard>
          ) : null}

          <Toolbar
            searchPlaceholder="ابحث بالاسم"
            search={q}
            onSearch={setQ}
          />

          <DataTable
            columns={tab === "former" ? FORMER_COLS : ACTIVE_COLS}
            rows={shown}
            getRowId={(r) => r.id}
            rowActions={tab === "former" ? FORMER_ACTIONS : ACTIVE_ACTIONS}
            tone={tab === "former" ? "danger" : undefined}
          />
        </section>
      </Container>
    </main>
  );
}
