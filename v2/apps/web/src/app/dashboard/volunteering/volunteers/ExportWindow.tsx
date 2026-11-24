"use client";

/**
 * **نافذةُ التصدير** (مسارُ «التصدير»، اعتمد محمد خطّتها ٢٠٢٦-١١-٢٤): ملفُّ Excel من سجلّ المتطوّعين، على قالب النوافذ ونمطِ نافذة
 * التفصيل (`.ad-evd`: النافذةُ هي الوعاء، وأقسامُها بلا حدٍّ ولا أرض يفصلها خيط). ترتيبُها ترتيبُ قالب النوافذ: مَن أوّلًا، ثمّ
 * الاختياراتُ القصيرة، ثمّ ما يُكتب. والسطرُ على لوحها يقول ما سيخرج وأنت تختار («سيخرج 42 متطوّعًا في 9 أوراق»)، والخادمُ يعيد
 * الحسابَ كلَّه ولا يأخذ العددَ منها (`volunteers/export.ts`).
 *
 * **والأسئلةُ آبارٌ** بلا خطوط (محمد ٢٠٢٦-١١-٢٤ بعد ثلاثة أشكال: صفوفُ لوحة التصفية بخطّين، ثمّ خطوتان، ثمّ قوائمُ منسدلةٌ كلُّها):
 * ما يقبل أكثرَ من اختيارٍ بئرُ الاختيار ومربّعاتُه ظاهرة (`AdCheckWell`: الحال، والجنس، والرغبة، وترتيبُها، والأعمدة)، وما هو
 * اختيارٌ واحدٌ قائمةٌ منسدلة (`Select`: من الجدول، وبدايةُ التطوّع، والأوراق). والمدّةُ حقلا التاريخ المعتمدان.
 */
import { useMemo, useState } from "react";
import { Button, Field, Modal, Select } from "@adeeb/design-system";
import { CalendarBlank, CalendarCheck, CheckSquare, GenderIntersex, IdentificationCard, ListNumbers, Stack, Table, UsersThree } from "@phosphor-icons/react";
import { ArrowCounterClockwise, Checks } from "@/app/_components/glyphs";
import { AdCheckWell } from "@/app/_ad/checks";
import { AdButton } from "@/app/_ad/primitives";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { AdSection } from "@/app/_ad/account";
import { downloadBlob } from "@/lib/download";
import { clubDayKey } from "@/lib/dates";
import {
  ALL_COLUMNS, BASE_COLUMNS, COLUMNS, DEFAULT_SPEC, badRange, exportLine, planSheets, selectVolunteers,
  type ExportRank, type ExportScope, type ExportSpec, type ExportStand, type ExportVolunteer,
} from "@/lib/volunteersExport";
import type { ExportResult } from "./export";

/** ما تراه الغرفةُ لحظةَ فتح النافذة: ما فيها الآن بترتيبه، والمحدَّدون إن كان تحديد، والنطاقُ الذي فُتحت عليه */
export type ExportOpen = { initial: ExportScope; room: string[]; picked: string[] };

/** «ترتيبها عنده»: تُختار معًا (الأولى والثالثة بلا الثانية)، ولا اختيارَ = بأيّ ترتيب */
const RANKS: { value: string; label: string }[] = [
  { value: "1", label: "الأولى" },
  { value: "2", label: "الثانية" },
  { value: "3", label: "الثالثة" },
];

const STANDS: { value: ExportStand; label: string }[] = [
  { value: "active", label: "متطوّعون" },
  { value: "members", label: "صاروا أعضاء" },
  { value: "former", label: "سابقون" },
];

const SINCE = [
  { value: "", label: "الكلّ" },
  { value: "7", label: "آخر 7 أيّام" },
  { value: "30", label: "آخر 30 يومًا" },
  { value: "range", label: "مدّة أحدّدها" },
];

/** الأعمدةُ كما كانت مربّعاتٍ ظاهرة، والاسمُ مختارٌ لا يُلغى */
const COLUMN_OPTIONS = COLUMNS.map((c) => ({ value: c.key as string, label: c.label, fixed: c.fixed }));

export function ExportWindow({ open, rows, committees, onClose, run }: {
  open: ExportOpen | null;
  rows: ExportVolunteer[];
  committees: { id: number; name: string }[];
  onClose: () => void;
  run: (spec: ExportSpec) => Promise<ExportResult>;
}) {
  return (
    // مفتاحٌ لكلّ فتحة: النافذةُ تبدأ من اختيارها الأوّل كلَّ مرّة، ونطاقُها نطاقُ ما فُتحت عليه
    open ? <ExportBody key={`${open.initial}-${open.room.length}-${open.picked.length}`} at={open} rows={rows} committees={committees} onClose={onClose} run={run} /> : null
  );
}

function ExportBody({ at, rows, committees, onClose, run }: {
  at: ExportOpen;
  rows: ExportVolunteer[];
  committees: { id: number; name: string }[];
  onClose: () => void;
  run: (spec: ExportSpec) => Promise<ExportResult>;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // يبدأ من المحدَّدين إن كان تحديد، وإلّا فالكلّ. وسقط «ما في الغرفة الآن» (٢٠٢٦-١١-٢٤): عبارةٌ لا يفهمها إلّا من بناها، ومعناها في «الحال»
  const [spec, setSpec] = useState<ExportSpec>({ ...DEFAULT_SPEC, scope: at.picked.length > 0 ? "picked" : "all" });
  const set = (p: Partial<ExportSpec>) => setSpec((s) => ({ ...s, ...p }));
  const today = useMemo(() => clubDayKey(new Date().toISOString()), []);

  // المعرّفاتُ تتبع النطاق: الكلُّ لا يحملها (الخادمُ يقرأ الكلَّ بنفسه)
  const full: ExportSpec = { ...spec, ids: spec.scope === "room" ? at.room : spec.scope === "picked" ? at.picked : [] };
  // لجانُ القائمة: النشطةُ بترتيبها، ثمّ ما رغبه أحدٌ ولم يعد نشطًا — فلا يُصدَّر من لا يجد لجنتَه في القائمة
  const choices = useMemo(() => {
    const out = committees.map((c) => ({ value: String(c.id), label: c.name }));
    for (const v of rows) for (const p of v.prefs) if (!out.some((o) => o.value === String(p.id))) out.push({ value: String(p.id), label: p.name });
    return out;
  }, [committees, rows]);
  const anyNoGender = rows.some((v) => v.gender === null);

  const list = selectVolunteers(rows, full, today);
  const sheets = planSheets(list, full, committees);
  const wrongRange = badRange(full);
  const allCols = ALL_COLUMNS.every((k) => spec.columns.includes(k));
  const anyGender = rows.some((v) => v.gender !== null);
  // **«ورقة لكلّ لجنة» مع لجنةٍ واحدة لا معنى لها** (محمد ٢٠٢٦-١١-٢٤): تُخرج ورقةً واحدةً باسم اللجنة كأنّها «ورقة واحدة»، فتغيب
  const splits = [
    { value: "one", label: "ورقة واحدة" },
    ...(spec.committees.length === 1 ? [] : [{ value: "committee", label: "ورقة لكلّ لجنة" }]),
    ...(anyGender ? [{ value: "gender", label: "ورقة لكلّ جنس" }] : []),
  ];
  const setCommittees = (v: string[]) =>
    set({ committees: v, ranks: v.length ? spec.ranks : [], ...(v.length === 1 && spec.split === "committee" ? { split: "one" as const } : {}) });

  const go = async () => {
    setBusy(true);
    const r = await run(full);
    setBusy(false);
    if (!r.ok) { toast.error(r.message); return; }
    const bin = atob(r.file.data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    downloadBlob(new Blob([bytes], { type: r.file.type }), r.file.name, "متطوّعو أدِيب.xlsx");
    toast.success(r.message);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title="تصدير المتطوّعين"
      description={exportLine(list.length, sheets.length)}
      // عريضةٌ لتجتمع الحقولُ اثنين في صفّ، فتُقرأ النافذةُ كلُّها بلا تمرير على الحاسوب
      size="lg"
      className="ad-evd ad-xp"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" size="md" loading={busy} disabled={list.length === 0 || wrongRange} onClick={go}>تنزيل الملفّ</Button>
        </>
      }
    >
      <AdSection
        icon={<UsersThree />}
        title="من في الملفّ؟"
        media={
          <div className="form-grid">
            {at.picked.length > 0 && (
              <Select className="form-full" label="من الجدول" icon={<CheckSquare />} value={spec.scope} onValueChange={(v) => set({ scope: v as ExportScope })}
                options={[{ value: "picked", label: `المحدَّدون (${at.picked.length})` }, { value: "all", label: `الكلّ (${rows.length})` }]} />
            )}
            <div className="form-full">
              <AdCheckWell label="الحال" icon={<IdentificationCard />} all="الكلّ" options={STANDS}
                values={spec.stands} onChange={(v) => set({ stands: v as ExportStand[] })} />
            </div>
            <div className="form-full">
              <AdCheckWell label="الجنس" icon={<GenderIntersex />} all="الكلّ"
                options={[{ value: "female", label: "إناث" }, { value: "male", label: "ذكور" }, ...(anyNoGender ? [{ value: "none", label: "غير محدّد" }] : [])]}
                values={spec.genders} onChange={(v) => set({ genders: v as ExportSpec["genders"] })} />
            </div>
            <div className="form-full">
              <AdCheckWell label="الرغبة" icon={<UsersThree />} all="الكلّ" options={choices} values={spec.committees} onChange={setCommittees} />
            </div>
            <div className="form-full">
              {/* حاضرٌ دائمًا ومعطَّلٌ بلا لجنة: لا تقفز الآبارُ حين يظهر، ويُعرف أنّ الرغبة تُحصر بترتيبها */}
              <AdCheckWell label="ترتيبها عنده" icon={<ListNumbers />} all="بأيّ ترتيب" options={RANKS} disabled={!spec.committees.length}
                values={spec.ranks.map(String)} onChange={(v) => set({ ranks: v.map(Number).sort() as ExportRank[] })} />
            </div>
            <Select className="form-full" label="بداية التطوّع" icon={<CalendarBlank />} value={spec.since} onValueChange={(v) => set({ since: v as ExportSpec["since"] })} options={SINCE} />
            {spec.since === "range" && (
              <>
                <Field label="من" type="date" placeholder="بلا بداية" icon={<CalendarBlank />} innerIcon={<CalendarBlank />} max={spec.to || today}
                  value={spec.from} onChange={(e) => set({ from: e.target.value })} optional />
                <Field label="إلى" type="date" placeholder="حتى اليوم" icon={<CalendarCheck />} innerIcon={<CalendarCheck />} min={spec.from || undefined} max={today}
                  value={spec.to} onChange={(e) => set({ to: e.target.value })} optional error={wrongRange ? "قبل يوم البداية" : undefined} />
              </>
            )}
          </div>
        }
      />

      <AdSection
        icon={<Table />}
        title="كيف يخرج؟"
        media={
          <div className="form-grid">
            <div className="form-full">
              <AdCheckWell label="الأعمدة" icon={<Table />} options={COLUMN_OPTIONS} values={spec.columns}
                act={
                  allCols
                    ? <AdButton variant="soft" size="sm" icon={<ArrowCounterClockwise />} onClick={() => set({ columns: BASE_COLUMNS })}>الأساسيّة</AdButton>
                    : <AdButton variant="soft" size="sm" icon={<Checks />} onClick={() => set({ columns: ALL_COLUMNS })}>اختر الكلّ</AdButton>
                }
                onChange={(v) => set({ columns: v as ExportSpec["columns"] })} />
            </div>
            <Select className="form-full" label="الأوراق" icon={<Stack />} value={spec.split} onValueChange={(v) => set({ split: v as ExportSpec["split"] })} options={splits} />
          </div>
        }
      />
    </Modal>
  );
}
