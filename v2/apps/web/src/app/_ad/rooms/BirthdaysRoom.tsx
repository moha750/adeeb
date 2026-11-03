"use client";

/**
 * غرفةُ أعياد الميلاد على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `members/birthdays/BirthdaysView.tsx` القديم:
 * البحثُ بالاسم، و«اليومُ» من الخادم بتوقيت الرياض فيُحسب العدُّ التنازليّ والعمرُ منه مرّةً، ورسمُ بطاقة التهنئة بـ`card.ts`
 * كما هو (ورقةُ المشاركة في الهاتف، والتنزيلُ في الحاسب) بعد تسخينها عند الفتح، والنطاقُ يُقال حيث يُرى.
 *
 * **والمواليدُ تحت شهورها** (`group`، محمد ٢٠٢٦-١١-٠٢): «بعد 139 يومًا» لا تقول أيَّ شهر، فشريطُ الشهر فوق مواليده — كما كانت
 * القديمةُ تقسمها شهورًا. والشهرُ شهرُ الميلاد القادم بسنته (من فات ميلادُه هذا الشهرَ يقع تحت الشهر نفسِه من السنة القادمة في
 * آخر الكشف)، فالأقربُ أوّلًا. والتجميعُ يجعل الغرفةَ قائمةً وحدها (`listOnly`) كالإنذارات.
 */
import type { RoomView } from "../view";
import { BIRTHDAYS_ROOM } from "./birthdays.meta";
import { useEffect, useMemo, useState } from "react";
import { Button, Modal, matchesSearch } from "@adeeb/design-system";
import { Cake, CalendarBlank, CalendarDots, Confetti, Hourglass, ImageSquare } from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { BirthdayRow } from "@/app/dashboard/members/birthdays/data";
import { prewarmBirthdayCard, renderBirthdayCard } from "@/app/dashboard/members/birthdays/card";
import { shareOrDownloadBlob } from "@/lib/download";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { AdActs, AdCard, AdGroupHead, AdNote, AdRow, type AdFigure, type AdMeta } from "../primitives";
import { CollectionRoom, type FilterDef, type Position } from "../collection";

const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const AR_MEMBER: ArForms = ["عضوٌ واحد", "عضوان", "أعضاء", "عضوًا"];
const AR_DAY: ArForms = ["يومٌ واحد", "يومان", "أيّام", "يومًا"];
const AR_YEAR: ArForms = ["سنةٌ واحدة", "سنتان", "سنوات", "سنةً"];

/** نطاقُ الرائي — تقرّره الصفحةُ بالقدرة، وتقوله الغرفةُ بلا أن تحسبه. */
export type BirthdayScope = "all" | "supervised";
type Today = { y: number; m0: number; d: number };

/**
 * صفٌّ مشتقّ — «الآن» من الخادم (بتوقيت الرياض) فيُحسب العدُّ التنازليّ والعمرُ مرّةً واحدة، بلا لحظةٍ في المتصفّح تخالف
 * الخادم (كما في القديمة). و`nextYear` سنةُ عيد الميلاد القادم: سنةُ الكعب.
 */
type Derived = BirthdayRow & {
  month: number; // 0–11
  day: number;
  birthYear: number;
  daysUntil: number;
  ageTurning: number;
  isToday: boolean;
  nextYear: number;
};

function derive(row: BirthdayRow, today: Today): Derived {
  const [y, m, d] = row.birthDate.split("-").map(Number);
  const month = (m || 1) - 1;
  const day = d || 1;
  const t = new Date(today.y, today.m0, today.d);
  let nb = new Date(today.y, month, day);
  if (nb < t) nb = new Date(today.y + 1, month, day);
  const daysUntil = Math.round((nb.getTime() - t.getTime()) / 86400000);
  return {
    ...row, month, day, birthYear: y || 0, daysUntil, ageTurning: nb.getFullYear() - (y || 0), isToday: daysUntil === 0,
    nextYear: nb.getFullYear(),
  };
}

/** «اليوم»، «غدًا»، «بعد يومين»، ثمّ «بعد 5 أيّام»، «بعد 12 يومًا» — المثنّى بعد «بعد» مجرورٌ فلا يأتي من صيغ العدّ. */
function countdownText(d: number): string {
  if (d === 0) return "اليوم";
  if (d === 1) return "غدًا";
  if (d === 2) return "بعد يومين";
  return `بعد ${arCount(d, AR_DAY)}`;
}

export function BirthdaysRoom({ members, todayIso, scope = "all", view }: {
  members: BirthdayRow[];
  /** «اليوم» بتوقيت الرياض (`yyyy-mm-dd`) — يحسبه الخادم كما في القديمة. */
  todayIso: string;
  scope?: BirthdayScope;
  /** يمرّره كلُّ مسارٍ على القالب؛ و«اليومُ» هنا `todayIso` كما كان. */
  serverNow: number;
  view?: RoomView;
}) {
  const toast = useToast();
  /**
   * **معاينةُ التهنئة قبل تنزيلها** (محمد ٢٠٢٦-١١-٠٣): الفعلُ يفتح نافذةً فيها البطاقةُ كما ستخرج، و«نزّل» فيها. كانت النقرةُ
   * تُنزّلها مباشرةً فلا تُرى إلّا في الاستوديو. والبطاقةُ تُرسم حين تُفتح النافذة، فـ«نزّل» يسلّم صورةً جاهزة: ورقةُ المشاركة في
   * الهاتف تُفتح بإذن اللمسة نفسِها بلا انتظارٍ يُسقطه (كان التوليدُ بعد النقرة يُسقطه أحيانًا فترتدّ إلى التنزيل).
   */
  const [preview, setPreview] = useState<Derived | null>(null);
  const [shot, setShot] = useState<{ id: string; blob: Blob; url: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const today = useMemo<Today>(() => {
    const [y, m, d] = todayIso.split("-").map(Number);
    return { y: y || 2000, m0: (m || 1) - 1, d: d || 1 };
  }, [todayIso]);

  /** الكشفُ كلُّه بترتيب «الأقرب» القديم: أقربُ ميلادٍ قادم، فالشهرُ فاليومُ عند التساوي. */
  const rows = useMemo(
    () => members.map((r) => derive(r, today)).sort((a, b) => a.daysUntil - b.daysUntil || a.month - b.month || a.day - b.day),
    [members, today],
  );

  /**
   * **المواضعُ كاردُ الإحصاء القديمة** («ميلاد اليوم»، «خلال أسبوع»، «مواليد هذا الشهر») بشروطها نفسِها — فالعددُ بجانب كلّ
   * موضعٍ يغني عن الكارد، وينقل إليه بنقرة. و«الكلّ» زرُّ «الأقرب» القديم: الكشفُ كلُّه بأقرب ميلاد.
   */
  const positions = useMemo<Position<Derived>[]>(() => [
    { key: "all", label: "الكلّ", match: () => true, empty: "لا مواليد بعد." },
    { key: "today", label: "اليوم", match: (r) => r.isToday, empty: "لا عيد ميلاد اليوم." },
    { key: "week", label: "خلال أسبوع", match: (r) => r.daysUntil <= 7, empty: "لا عيد ميلاد خلال أسبوع." },
    { key: "month", label: "هذا الشهر", match: (r) => r.month === today.m0, empty: `لا أعياد ميلاد في ${MONTHS[today.m0]}.` },
  ], [today.m0]);

  /** **«حسب الشهر» القديم مرشّحٌ**: شهورُ الكشف بترتيب التقويم (الفارغةُ لا تظهر، كما كانت تُخفى)، ولا يظهر إلّا حين يفرّق. */
  const filters = useMemo<FilterDef<Derived>[]>(() => {
    const months = [...new Set(rows.map((r) => r.month))].sort((a, b) => a - b);
    return months.length > 1
      ? [{ key: "month", label: "الشهر", options: months.map((m) => ({ value: String(m), label: MONTHS[m] })), match: (r, v) => String(r.month) === v }]
      : [];
  }, [rows]);

  // تسخينُ القالب والخطّ عند فتح الغرفة — فتُولَّد البطاقةُ فورًا عند النقرة ويبقى إذنُ اللمسة حيًّا لورقة المشاركة
  // (وإلّا سقط الإذنُ وارتدّت إلى التنزيل). انظر `prewarmBirthdayCard`.
  useEffect(() => { prewarmBirthdayCard(); }, []);

  useEffect(() => {
    if (!preview) return;
    let alive = true;
    let url: string | null = null;
    renderBirthdayCard({ name: preview.name, favoriteColor: preview.favoriteColor }).then(
      (blob) => {
        url = URL.createObjectURL(blob);
        if (alive) setShot({ id: preview.id, blob, url });
      },
      (e) => {
        if (!alive) return;
        toast.error(e instanceof Error ? e.message : "تعذّر توليد التهنئة.");
        setPreview(null);
      },
    );
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [preview, toast]);
  const ready = shot && preview && shot.id === preview.id ? shot : null;

  /** رسائلُ النتيجة كما في القديمة حرفًا؛ والنافذةُ تُغلق بعد التسليم، وتبقى إن أُلغيت ورقةُ المشاركة. */
  const onDownload = async () => {
    if (!ready || !preview || saving) return;
    setSaving(true);
    try {
      const how = await shareOrDownloadBlob(ready.blob, `تهنئة-${preview.name.trim() || "عضو"}.png`);
      if (how === "shared") toast.success(`تهنئة «${preview.name}» جاهزة.`);
      else if (how === "downloaded") toast.success(`نُزّلت تهنئة «${preview.name}».`);
      if (how !== "cancelled") setPreview(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد التهنئة.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * **الكرتُ والسطرُ مصدرُهما واحد**: الاسمُ عنوانًا، ثمّ العدُّ التنازليّ سطرَ حالٍ بلونه (عيدُ اليوم أخضرُ بقصاصاته، وكان شارةً
   * خضراء في عمود «قادم») ثمّ سنةُ المولد (كانت تحت الاسم). والكعبُ عيدُ الميلاد القادم: يومُه وشهرُه (كان عمودَ «تاريخ
   * الميلاد») وسنتُه — فلا تُقرأ «14 مارس 2027» تاريخَ مولد. و«العمر الجديد» رقمُ الكرت وعمودُ السطر (كان «يُتمّ» بصيغة المذكّر، محمد ٢٠٢٦-١١-٠٣).
   */
  const info = (r: Derived): AdMeta[] => [
    r.isToday ? { icon: <Confetti />, text: countdownText(0), tone: "ok" } : { icon: <Hourglass />, text: countdownText(r.daysUntil) },
    { icon: <CalendarDots />, text: `مواليد ${r.birthYear}` },
  ];
  const stubOf = (r: Derived) => ({ big: String(r.day), small: `${MONTHS[r.month]} ${r.nextYear}` });

  /** شريطُ الشهر: اسمُه (وسنتُه إن لم تكن هذه)، وعددُ مواليده، و«هذا الشهر» للجاري — كلمةً لا لونًا. */
  const group = {
    of: (r: Derived) => `${r.nextYear}-${r.month}`,
    order: (a: Derived[], b: Derived[]) => Math.min(...a.map((r) => r.daysUntil)) - Math.min(...b.map((r) => r.daysUntil)),
    inner: (a: Derived, b: Derived) => a.daysUntil - b.daysUntil,
    head: (items: Derived[]) => {
      const r = items[0];
      const now = r.month === today.m0 && r.nextYear === today.y;
      return (
        <AdGroupHead
          title={r.nextYear === today.y ? MONTHS[r.month] : `${MONTHS[r.month]} ${r.nextYear}`}
          sub={[{ icon: <Cake />, text: now ? `هذا الشهر، ${arCount(items.length, AR_MEMBER)}` : arCount(items.length, AR_MEMBER) }]}
        />
      );
    },
  };
  const figures = (r: Derived): AdFigure[] => [{ icon: <Cake />, value: arCount(r.ageTurning, AR_YEAR), label: "العمر الجديد" }];

  /** فعلٌ واحدٌ في القديمة (زرُّ «حفظ» في عمود «التهنئة»)، ولا وجهةَ نقرٍ للصفّ: فهو الأساسيّ — «افتح التهنئة» على وزن «افتح الرسالة» (لا «معاينة»: محمد ٢٠٢٦-١١-٠٣)، و«نزّل» فيها (لا «حفظ»). */
  const acts = (r: Derived, inRow?: boolean) => (
    <AdActs inRow={inRow} primary={{ label: "افتح التهنئة", icon: <ImageSquare />, onClick: () => setPreview(r) }} ops={[]} />
  );

  return (
    <>
    <CollectionRoom<Derived>
      navPath={BIRTHDAYS_ROOM.navPath}
      title={BIRTHDAYS_ROOM.title}
      noun={AR_MEMBER}
      items={rows}
      positions={positions}
      defaultPosition="all"
      searchPlaceholder="ابحث بالاسم…"
      matchSearch={(r, q) => matchesSearch(q, r.name)}
      filters={filters}
      // النطاقُ يُقال حيث يُرى — فلا يُحسب الجزءُ كلًّا (كان حالَ رأس الصفحة، واللوحُ لا سطرَ حالٍ فيه)
      notice={scope === "supervised" ? <AdNote tone="info">مواليد من تشرف عليهم</AdNote> : undefined}
      viewKey={BIRTHDAYS_ROOM.viewKey}
      initialView={view}
      idOf={(r) => r.id}
      group={group}
      table={{
        // الترتيبُ بعيد الميلاد من رأس عموده كجداول الغرف كلّها (محمد ٢٠٢٦-١١-٠١؛ لم يكن في الجدول القديم)
        head: "العضو",
        stub: { key: "date", label: "عيد الميلاد", icon: <CalendarBlank />, sortBy: (r) => r.daysUntil },
        columns: [{ key: "age", label: "العمر الجديد", icon: <Cake /> }],
      }}
      emptyAll={
        scope === "supervised"
          ? {
              title: "لا مواليد في نطاق إشرافك",
              desc: "لا يظهر هنا إلّا مواليد من تشرف عليهم، فإن لم تُسنَد إليك لجانٌ بعد، أو لم يسجّل أعضاؤها تواريخهم، بقيت الشاشة فارغة.",
            }
          : { title: "لا مواليد مسجّلة بعد", desc: "لا يوجد أعضاء نشطون بتاريخ ميلاد مسجّل حاليًّا." }
      }
      renderCard={(r) => (
        <AdCard
          key={r.id}
          seed={r.id}
          stub={stubOf(r)}
          title={r.name}
          meta={info(r)}
          figures={figures(r)}
          foot={acts(r)}
        />
      )}
      renderRow={(r) => (
        <AdRow
          key={r.id}
          title={r.name}
          stub={{ ...stubOf(r), seed: r.id }}
          sub={info(r)}
          cells={figures(r).map((f) => ({ label: f.label, value: f.value }))}
          acts={acts(r, true)}
        />
      )}
    />
    <Modal
      open={!!preview}
      onClose={() => setPreview(null)}
      busy={saving}
      title={preview ? `تهنئة ${preview.name}` : ""}
      description="كما ستُنزَّل"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={() => setPreview(null)} disabled={saving}>إغلاق</Button>
          <Button variant="primary" size="md" loading={saving} disabled={!ready} onClick={() => void onDownload()}>
            <DownloadSimple aria-hidden /> نزّل التهنئة
          </Button>
        </>
      }
    >
      <div className="ad-shot">
        {/* eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) */}
        {ready ? <img src={ready.url} alt={`بطاقة تهنئة ${preview?.name ?? ""}`} /> : <i className="ad-skel" aria-label="تُرسم البطاقة…" />}
      </div>
    </Modal>
    </>
  );
}
