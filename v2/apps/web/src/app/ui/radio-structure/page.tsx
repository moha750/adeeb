"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge, Button, Card, CardBody, CardHeader, Container, Field, Segmented, Stat, Textarea } from "@adeeb/design-system";
import { MicrophoneStage, Broadcast, Playlist, SlidersHorizontal, TextAlignLeft, LinkSimple } from "@phosphor-icons/react";
import { Plus, PencilSimple, DotsSixVertical, UploadSimple } from "@/app/_components/glyphs";
import { PageHeader } from "../../dashboard/_components/PageHeader";
import { Toolbar, type FilterDef, type ViewMode } from "../../dashboard/_components/Toolbar";
import { ShowCard } from "../../dashboard/radio/ShowCard";
import type { ShowRow } from "../../dashboard/radio/data";
import type { CrumbStep } from "../../dashboard/_shell/crumb";

/**
 * **الإذاعة: غرفةٌ واحدة أم بندان؟** معاينةٌ تعرض الاحتمالات الثلاثة بالمكوّنات الحقيقيّة.
 *
 * سببُ الصفحة (٢٠٢٦-٠٨-١٨): سأل المالكُ عن فصل «الإذاعة» عن «البرامج» وقال إنّ الدافع
 * إحساسُ حيرةٍ لا علّةٌ مسمّاة. والتشخيص أنّ المستويين المتناظرين عولجا بطريقتين:
 * هويّةُ **البرنامج** تبويبٌ ظاهرٌ بجوار حلقاته، وهويّةُ **المحطّة** مدفونةٌ في قائمة الرأس.
 * فلا يُشرح هذا كلامًا: يُعرض فيُختار (ق: القرار البصريّ يُعرَض لا يُشرَح).
 *
 * والمقاسُ الافتراضيّ ٣٩٠ لأنّ اللوحةَ منتَجُ جوّال (٧٩٪ من الأعضاء لم يفتحوها من حاسوب).
 */

const WIDTHS = [
  { value: "390", label: "جوّال ٣٩٠" },
  { value: "430", label: "جوّال كبير ٤٣٠" },
  { value: "820", label: "لوح ٨٢٠" },
];

/* برامجُ معاينةٍ ساكنة، بأسماء مختبر الإذاعة نفسِها كي تبقى المعاينةُ واحدةً عبر المعارض. */
const base = {
  tagline: null, description: null, logoPath: null, tone: "brand" as const, talkStartsAt: 10.633,
  order: 0, hostAvatar: null, hostGender: null, committeeId: null, committeeName: null, createdRaw: "",
};
const SHOWS: ShowRow[] = [
  { ...base, id: "1", title: "على هامش الكلمة", slug: "hamesh", logoUrl: "x", status: "published", isFeatured: true,
    hostId: "a", hostName: "سارة القحطاني", episodeCount: 8, publishedCount: 8 },
  { ...base, id: "2", title: "منعطف", slug: "munataf", logoUrl: "x", status: "published", isFeatured: false,
    hostId: "b", hostName: "فهد العتيبي", episodeCount: 2, publishedCount: 1 },
  { ...base, id: "3", title: "بين قوسين", slug: "qawsayn", logoUrl: null, status: "draft", isFeatured: false,
    hostId: "c", hostName: "ليلى المطيري", episodeCount: 12, publishedCount: 0 },
];

const FILTERS: FilterDef[] = [
  { key: "status", label: "الحالة", options: [
    { value: "published", label: "منشور" }, { value: "draft", label: "مسودّة" }, { value: "archived", label: "مؤرشف" },
  ] },
];

const CRUMB_ONE: CrumbStep[] = [{ kind: "link", label: "المحتوى", href: "#" }];
const CRUMB_SPLIT: CrumbStep[] = [{ kind: "link", label: "المحتوى", href: "#" }, { kind: "link", label: "إذاعة أدِيب", href: "#" }];

/** جسدُ الغرفة: إحصاءاتُها وشريطُها وكروتُ برامجها، وهو واحدٌ في الاحتمالات الثلاثة. */
function ShowsBody({ id }: { id: string }) {
  const [search, setSearch] = useState("");
  const [fv, setFv] = useState<Record<string, string>>({});
  const [view, setView] = useState<ViewMode>("cards");
  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <Stat icon={<MicrophoneStage />} value={3} label="إجمالي البرامج" />
        <Stat icon={<Broadcast />} value={2} label="برامج منشورة" tone="success" />
        <Stat icon={<Playlist />} value={22} label="إجمالي الحلقات" />
      </div>
      <Toolbar
        searchPlaceholder="ابحث باسم البرنامج أو معرّفه أو مقدّمه…"
        search={search} onSearch={setSearch}
        filters={FILTERS} filterValues={fv}
        onFilter={(k, v) => setFv((p) => ({ ...p, [k]: v }))} onReset={() => setFv({})}
        view={view} onViewChange={setView}
      />
      <div className="card-grid card-grid-1col">
        {SHOWS.map((s) => <ShowCard key={id + s.id} show={s} actions={[]} onOpen={() => {}} />)}
      </div>
    </>
  );
}

/** هويّةُ المحطّة: الحقولُ الأربعة نفسُها التي في المودال اليوم، معروضةً في مكانها. */
function StationBody() {
  return (
    <div className="form-grid">
      <div className="form-full">
        <div className="rounded border-2 border-dashed border-line bg-surface-2 p-8 flex flex-col items-center gap-3 text-center">
          <UploadSimple size={28} className="text-content-muted" />
          <div className="text-content-muted text-sm">شعار الإذاعة: مربّع ١٤٠٠×١٤٠٠. يظهر في صدر صفحة الإذاعة.</div>
          <Button variant="ghost" size="md">اختر ملفًّا</Button>
        </div>
      </div>
      <Field className="form-full" label="اسم الإذاعة" icon={<MicrophoneStage />} innerIcon={<PencilSimple />}
        placeholder="إذاعة أدِيب" defaultValue="إذاعة أدِيب" required />
      <Field className="form-full" label="الجملة التعريفيّة" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
        placeholder="صوتُ النادي في أذنك" optional />
      <Textarea className="form-full" label="الوصف" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} rows={3}
        placeholder="وصفٌ يظهر في صدر صفحة الإذاعة…" optional />
      <div className="form-full">
        <Button variant="primary" size="md">حفظ بيانات الإذاعة</Button>
      </div>
    </div>
  );
}

function Tag({ tone, n, title, note }: { tone: "bad" | "good" | ""; n: string; title: string; note: string }) {
  return (
    <div className={"phdlab-tag " + tone}>
      <span className="dot" aria-hidden />
      {n}: {title}
      <span className="h">{note}</span>
    </div>
  );
}

/* شكلُ الشريط الجانبيّ في كلّ احتمال: ما يزيد فيه وما ينقص. */
const NAV_A = ["الأعمال", "الإحصاءات", "الرعاة", "الأسئلة الشائعة", "الأخبار", "المكتبة", "إذاعة أدِيب"];
const NAV_C = ["الأعمال", "الإحصاءات", "الرعاة", "الأسئلة الشائعة", "الأخبار", "المكتبة", "إذاعة أدِيب ‹ البرامج", "إذاعة أدِيب ‹ الإذاعة"];

export default function RadioStructureLab() {
  const [w, setW] = useState("390");
  const [tab, setTab] = useState("shows");

  return (
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Radio Structure</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">الإذاعة: غرفةٌ واحدة أم بندان؟</h1>
        <p className="mt-2 max-w-3xl text-content-muted">
          الحيرةُ ليست في الشريط الجانبيّ، بل في أنّ مستويين متناظرين عولجا بطريقتين: هويّةُ
          <b> البرنامج </b> تبويبٌ ظاهرٌ بجوار حلقاته، وهويّةُ <b> الإذاعة </b> مدفونةٌ في قائمة
          الرأس. وهذه الاحتمالاتُ الثلاثة بالمكوّنات الحقيقيّة، و<b>المُعتمَدُ (ب)</b> حيٌّ في
          الغرفة منذ ٢٠٢٦-٠٨-١٨. وتبقى الصفحةُ سجلًّا لما اختير ولمَ.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">عرض الإطار:</span>
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="عرض إطار المعاينة" />
        </div>
      </Container>

      <div className="mx-auto w-full max-w-[1400px] px-6">
        <div className="mt-12" style={{ ["--phdlab-w" as string]: w + "px" }}>
          <div className="phdlab">

            {/* ── أ: الحال اليوم ─────────────────────────────────────────── */}
            <div className="phdlab-col">
              <Tag tone="bad" n="أ" title="ما كان" note="بندٌ واحد" />
              <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
                <PageHeader
                  title="إذاعة أدِيب"
                  crumb={CRUMB_ONE}
                  primary={{ label: "برنامج جديد", icon: <Plus size={18} />, onClick: () => {} }}
                  menu={[{ items: [{ label: "إعدادات المحطّة", icon: <SlidersHorizontal size={18} /> }] }]}
                />
                <ShowsBody id="a" />
              </div>
              <div className="phdlab-body">
                العنوانُ يَعِد بالمحطّة والجسدُ يعطي كشفَ برامج، وهويّتُها خلف نقاطٍ ثلاث
                لا يُخمَّن ما فيها.
              </div>
            </div>

            {/* ── ب: التناظر ────────────────────────────────────────────── */}
            <div className="phdlab-col">
              <Tag tone="good" n="ب" title="تناظُر (المُعتمَد)" note="حيٌّ منذ ٢٠٢٦-٠٨-١٨" />
              <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
                <PageHeader
                  title="إذاعة أدِيب"
                  crumb={CRUMB_ONE}
                  primary={tab === "shows" ? { label: "برنامج جديد", icon: <Plus size={18} />, onClick: () => {} } : undefined}
                />
                <Segmented
                  items={[{ value: "shows", label: "البرامج (٣)" }, { value: "station", label: "هويّة الإذاعة" }]}
                  value={tab} onValueChange={setTab} aria-label="أقسام الإذاعة" className="seg-block mb-4"
                />
                {tab === "shows" ? <ShowsBody id="b" /> : <StationBody />}
              </div>
              <div className="phdlab-body">
                نفسُ قاعدة صفحة البرنامج (حلقاتٌ ثمّ هويّة)، صاعدةً مستوًى: برامجُ الإذاعة ثمّ
                هويّتُها. غرفةٌ واحدة، والمدفونُ صار مرئيًّا. اضغط التبويب لترى الوجهين.
              </div>
            </div>

            {/* ── ج: الفصل في الشريط ────────────────────────────────────── */}
            <div className="phdlab-col">
              <Tag tone="" n="ج" title="بندان" note="شاشتان" />
              <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
                <PageHeader
                  title="البرامج"
                  crumb={CRUMB_SPLIT}
                  primary={{ label: "برنامج جديد", icon: <Plus size={18} />, onClick: () => {} }}
                />
                <ShowsBody id="c" />
              </div>
              <div className="phdlab-body">وشاشةٌ ثانيةٌ لبندٍ ثانٍ:</div>
              <div className="phdlab-frame" style={{ paddingBottom: 14 }}>
                <PageHeader title="الإذاعة" crumb={CRUMB_SPLIT} />
                <StationBody />
              </div>
              <div className="phdlab-body">
                شاشةٌ كاملةٌ لصفٍّ واحدٍ يُحرَّر مرّةً في العام، وبندٌ يُقرأ في الشريط كلَّ يوم.
              </div>
            </div>

          </div>
        </div>

        {/* ── كلفةُ كلٍّ في الشريط الجانبيّ ─────────────────────────────── */}
        <Container className="mt-16 px-0">
          <h2 className="font-display text-2xl font-black text-content">وماذا يصير الشريط؟</h2>
          <p className="mt-2 max-w-3xl text-content-muted">
            رأسُ «المحتوى» اليوم سبعةُ بنودٍ مسطّحة. والاحتمالُ (ج) وحدَه يمسّه.
          </p>
          <div className="card-grid mt-6">
            {[
              { t: "أ وب: كما هو", items: NAV_A, tone: "success" as const, note: "سبعةُ بنود" },
              { t: "ج: رأسٌ جديد", items: NAV_C, tone: "warning" as const, note: "ثمانيةُ بنود، ونمطُ المحتوى المسطّح ينكسر" },
            ].map((c) => (
              <Card key={c.t}>
                <CardHeader icon={<DotsSixVertical aria-hidden />} title={c.t}
                  actions={<Badge tone={c.tone} variant="soft">{c.note}</Badge>} />
                <CardBody>
                  <ul className="flex flex-col gap-1.5 text-sm text-content-muted">
                    {c.items.map((i) => (
                      <li key={i} className={i.includes("الإذاعة") ? "text-content font-bold" : undefined}>{i}</li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>
        </Container>

        {/* ── ما يبقى مؤجّلًا ──────────────────────────────────────────── */}
        <Container className="mt-16 px-0">
          <h2 className="font-display text-2xl font-black text-content">وبابٌ ثالثٌ يستحقّ الانتظار</h2>
          <p className="mt-2 max-w-3xl text-content-muted">
            البندُ الذي يستحقّ الفصل حقًّا ليست هويّةَ الإذاعة بل <b>الحلقات</b>: كشفٌ عابرٌ للبرامج
            كلِّها (المجدولةُ هذا الأسبوع، المسودّات، وما رُفع مسارُ صوتِه بلا موسيقاه). ذاك
            كشفٌ لا موضعَ له في صفحة برنامجٍ واحد. فإن جاء يومُه صار التبويبُ في (ب) ثلاثةً:
            البرامج، الحلقات، هويّة الإذاعة، بلا بندٍ جديدٍ في الشريط.
          </p>
          <p className="mt-3 max-w-3xl text-content-muted">
            <LinkSimple className="inline align-[-3px]" aria-hidden /> الشاشةُ الحيّة:{" "}
            <Link href="/dashboard/radio" className="font-latin font-bold text-secondary">/dashboard/radio</Link>
          </p>
        </Container>
      </div>
    </main>
  );
}
