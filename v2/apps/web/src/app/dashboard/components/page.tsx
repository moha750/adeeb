"use client";

import { useState } from "react";
import {
  Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, CardMedia,
  Checkbox, CountBadge, Field, Radio, Select, Switch, Textarea,
} from "@adeeb/design-system";
import { At, Bell, Envelope, Eye, Key, Lock, NoteBlank, PencilSimple, ShieldCheck, Sparkle, Trash, User, UsersThree } from "@phosphor-icons/react";
import { Avatar } from "../_components/Avatar";
import { DataTable, type Column } from "../_components/DataTable";
import { DropdownMenu, type MenuGroup } from "../_components/DropdownMenu";
import { EmptyState } from "../_components/EmptyState";
import { Modal } from "../_components/Modal";
import { Pagination } from "../_components/Pagination";
import { Skeleton } from "../_components/Skeleton";
import { Tabs } from "../_components/Tabs";
import { Toolbar, type ViewMode } from "../_components/Toolbar";
import { useToast } from "../_components/ToastProvider";
import { MemberCard } from "../members/MemberCard";
import type { MemberRow } from "../members/data";
import { Breadcrumb } from "../_shell/Breadcrumb";

/* ── أيقونات صغيرة للعرض (Phosphor) ── */
const Ic = {
  user: <User aria-hidden />,
  mail: <Envelope aria-hidden />,
  at: <At aria-hidden />,
  lock: <Lock aria-hidden />,
  key: <Key aria-hidden />,
  note: <NoteBlank aria-hidden />,
  bell: <Bell aria-hidden />,
  spark: <Sparkle aria-hidden />,
  eye: <Eye aria-hidden />,
  edit: <PencilSimple aria-hidden />,
  trash: <Trash aria-hidden />,
  users: <UsersThree aria-hidden />,
};

/* ── بيانات عيّنة للجدول والكرت ── */
const noDetails = { joinedRaw: "", college: null, major: null, degree: null, degreeRaw: null, recordNo: null, twitter: null, instagram: null, tiktok: null, linkedin: null, endReason: null, endDate: "", endAgo: "", canEnd: true, canEdit: true, canWarn: true, warnCount: 0, canCertify: true, certName: null, certPosition: null, certCount: 0, committeeId: null };
const sampleMembers: MemberRow[] = [
  { id: "s1", name: "سارة الفيصل", email: "sara.f@adeeb.club", phone: "0551234567", avatar: null, gender: "female", dept: "الإعلام", committee: "لجنة التصميم", role: "عضو", status: "active", joined: "12 يناير 2026", ...noDetails },
  { id: "s2", name: "عبدالله القحطاني", email: "a.qahtani@adeeb.club", phone: "0509876543", avatar: null, gender: "male", dept: "التقنية", committee: "لجنة التطوير", role: "قائد فريق", status: "active", joined: "3 مارس 2026", ...noDetails },
  { id: "s3", name: "ليان العمري", email: "layan@adeeb.club", phone: null, avatar: null, gender: "female", dept: "الموارد", committee: null, role: "عضو", status: "pending", joined: "27 يونيو 2026", ...noDetails },
  { id: "s4", name: "محمد الزهراني", email: "m.zahrani@adeeb.club", phone: "0533334444", avatar: null, gender: "male", dept: "الجودة", committee: "لجنة القياس", role: "منسّق", status: "suspended", joined: "9 فبراير 2026", ...noDetails, endReason: "خروج العضو من مجتمع أدِيب دون إبلاغ إدارة الموارد البشرية", endDate: "2 مايو 2026", endAgo: "منذ 3 أشهر" },
];

const TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  active: "success", pending: "warning", suspended: "danger", inactive: "neutral",
};
const TONE_LBL: Record<string, string> = { active: "نشط", pending: "قيد الإكمال", suspended: "موقوف", inactive: "غير نشط" };

const tableCols: Column<MemberRow>[] = [
  {
    key: "member", header: "العضو", width: "minmax(200px, 2.2fr)",
    render: (m) => (
      <div className="dt-mem">
        <Avatar name={m.name} size="sm" />
        <span className="dt-mm"><b>{m.name}</b><span>{[m.role, m.committee].filter(Boolean).join(" ") || "غير متوفّر"}</span></span>
      </div>
    ),
  },
  { key: "phone", header: "رقم الجوّال", width: "1fr", render: (m) => (m.phone ? <span className="txt lat">{m.phone}</span> : <span className="txt na">غير متوفّر</span>) },
  { key: "joined", header: "تاريخ الانضمام", width: "1.1fr", render: (m) => <span className="txt">{m.joined}</span> },
  { key: "status", header: "الحالة", width: "0.9fr", render: (m) => <Badge tone={TONE[m.status]} dot>{TONE_LBL[m.status]}</Badge> },
];

/* ── سقالة القسم ── */
function Sec({ id, n, title, subtitle, children }: { id: string; n: number; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section id={id} className="gal-sec">
      <div className="gal-sec-hd">
        <span className="gal-num">{n}</span>
        <div><h2>{title}</h2><p>{subtitle}</p></div>
      </div>
      {children}
    </section>
  );
}
const Lbl = ({ children }: { children: React.ReactNode }) => <div className="gal-lbl">{children}</div>;

const TOC = [
  ["btn", "الأزرار"], ["badge", "الشارات"], ["field", "حقول الإدخال"], ["choice", "الاختيار ✦"],
  ["alert", "التنبيهات"], ["avatar", "الصور الرمزية"], ["card", "البطاقات"], ["tabs", "التبويبات"],
  ["empty", "الحالة الفارغة"], ["skel", "الهياكل"], ["toast", "المنبثقات"], ["menu", "القائمة"],
  ["modal", "النافذة"], ["pag", "الترقيم"], ["toolbar", "شريط الأدوات"], ["table", "الجدول"], ["mcard", "كرت العضو"],
];

export default function ComponentsGallery() {
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [tabU, setTabU] = useState("all");
  const [tabP, setTabP] = useState("all");
  const [tabS, setTabS] = useState("active");
  const [radio, setRadio] = useState("m");
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const tabItems = [
    { value: "all", label: "الكل", badge: "٢١٤" },
    { value: "active", label: "نشط", badge: "١٩٨" },
    { value: "pending", label: "قيد الإكمال", badge: "١٢" },
    { value: "suspended", label: "موقوف", badge: "٤" },
  ];

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf="معرض المكوّنات" />
          <h1>معرض المكوّنات</h1>
        </div>
      </div>

      <div className="gal">
        <nav className="gal-toc" aria-label="فهرس">
          {TOC.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        {/* 1 · الأزرار */}
        <Sec id="btn" n={1} title="الأزرار" subtitle="أربعة أنماط × ثلاثة أحجام + حالات التحميل والتعطيل والأيقونة.">
          <div className="gal-block">
            <Lbl>الأنماط</Lbl>
            <div className="gal-row">
              <Button variant="primary">رئيسيّ</Button>
              <Button variant="ghost">شبحيّ</Button>
              <Button variant="danger">خطر</Button>
              <Button variant="success">نجاح</Button>
              <Button variant="warning">تنبيه</Button>
            </div>
          </div>
          <div className="gal-block">
            <Lbl>شبحيّ (عاديّ + حسب النغمة)</Lbl>
            <div className="gal-row">
              <Button variant="ghost">شبحيّ</Button>
              <Button variant="ghost-danger">خطر</Button>
              <Button variant="ghost-success">نجاح</Button>
              <Button variant="ghost-warning">تنبيه</Button>
            </div>
          </div>
          <div className="gal-block">
            <Lbl>معكوس (على سطح داكن)</Lbl>
            <div className="gal-dark">
              <Button variant="inverse">معكوس</Button>
              <Button variant="danger">خطر</Button>
              <Button variant="success">نجاح</Button>
              <Button variant="warning">تنبيه</Button>
              <Button variant="inverse-ghost">شبحيّ</Button>
            </div>
          </div>
          <div className="gal-block">
            <Lbl>الأحجام</Lbl>
            <div className="gal-row">
              <Button size="sm">صغير</Button>
              <Button size="md">متوسط</Button>
              <Button size="lg">كبير</Button>
            </div>
          </div>
          <div className="gal-block">
            <Lbl>الحالات والأيقونة</Lbl>
            <div className="gal-row">
              <Button loading>تحميل…</Button>
              <Button disabled>معطّل</Button>
              <Button variant="primary"><span style={{ width: 17, height: 17 }}>{Ic.spark}</span>مع أيقونة</Button>
            </div>
          </div>
        </Sec>

        {/* 2 · الشارات */}
        <Sec id="badge" n={2} title="الشارات" subtitle="خمس نغمات دلالية × أنماط، مع نقطة/نبض/أيقونة/إزالة، وشارة العدّ.">
          <div className="gal-block">
            <Lbl>النغمات (ناعم)</Lbl>
            <div className="gal-row">
              <Badge tone="neutral">محايد</Badge>
              <Badge tone="info">معلومة</Badge>
              <Badge tone="success">نجاح</Badge>
              <Badge tone="warning">تنبيه</Badge>
              <Badge tone="danger">خطر</Badge>
            </div>
          </div>
          <div className="gal-block">
            <Lbl>الأنماط (على سطح فاتح)</Lbl>
            <div className="gal-row">
              <Badge tone="info" variant="soft">soft</Badge>
              <Badge tone="info" variant="solid">solid</Badge>
              <Badge tone="info" variant="outline">outline</Badge>
            </div>
          </div>
          <div className="gal-block">
            <Lbl>زجاجيّ glass (على سطح داكن/صورة فقط)</Lbl>
            <div className="gal-dark">
              <Badge variant="glass">زجاجيّ</Badge>
              <Badge variant="glass" dot>مباشر</Badge>
              <Badge variant="glass" icon={<span style={{ width: 13, height: 13, display: "inline-flex" }}>{Ic.spark}</span>}>مميّز</Badge>
            </div>
          </div>
          <div className="gal-block">
            <Lbl>المؤشّرات</Lbl>
            <div className="gal-row">
              <Badge tone="success" dot>نشط</Badge>
              <Badge tone="danger" live>مباشر</Badge>
              <Badge tone="info" icon={<span style={{ width: 13, height: 13, display: "inline-flex" }}>{Ic.bell}</span>}>إشعار</Badge>
              <Badge tone="neutral" onRemove={() => toast.info("أُزيل الوسم")}>وسم</Badge>
              <CountBadge tone="danger">9</CountBadge>
              <CountBadge tone="info">24</CountBadge>
            </div>
          </div>
        </Sec>

        {/* 3 · حقول الإدخال */}
        <Sec id="field" n={3} title="حقول الإدخال" subtitle="حقل بتسمية عائمة وأيقونة وحالات، ومنطقة نصّ، وقائمة منسدلة قابلة للبحث.">
          <div className="gal-block gal-col">
            <Field label="الاسم الكامل" icon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.user}</span>} innerIcon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.edit}</span>} placeholder="اكتب اسمك" />
            <Field label="البريد الإلكترونيّ" icon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.mail}</span>} innerIcon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.at}</span>} placeholder="you@adeeb.club" defaultValue="member@adeeb.club" success />
            <Field label="كلمة المرور" icon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.lock}</span>} innerIcon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.key}</span>} placeholder="••••••••" error="كلمة المرور قصيرة جدًّا" />
            <Field label="نبذة" icon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.note}</span>} innerIcon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.edit}</span>} placeholder="اكتب هنا…" helper="حقل اختياريّ يظهر في ملفّك العامّ." />
            <Textarea label="ملاحظات" icon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.note}</span>} innerIcon={<span style={{ width: 18, height: 18, display: "inline-flex" }}>{Ic.edit}</span>} placeholder="اكتب هنا…" helper="حتّى ٢٠٠ حرف." rows={3} />
            <Select
              label="القسم"
              searchable
              options={[
                { value: "media", label: "الإعلام", group: "الأقسام" },
                { value: "tech", label: "التقنية", group: "الأقسام" },
                { value: "hr", label: "الموارد البشرية", group: "الأقسام" },
                { value: "design", label: "لجنة التصميم", group: "اللجان" },
                { value: "dev", label: "لجنة التطوير", group: "اللجان" },
              ]}
              defaultValue="tech"
            />
          </div>
        </Sec>

        {/* 4 · الاختيار — المتحرّك */}
        <Sec id="choice" n={4} title="الاختيار ✦" subtitle="مربّع اختيار وراديو ومفتاح — بحركة الرسم + الارتداد المتّفق عليها. هذه هي الحركة نفسها في checkbox الجدول.">
          <div className="gal-block">
            <Lbl>مربّع الاختيار (رسم ✓ + ارتداد)</Lbl>
            <div className="gal-row" style={{ gap: 24 }}>
              <Checkbox label="افتراضيّ" />
              <Checkbox label="محدّد مبدئيًّا" defaultChecked />
              <Checkbox label="معطّل" disabled />
            </div>
          </div>
          <div className="gal-block">
            <Lbl>مع وصف</Lbl>
            <div className="gal-col">
              <Checkbox label="إشعارات البريد" description="استقبل ملخّصًا أسبوعيًّا بأحدث الأنشطة." defaultChecked />
            </div>
          </div>
          <div className="gal-block">
            <Lbl>راديو (اختيار واحد)</Lbl>
            <div className="gal-row" style={{ gap: 24 }}>
              <Radio name="g" label="عضو" checked={radio === "m"} onChange={() => setRadio("m")} />
              <Radio name="g" label="قائد" checked={radio === "l"} onChange={() => setRadio("l")} />
              <Radio name="g" label="مشرف" checked={radio === "s"} onChange={() => setRadio("s")} />
            </div>
          </div>
          <div className="gal-block">
            <Lbl>بطاقات قابلة للاختيار</Lbl>
            <div className="gal-col" style={{ maxWidth: 460 }}>
              <Radio name="plan" card icon={<span style={{ width: 20, height: 20, display: "inline-flex" }}><ShieldCheck size={20} aria-hidden /></span>} label="صلاحيات كاملة" description="وصول لكلّ الأقسام والإجراءات." defaultChecked />
              <Radio name="plan" card icon={<span style={{ width: 20, height: 20, display: "inline-flex" }}><Eye size={20} aria-hidden /></span>} label="قراءة فقط" description="عرض دون تعديل." />
            </div>
          </div>
          <div className="gal-block">
            <Lbl>المفاتيح</Lbl>
            <div className="gal-col" style={{ maxWidth: 460 }}>
              <Switch label="الوضع الليليّ" defaultChecked />
              <Switch row label="تفعيل الإشعارات" description="أصوات وتنبيهات فورية." defaultChecked />
              <Switch label="معطّل" disabled />
            </div>
          </div>
        </Sec>

        {/* 5 · التنبيهات */}
        <Sec id="alert" n={5} title="التنبيهات" subtitle="خمس نغمات بأسلوب Aurora، مع عنوان وإجراءات وإغلاق وصيغة مضغوطة.">
          <div className="gal-block gal-col" style={{ maxWidth: 640 }}>
            <Alert tone="info" title="معلومة">تُحفظ التغييرات تلقائيًّا أثناء التحرير.</Alert>
            <Alert tone="success" title="تمّ الحفظ">حُدِّثت بيانات العضو بنجاح.</Alert>
            <Alert tone="warning" title="انتبه" actions={<><Button size="sm" variant="ghost-warning">لاحقًا</Button><Button size="sm" variant="warning">تحديث الآن</Button></>}>
              اكتمل ٨٠٪ من ملفّك؛ أكمِل البيانات لتفعيل كامل الصلاحيات.
            </Alert>
            <Alert tone="danger" title="خطأ" onClose={() => toast.info("أُغلق التنبيه")} actions={<><Button size="sm" variant="ghost-danger">تجاهل</Button><Button size="sm" variant="danger">إعادة المحاولة</Button></>}>
              تعذّر الاتصال بالخادم؛ حاول مجدّدًا.
            </Alert>
            <Alert tone="neutral" compact>تنبيه مضغوط بسطر واحد بلا عنوان.</Alert>
          </div>
        </Sec>

        {/* 6 · الصور الرمزية */}
        <Sec id="avatar" n={6} title="الصور الرمزية" subtitle="مربّع بزوايا مستديرة بتدرّج الهوية، خمسة أحجام ومؤشّرات حالة.">
          <div className="gal-block">
            <Lbl>الأحجام</Lbl>
            <div className="gal-row">
              <Avatar name="سارة الفيصل" size="xs" />
              <Avatar name="سارة الفيصل" size="sm" />
              <Avatar name="سارة الفيصل" size="md" />
              <Avatar name="سارة الفيصل" size="lg" />
              <Avatar name="سارة الفيصل" size="xl" />
            </div>
          </div>
          <div className="gal-block">
            <Lbl>مؤشّرات الحالة</Lbl>
            <div className="gal-row">
              <Avatar name="نشط" size="lg" status="online" />
              <Avatar name="بعيد" size="lg" status="away" />
              <Avatar name="مشغول" size="lg" status="busy" />
              <Avatar name="غير متّصل" size="lg" status="offline" />
            </div>
          </div>
        </Sec>

        {/* 7 · البطاقات */}
        <Sec id="card" n={7} title="البطاقات" subtitle="بطاقة قابلة للتركيب — رأس/جسم/تذييل وأنماط وحركة مرور.">
          <div className="gal-cards">
            <Card>
              <CardHeader icon={<span style={{ width: 20, height: 20, display: "inline-flex" }}>{Ic.users}</span>} title="الأعضاء" subtitle="إجمالي المسجّلين" />
              <CardBody><p style={{ fontSize: 30, fontWeight: 700 }} className="lat">214</p></CardBody>
              <CardFooter><span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>+12 هذا الشهر</span><Badge tone="success" dot>+6٪</Badge></CardFooter>
            </Card>
            <Card variant="elevated" interactive>
              <CardMedia><span style={{ width: 34, height: 34, color: "#fff", display: "inline-flex" }}><Sparkle size={34} aria-hidden /></span></CardMedia>
              <CardBody><h3 style={{ fontWeight: 700, marginBottom: 6 }}>بطاقة تفاعلية</h3><p style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.6 }}>مرّر المؤشّر لرؤية التكبير والحدّ الملوّن.</p></CardBody>
            </Card>
          </div>
        </Sec>

        {/* 8 · التبويبات */}
        <Sec id="tabs" n={8} title="التبويبات" subtitle="ثلاثة أنماط: سطر سفليّ، حبوب، مقسّم — مع شارات عدّ.">
          <div className="gal-block"><Lbl>سطر سفليّ (underline)</Lbl><Tabs variant="underline" items={tabItems} value={tabU} onValueChange={setTabU} /></div>
          <div className="gal-block"><Lbl>حبوب (pill)</Lbl><Tabs variant="pill" items={tabItems} value={tabP} onValueChange={setTabP} /></div>
          <div className="gal-block"><Lbl>مقسّم (segmented)</Lbl><Tabs variant="segmented" items={tabItems.slice(0, 3)} value={tabS} onValueChange={setTabS} /></div>
        </Sec>

        {/* 9 · الحالة الفارغة */}
        <Sec id="empty" n={9} title="الحالة الفارغة" subtitle="«aurora» ترحيبية لغياب العناصر، و«soft» لغياب نتائج البحث.">
          <div className="gal-cards">
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
              <EmptyState variant="aurora" icon={Ic.users} title="ابدأ بإضافة عضو" description="لا أعضاء بعد. أضِف أوّل عضو لتظهر بياناته هنا." action={<Button variant="primary">إضافة عضو</Button>} />
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
              <EmptyState variant="soft" icon={Ic.eye} title="لا نتائج مطابقة" description="جرّب تعديل البحث أو المرشّحات." action={<Button variant="ghost">مسح المرشّحات</Button>} />
            </div>
          </div>
        </Sec>

        {/* 10 · الهياكل */}
        <Sec id="skel" n={10} title="الهياكل" subtitle="لبنات تحميل بلمعان منزلق — تُشكَّل بالأبعاد.">
          <div className="gal-block gal-col" style={{ maxWidth: 420 }}>
            <div className="gal-row" style={{ gap: 12 }}>
              <Skeleton width={54} height={54} radius={15} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <Skeleton width="70%" height={13} />
                <Skeleton width="45%" height={11} />
              </div>
            </div>
            <Skeleton width="100%" height={12} />
            <Skeleton width="88%" height={12} />
            <Skeleton width="60%" height={12} />
          </div>
        </Sec>

        {/* 11 · المنبثقات */}
        <Sec id="toast" n={11} title="التنبيهات المنبثقة" subtitle="أربع نغمات بشريط تقدّم — اضغط لتجربتها.">
          <div className="gal-row">
            <Button variant="primary" onClick={() => toast.success("تمّ الحفظ بنجاح.")}>نجاح</Button>
            <Button variant="danger" onClick={() => toast.error("حدث خطأ ما.")}>خطأ</Button>
            <Button variant="ghost" onClick={() => toast.info("معلومة عابرة.")}>معلومة</Button>
            <Button variant="ghost" onClick={() => toast.warning("انتبه لهذا الإجراء.")}>تنبيه</Button>
          </div>
        </Sec>

        {/* 12 · القائمة المنسدلة */}
        <Sec id="menu" n={12} title="القائمة المنسدلة" subtitle="قائمة إجراءات بمجموعات ومنطقة خطر — تُعرض في طبقة عائمة.">
          <div className="gal-row">
            <DropdownMenu
              triggerClassName="dt-dots"
              groups={[
                { header: "إجراءات", items: [
                  { label: "عرض الملف", icon: Ic.eye, onSelect: () => toast.info("عرض") },
                  { label: "تعديل", icon: Ic.edit, onSelect: () => toast.info("تعديل") },
                ] },
                { header: "منطقة الخطر", danger: true, items: [{ label: "حذف", icon: Ic.trash, danger: true, onSelect: () => toast.error("حُذف") }] },
              ]}
            />
            <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>← اضغط الزرّ (⋯)</span>
          </div>
        </Sec>

        {/* 13 · النافذة */}
        <Sec id="modal" n={13} title="النافذة" subtitle="نافذة مركزية بطبقة تعتيم وقفل تمرير الخلفية.">
          <Button variant="primary" onClick={() => setModal(true)}>افتح النافذة</Button>
          <Modal
            open={modal} onClose={() => setModal(false)}
            title="تأكيد الإجراء" description="مثال على نافذة حوارية."
            footer={<><Button variant="ghost" onClick={() => setModal(false)}>إلغاء</Button><Button variant="primary" onClick={() => { setModal(false); toast.success("تمّ التأكيد"); }}>تأكيد</Button></>}
          >
            <p style={{ lineHeight: 1.7, color: "var(--color-text-muted)" }}>هذه معاينة للنافذة الحوارية بكامل بنيتها: رأس بعنوان ووصف، جسم قابل للتمرير، وتذييل بالإجراءات.</p>
          </Modal>
        </Sec>

        {/* 14 · الترقيم */}
        <Sec id="pag" n={14} title="الترقيم" subtitle="أرقام الصفحات مع «…»، واختيار عدد الصفوف ومدى العرض.">
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 14, padding: "4px 8px" }}>
            <Pagination page={page} pageSize={pageSize} total={214} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} noun="عضو" />
          </div>
        </Sec>

        {/* 15 · شريط الأدوات */}
        <Sec id="toolbar" n={15} title="شريط الأدوات" subtitle="بحث + مرشّحات + مبدّل عرض؛ يتحوّل لإجراءات جماعية عند التحديد.">
          <Toolbar
            searchPlaceholder="ابحث بالاسم أو رقم الجوّال…"
            search={search} onSearch={setSearch}
            filters={[
              { key: "dept", label: "القسم", options: [{ value: "media", label: "الإعلام" }, { value: "tech", label: "التقنية" }] },
              { key: "role", label: "الدور", options: [{ value: "member", label: "عضو" }, { value: "lead", label: "قائد" }] },
            ]}
            view={view} onViewChange={setView}
          />
        </Sec>

        {/* 16 · الجدول — checkbox متحرّك */}
        <Sec id="table" n={16} title="الجدول ✦" subtitle="جدول مضبوط بالإعداد مع تحديد (بمربّع الاختيار المتحرّك نفسه)، إجراءات صفّ، وتذييل ترقيم.">
          <Toolbar
            searchPlaceholder="ابحث…" search="" onSearch={() => {}}
            selectedCount={selected.size}
            onClearSelection={() => setSelected(new Set())}
            bulkActions={<><button type="button" className="tb-ba" onClick={() => toast.info("تصدير")}>تصدير</button><button type="button" className="tb-ba dg" onClick={() => { toast.success("حُذف المحدّدون"); setSelected(new Set()); }}>حذف</button></>}
          />
          <DataTable
            columns={tableCols}
            rows={sampleMembers}
            getRowId={(m) => m.id}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            rowActions={(m) => [
              { header: "إجراءات", items: [
                { label: "عرض الملف", icon: Ic.eye, onSelect: () => toast.info(`عرض ${m.name}`) },
                { label: "تعديل", icon: Ic.edit, onSelect: () => toast.info(`تعديل ${m.name}`) },
              ] },
              { header: "منطقة الخطر", danger: true, items: [{ label: "حذف العضو", icon: Ic.trash, danger: true, onSelect: () => toast.error(`حُذف ${m.name}`) }] },
            ]}
          />
          <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 10 }}>
            ✦ جرّب تحديد صفّ أو «تحديد الكل» — لاحظ رسم علامة الصحّ وارتدادها، ونفس الحركة في القسم الرابع.
          </p>
        </Sec>

        {/* 17 · كرت العضو */}
        <Sec id="mcard" n={17} title="كرت العضو" subtitle="بطاقة Aurora بشريط الهوية وباترنها، الدور واللجنة، والبيانات الأساسية.">
          <div className="gal-cards">
            {sampleMembers.slice(0, 3).map((m) => (
              <MemberCard
                key={m.id} member={m}
                onOpen={() => toast.info(`تفاصيل ${m.name}`)}
                onRestore={() => toast.success("أُعيدت العضوية")}
                actions={[
                  { header: "إجراءات", items: [{ label: "عرض الملف", icon: Ic.eye, onSelect: () => toast.info("عرض") }, { label: "تعديل", icon: Ic.edit, onSelect: () => toast.info("تعديل") }] },
                  { header: "منطقة الخطر", danger: true, items: [{ label: "إنهاء العضوية", icon: Ic.trash, danger: true, onSelect: () => toast.error("أُنهيت العضوية") }] },
                ]}
              />
            ))}
          </div>
        </Sec>
      </div>
    </>
  );
}
