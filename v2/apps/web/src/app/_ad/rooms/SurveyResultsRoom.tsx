"use client";

/**
 * **نتائجُ الاستبيان** (٢٠٢٦-١١-٠٨). الأداةُ بديلُ Google Forms لكلّ أدِيب (محمد)، فصفحتُها مبنيّةٌ من سبب فتحها لا من تبويبات الصفحة
 * القديمة (`surveys/ResultsView.tsx`، باقيةٌ حتى يقرّر المالكُ حذفها). بعد جولتين من الاتّجاهات استقرّ هذا:
 * - **الرأسُ تذكرةُ الاستبيان** (`survey-ticket.tsx`، مصدرٌ واحدٌ مع كرت غرفته): المشاركاتُ والزياراتُ ومعدّلُ التحويل التقريبيّ ومتوسّطُ
 *   وقت الإجابة أرقامُها، والأجهزةُ سطرٌ فيها (كانت تبويبَ «التحليلات» كلَّه — أقلُّ ما يسأل عنه صاحبُ الاستبيان). وأفعالُها «تصدير CSV»
 *   أساسيًّا (غايةُ الشاشة كما كانت) ثمّ «تحرير» لمن له التعديل.
 * - **بابان: «الخلاصة» و«البيانات»** — قسمةُ أدوات الاستبيانات التي يعرفها مستعملُها.
 * - **الخلاصةُ للرأي وحده.** حقولُ البيانات (النصُّ القصير، والجوال، والبريد، والرابط، والتاريخ، والوقت) لا تُلخَّص: سطرٌ يسمّيها ويفتح
 *   البيانات (محمد: «ماذا أجاب الناس؟ شلون يطلع لي الاسم وأسماء بهالشكل؟ إيش أستفيد منها؟»). وأسئلةُ الرأي ورقةٌ مرقّمة: الاختيارُ والتقييمُ
 *   شريطٌ مقسومٌ بنسبه، ومفتاحُه أزرارٌ تُري مَن اختار كلَّ خيار؛ والنصُّ الطويلُ تعليقاتٌ تُقرأ كلُّها بأسماء أصحابها في نافذة.
 * - **نبضُ المشاركات أوّلَ الخلاصة** ممتدًّا إلى اليوم في الاستبيان القائم، فيُرى سكوتُه، وجملةٌ تقوله («لا تزال تصل»، «سكتت»).
 * - **البياناتُ جدولٌ كامل** (عمودٌ لكلّ سؤالٍ كالقديم) يُبحث فيه بأيّ جواب لا بالاسم وحده، ويُصفّى بالخيار المنقور، ويُمرَّر أفقيًّا
 *   بعمود المشارك ثابتًا؛ والنقرُ على المشارك يفتح مشاركتَه كاملةً. وصفحاتُه خمسون.
 * والأيّامُ تُعدّ بتوقيت الرياض (`clubDayKey`) — كان المخطّطُ القديم يعدّها بساعة الجهاز (`getDate`).
 */
import { useMemo, useState, type ReactNode } from "react";
import { Modal, matchesSearch } from "@adeeb/design-system";
import { CalendarBlank, ChartLineUp, ChatCenteredDots, ChatCenteredText, ClockCountdown, Hash, ListBullets, ListChecks, Percent, Sliders, Table } from "@phosphor-icons/react";
import { CaretLeft, CheckCircle, DownloadSimple, Eye, MagnifyingGlass, PencilSimple, Star } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { downloadBlob } from "@/lib/download";
import { deviceName } from "@/lib/devices";
import { clubDayKey, fmtDayMonth } from "@/lib/dates";
import { arCount, arCounted, type ArForms } from "@/lib/arabicCount";
import type { SurveyAggregates, QuestionAgg } from "@/lib/surveys/aggregate";
import type { ResponseRow } from "@/app/dashboard/surveys/results-data";
import type { SurveyRow } from "@/app/dashboard/surveys/data";
import { QUESTION_TYPE_LABEL, STATUS_META, type SurveyStatus } from "@/app/dashboard/surveys/vocab";
import { AdBadge, AdButton, AdEmpty, AdFigureRow, AdNote, AdPager, AdRoom, AdSwitch, AdTools, type AdFigure, type AdMeta, type AdPosition } from "../primitives";
import { AdLine } from "../account";
import { RecordTicket } from "../record";
import { AdPanel } from "../panel";
import { AdDataGrid } from "../grid";
import { AdBars, AdTrend, weekly, type AdPoint } from "../charts";
import { fmtNum, relTime } from "../format";
import { surveyChips, surveyInfo } from "./survey-ticket";

export const fmtDur = (s: number | null): string => (s == null ? "—" : s < 60 ? `${s}ث` : `${Math.floor(s / 60)}د ${s % 60}ث`);
const ANSWERS: ArForms = ["إجابةٌ واحدة", "إجابتان", "إجابات", "إجابةً"];
export const answers = (n: number) => (n ? arCount(n, ANSWERS) : "لا إجابات");
const RESP: ArForms = ["مشاركةٌ واحدة", "مشاركتان", "مشاركات", "مشاركةً"];
const resp = (n: number) => (n ? arCount(n, RESP) : "لا مشاركات");
const RESP_NOUN: ArForms = ["مُشاركة", "مُشاركتان", "مُشاركات", "مُشاركةً"];
const DONE_NOUN: ArForms = ["مُشاركة مكتملة", "مُشاركتان مكتملتان", "مُشاركات مكتملة", "مُشاركةً مكتملةً"];
const VIEW_NOUN: ArForms = ["زيارة", "زيارتان", "زيارات", "زيارةً"];
const QUESTIONS: ArForms = ["سؤالٌ واحد", "سؤالان", "أسئلة", "سؤالًا"];
/** **مَن يملأ الاستبيان «مُشارِك»** (محمد ٢٠٢٦-١١-١٢): صاحبُ «المشاركة» نفسُها، فلا كلمةَ ثالثة («مجيب»، «مستجيب»، «شخص»). */
const PEOPLE: ArForms = ["مُشاركٌ واحد", "مُشاركان", "مُشاركين", "مُشاركًا"];
const people = (n: number) => (n ? arCount(n, PEOPLE) : "لا أحد");
const PAGE = 50;
const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DEVICE_LABEL: Record<string, string> = { mobile: "جوّال", tablet: "لوحيّ", desktop: "حاسوب" };
const DEVICE_ORDER = ["mobile", "tablet", "desktop", "unknown"];

/** **حقلُ بيانات** (اسمٌ وجوالٌ ورقمٌ جامعيّ…): يُجمع ليُقرأ في الجدول ولا يُلخَّص — قرارُ صاحب الاستبيان عند بناء السؤال، وإلّا افتراضُ نوعه (`isDataQuestion`) */
const isData = (q: QuestionAgg) => q.data;

/** توزيعُ المشاركات على الأجهزة — كما كان، والمجهولُ فئةٌ صريحة */
export function deviceDist(rows: ResponseRow[]): { label: string; value: number }[] {
  const c = new Map<string, number>();
  // يُعدّ بالرمز الخامّ («mobile») لا باسمه: كان يُعدّ باسمه («جوّال») ثمّ يُبحث عنه بالرمز فلا يُوجد، فقالت الحلقةُ القديمة
  // «لا بيانات جهاز» لكلّ استبيان (وجدته صفحةُ النتائج ٢٠٢٦-١١-٠٨ حين ظهر عمودُ الجهاز في الجدول ممتلئًا)
  for (const r of rows) { const k = (r.device ?? "").trim().toLowerCase() || "unknown"; c.set(k, (c.get(k) ?? 0) + 1); }
  const order = [...DEVICE_ORDER, ...[...c.keys()].filter((k) => !DEVICE_ORDER.includes(k))];
  return order.filter((k) => c.has(k)).map((k) => ({ label: k === "unknown" ? "غير معروف" : DEVICE_LABEL[k] ?? deviceName(k), value: c.get(k) ?? 0 }));
}

/**
 * المشاركاتُ يومًا يومًا بتوقيت الرياض من أوّلها إلى آخرها، والفجواتُ أصفار؛ وما زاد على ثلاثة أشهرٍ أسابيع (`weekly`)، وما زاد على
 * سنةٍ شهور (كان المخطّطُ القديم يقطّع بالشهر فوق السنة، فبقيت خطوتُه)
 */
/** `until`: يومٌ يمتدّ إليه الخطّ (اليومُ في استبيانٍ قائم) — فيُرى سكوتُه بعد آخر مشاركة، لا يقف الخطُّ عندها فيوهم أنّها تصل */
export function overTime(rows: ResponseRow[], until?: string): AdPoint[] {
  const keys = rows.map((r) => clubDayKey(r.dateRaw)).filter(Boolean).sort();
  if (!keys.length) return [];
  const end = until && until > keys[keys.length - 1] ? until : keys[keys.length - 1];
  const counts = new Map<string, number>();
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  const day = (k: string) => +new Date(`${k}T12:00:00Z`);
  if ((day(end) - day(keys[0])) / 86_400_000 > 365) {
    const months = new Map<string, number>();
    for (const k of keys) months.set(k.slice(0, 7), (months.get(k.slice(0, 7)) ?? 0) + 1);
    const res: AdPoint[] = [];
    let [y, m] = keys[0].slice(0, 7).split("-").map(Number);
    const [ey, em] = end.slice(0, 7).split("-").map(Number);
    while (y < ey || (y === ey && m <= em)) {
      const mk = `${y}-${String(m).padStart(2, "0")}`;
      res.push({ label: `${MONTHS[m - 1]} ${y}`, value: months.get(mk) ?? 0 });
      if (++m > 12) { m = 1; y++; }
    }
    return res;
  }
  const out: AdPoint[] = [];
  for (let t = day(keys[0]); t <= day(end); t += 86_400_000) {
    const k = new Date(t).toISOString().slice(0, 10);
    out.push({ label: fmtDayMonth(`${k}T12:00:00Z`), value: counts.get(k) ?? 0 });
  }
  return weekly(out);
}

/** CSV بترويسة BOM (يفتح عربيًّا سليمًا في Excel) — من البيانات المجلوبة سلفًا، كما كان حرفًا */
export function exportCsv(agg: SurveyAggregates, responses: ResponseRow[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const header = ["التاريخ", "المشارك", "المدّة", "الجهاز", ...agg.questions.map((q) => q.text)];
  const lines = responses.map((r) => [
    r.date, r.name ?? "مجهول", fmtDur(r.seconds), r.device ?? "", ...agg.questions.map((q) => r.answers[q.qid] ?? ""),
  ].map(esc).join(","));
  const csv = "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${agg.title}_${new Date().toISOString().slice(0, 10)}.csv`, "نتائج-استبيان.csv");
}

/** المختار: خيارٌ في سؤال، أو السؤالُ كلُّه (`label` فارغ: مَن أجاب عنه) */
type Pick = { qid: number; label: string } | null;
const who = (r: ResponseRow) => r.name ?? "مجهول";
/** الخياراتُ المتعدّدةُ منسوقةٌ بفاصلةٍ عربيّة (`results-data.ts`)، فيُفرَد الجوابُ قبل المقارنة */
const chose = (r: ResponseRow, p: NonNullable<Pick>) => {
  const a = r.answers[p.qid] ?? "";
  return p.label ? a.split("، ").includes(p.label) : a.trim() !== "";
};
/** البحثُ بأيّ جواب (اسم، جوال، تخصّص) لا بالاسم وحده */
const hit = (r: ResponseRow, q: string) => matchesSearch(q, who(r), r.date, ...Object.values(r.answers));
const pct = (v: number, total: number) => (total ? Math.round((v / total) * 100) : 0);

function partsOf(q: QuestionAgg): { label: string; value: number; retired?: boolean }[] {
  if (q.kind === "choice") {
    // خياران محذوفان أو أكثر كلّها «(خيار محذوف)»: جزءٌ واحدٌ بمجموعها، فلا يتكرّر في المرشّح ولا في الشريط
    const out: { label: string; value: number; retired?: boolean }[] = [];
    for (const i of q.items) {
      const same = out.find((p) => p.label === i.label);
      if (same) same.value += i.count;
      else out.push({ label: i.label, value: i.count, retired: i.retired });
    }
    return out;
  }
  if (q.kind === "boolean") return [{ label: "نعم", value: q.yes }, { label: "لا", value: q.no }];
  if (q.kind === "number") return q.dist.map((d) => ({ label: String(d.value), value: d.count }));
  return [];
}


/* ═══ الخلاصة ═══ */
/** أقصرُ مدّةٍ يُرسم لها خطّ: ما دونها أيّامٌ تُعدّ لا اتّجاهٌ يُقرأ */
const TREND_MIN = 8;

function Pulse({ agg, responses, serverNow, devices }: { agg: SurveyAggregates; responses: ResponseRow[]; serverNow: number; devices: string | null }) {
  const live = agg.status === "active";
  // اليومُ من وقت الطلب لا من ساعة المتصفّح: فلا يفترق رسمُ الخادم عن رسم المتصفّح قربَ منتصف الليل
  const points = useMemo(() => overTime(responses, live ? clubDayKey(new Date(serverNow).toISOString()) : undefined), [responses, live, serverNow]);
  const week = responses.filter((r) => serverNow - +new Date(r.dateRaw) < 7 * 864e5).length;
  const last = agg.totals.lastAt;
  const sub = !last ? "لم تصل مشاركةٌ بعد"
    : live && week ? `لا تزال تصل: ${resp(week)} في آخر 7 أيّام`
    : live ? `سكتت: آخرُ مشاركةٍ ${relTime(last, serverNow)}`
    : `أُغلق، وآخرُ مشاركةٍ ${relTime(last, serverNow)}`;
  /**
   * **مدّةٌ قصيرةٌ أيّامٌ تُعدّ لا خطٌّ يُرسم** (٢٠٢٦-١١-٠٨): استبيانُ تقييمٍ يُجمع في يومٍ أو يومين بعد الورشة، فخطُّه نقطتان بينهما
   * ميلٌ لا يقول شيئًا. فما دون ثمانية أيّامٍ أرقامُ أيّامه (اليومُ وعددُه)، وما فوقها خطُّه. والأيّامُ الخاليةُ لا تُعدّ.
   */
  const days = points.filter((p) => p.value > 0);
  return (
    <AdPanel icon={<ChartLineUp />} title="المشاركات عبر الزمن" sub={devices ? `${sub}، و${devices}` : sub}>
      {points.length < TREND_MIN ? (
        <AdFigureRow figures={days.map((p) => ({ icon: <CalendarBlank />, value: fmtNum(p.value), label: p.label }))} />
      ) : (
        <AdTrend points={points} unit={resp} label="المشاركات عبر الزمن" height={180} />
      )}
    </AdPanel>
  );
}

/**
 * **رمزُ السؤال بنوعه** (رأسُ قسمه): كلُّ معلومةٍ برمزها، والنوعُ يُعرف قبل أن يُقرأ.
 */
function typeIcon(t: string): ReactNode {
  if (t === "multiple_choice") return <ListChecks />;
  if (t === "yes_no") return <CheckCircle />;
  if (t === "rating_stars") return <Star />;
  if (t === "linear_scale") return <Sliders />;
  if (t === "number") return <Hash />;
  if (t === "short_text" || t === "long_text") return <ChatCenteredText />;
  return <ListBullets />;
}

/**
 * **الخلاصةُ قالبُ الإحصاء نفسُه** (٢٠٢٦-١١-١٢): كلُّ سؤالٍ قسمٌ (`AdPanel`) في شبكة «اللوحة»، وخياراتُه أشرطةُ الهويّة المعتمدة في
 * إحصاء الباركود (`AdBars`) — سطرٌ لكلّ خيار: اسمُه ونسبتُه، وتحتهما شريطُه وعددُه، والنقرُ يُري مَن اختاره. كانت ورقةً مرقّمةً
 * بشريطٍ مقسومٍ ومفتاحٍ من رقاقات، فقال محمد إنّها ليست من الهويّة (القطعُ و«ماذا أجاب الناس» كلُّه) — وكانت قطعًا مخترعةً حقًّا.
 * والتعليقاتُ قسمٌ بعرض السطر، سطورُه سطورُ «حسابي» نفسُها (`AdLine` للقراءة: صاحبُه وتاريخه فوق كلامه، والنقرُ يفتح مشاركته) —
 * كانت اقتباساتٍ بلا أسماء تحتها زرٌّ لا أصلَ له، فسأل محمد: «هذا الزرّ من أين أتى؟». وما زاد على ثلاثةٍ يُفتح من فعل القسم في
 * رأسه، كتصدير البيانات. وحقولُ البيانات تُسمّى في سطرٍ قبل الشبكة ولا تُلخَّص.
 */
const QUOTES = 3;
function Summary({ agg, responses, openResponse, onPick, onData, onComments }: {
  agg: SurveyAggregates;
  responses: ResponseRow[];
  openResponse: (r: ResponseRow) => void;
  onPick: (p: NonNullable<Pick>) => void;
  onData: () => void;
  onComments: (q: Extract<QuestionAgg, { kind: "text" }>) => void;
}) {
  const data = agg.questions.filter(isData);
  const opinion = agg.questions.filter((q) => !isData(q));
  if (!opinion.length) {
    return (
      <AdEmpty icon={<Table />} title="هذا الاستبيان يجمع بيانات" desc="أسئلتُه كلُّها حقولُ بيانات لا تُلخَّص، فاقرأ أجوبتها في البيانات."
        action={<AdButton variant="fill" icon={<Table />} onClick={onData}>افتح البيانات</AdButton>} />
    );
  }
  // السطرُ يقول ما يصحّ هنا وحده: «انقر خيارًا» لمن فيه خيارات، وحقولُ البيانات لمن فيه حقول
  const pickable = opinion.some((q) => q.kind !== "text");
  const names = data.map((q) => `«${q.text}»`).join(" و");
  /**
   * **الإرشادُ تنبيهُ الهويّة** (`AdNote` إعلاميًّا) لا سطرٌ صغير: كان سطرًا خافتًا فوق الشبكة فلم يُنتبه له إلّا بعد حين (محمد ٢٠٢٦-١١-١٢).
   */
  const fieldsLine = data.length ? `${names} في البيانات، لا تُلخَّص هنا.` : null;
  /**
   * **لا قسمَ وحده في نصف السطر:** الأقسامُ عمودان، فإذا بقي من سلسلةٍ واحدٌ (عددُها فرديّ قبل قسمٍ بعرض السطر أو في آخرها) أخذ
   * السطرَ كلَّه — كان سؤالُ «مهمٌّ قراءةُ الوصف…» وحده في نصف الشاشة ونصفُها فارغ (محمد ٢٠٢٦-١١-١٢).
   */
  const full = new Set<number>();
  let run: number[] = [];
  const close = () => { if (run.length % 2) full.add(run[run.length - 1]); run = []; };
  opinion.forEach((q) => { if (q.kind === "text") { close(); full.add(q.qid); } else run.push(q.qid); });
  close();
  return (
    <>
      {pickable ? (
        <AdNote tone="info" title="انقر خيارًا لترى المشاركين الذين اختاروه.">{fieldsLine}</AdNote>
      ) : fieldsLine ? <AdNote tone="info" title={fieldsLine} /> : null}
      <div className="ad-st" data-even="">
        {opinion.map((q) => {
          const avg = q.kind === "number" && q.avg != null
            ? (q.scale ? `، والمتوسّط ${q.avg} من ${q.scale.max}` : `، والمتوسّط ${q.avg}، والأدنى ${q.min ?? "—"}، والأعلى ${q.max ?? "—"}`)
            : "";
          const sub = `${QUESTION_TYPE_LABEL[q.type] ?? q.type}، ${answers(q.answered)}${avg}`;
          const text = q.kind === "text";
          const said = text ? responses.filter((r) => r.answers[q.qid]) : [];
          return (
            <AdPanel key={q.qid} icon={typeIcon(q.type)} title={q.text} sub={sub} span={full.has(q.qid) ? "full" : undefined} flush={text && said.length > 0}
              act={text && said.length > QUOTES ? <AdButton variant="soft" size="sm" icon={<Eye />} onClick={() => onComments(q)}>{`التعليقات كلّها (${fmtNum(said.length)})`}</AdButton> : undefined}>
              {q.answered === 0 ? <p className="ad-sv-none">لا إجابات على هذا السؤال بعد.</p>
                : text ? (
                  <ul className="ad-lines" data-clip="">
                    {said.slice(0, QUOTES).map((r) => (
                      <AdLine key={r.id} icon={<ChatCenteredDots />} k={`${who(r)}، ${r.date}`} v={r.answers[q.qid]} read
                        onClick={() => openResponse(r)} act={{ icon: <CaretLeft />, text: "فتح", label: "المشاركة كاملة" }} />
                    ))}
                  </ul>
                ) : (
                  <AdBars total={q.answered} unit={people} label={q.text} onPick={(label) => onPick({ qid: q.qid, label })}
                    items={partsOf(q).map((x) => ({ ...x, muted: x.retired, note: x.retired ? "خيارٌ سابق" : undefined }))} />
                )}
            </AdPanel>
          );
        })}
      </div>
    </>
  );
}

/* ═══ البيانات ═══ */
const SEP = "\u0001";
function Data({ agg, rows, pick, setPick, open, onExport, q, setQ }: {
  agg: SurveyAggregates; rows: ResponseRow[]; pick: Pick; setPick: (p: Pick) => void; open: (r: ResponseRow) => void; onExport: () => void;
  /** البحثُ في الغرفة لا هنا: الانتقالُ إلى الخلاصة والعودةُ لا يُضيّعه والتصفيةُ باقية */
  q: string; setQ: (v: string) => void;
}) {
  const [page, setPage] = useState(1);
  const shown = rows.filter((r) => (!pick || chose(r, pick)) && hit(r, q));
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const pg = Math.min(page, pages);
  /**
   * **التصفيةُ مرشّحُ أدوات الغرف نفسُه** (`AdTools.filters`، كانت سطرًا مخترعًا بشارةٍ وزرّ ✕): «مَن اختار»، خياراتُه مجموعةٌ تحت
   * أسئلتها، و«الكلّ» رفعُه. والنقرُ على خيارٍ في الخلاصة يضبطه نفسَه.
   */
  const options = agg.questions.filter((x) => !x.data).flatMap((x) =>
    partsOf(x).filter((p) => p.value > 0).map((p) => ({ value: `${x.qid}${SEP}${p.label}`, label: p.label, group: x.text, groupIcon: typeIcon(x.type), chip: `${x.text}: ${p.label}` })),
  );
  const filters = options.length ? [{
    key: "chose", label: "مَن اختار",
    value: pick ? `${pick.qid}${SEP}${pick.label}` : "",
    // «الكلّ» يضعه المرشّحُ نفسُه أوّلَ قائمته (كان هنا أيضًا فظهر مرّتين، كلاهما مختار)
    options,
    onChange: (v: string) => { setPage(1); if (!v) { setPick(null); return; } const [qid, ...rest] = v.split(SEP); setPick({ qid: Number(qid), label: rest.join(SEP) }); },
  }] : undefined;
  const cols = [
    { key: "date", label: "التاريخ" }, { key: "dur", label: "المدّة" }, { key: "device", label: "الجهاز" },
    ...agg.questions.map((x) => ({ key: `q${x.qid}`, label: x.text })),
  ];
  return (
    <AdPanel icon={<Table />} title="البيانات" sub={shown.length !== rows.length ? `${fmtNum(shown.length)} من ${resp(rows.length)}` : resp(rows.length)}
      act={<AdButton variant="soft" size="sm" icon={<DownloadSimple />} onClick={onExport}>تصدير CSV</AdButton>} flush>
      <div className="ad-panel-tools">
        <AdTools search={{ value: q, onChange: (v) => { setQ(v); setPage(1); }, placeholder: "ابحث بأيّ جواب: اسم، جوال، تخصّص…" }} filters={filters} count={resp(shown.length)} />
      </div>
      {shown.length === 0 ? <AdEmpty icon={<MagnifyingGlass />} title="لا مشاركات مطابقة" desc="جرّب كلمةً أخرى، أو ارفع التصفية." /> : (
        <>
          <AdDataGrid
            label={`مشاركات ${agg.title}`}
            head="المشارك"
            columns={cols}
            on={pick ? `q${pick.qid}` : null}
            rows={shown.slice((pg - 1) * PAGE, pg * PAGE).map((r) => ({
              id: r.id,
              head: <button type="button" className="ad-grid-open" data-anon={r.name ? undefined : ""} onClick={() => open(r)}>{who(r)}</button>,
              cells: [r.date, fmtDur(r.seconds), r.device ? deviceName(r.device) : null, ...agg.questions.map((x) => r.answers[x.qid] || null)],
            }))}
          />
          <AdPager page={pg} size={PAGE} total={shown.length} noun={RESP} onPage={setPage} />
        </>
      )}
    </AdPanel>
  );
}

export function SurveyResultsRoom({ agg, responses, canEdit, survey, serverNow }: {
  agg: SurveyAggregates;
  responses: ResponseRow[];
  /** من شُورك للرؤية يرى النتائج ولا يُعرض له «تحرير» (والخادمُ يرفضه على كلّ حال) */
  canEdit: boolean;
  /** صفُّ الاستبيان في غرفته — منه شاراتُ تذكرته وسطورُها؛ وبلا صفٍّ (لم يُقرأ) تُبنى التذكرةُ من النتائج نفسِها */
  survey: SurveyRow | null;
  serverNow: number;
}) {
  const toast = useToast();
  const [view, setView] = useState<"summary" | "data">("summary");
  const [pick, setPick] = useState<Pick>(null);
  const [detail, setDetail] = useState<ResponseRow | null>(null);
  const [comments, setComments] = useState<Extract<QuestionAgg, { kind: "text" }> | null>(null);
  const [search, setSearch] = useState("");
  const t = agg.totals;
  // معدّلُ التحويل «تقريبيّ» كما كان: الزياراتُ تعدّ كلَّ فتحٍ للصفحة (معاينات، تكرار، روبوتات) فالنسبةُ مؤشّرٌ لا رقمٌ قاطع
  const conv = t.views > 0 ? Math.min(100, Math.round((t.responses / t.views) * 100)) : null;
  const devices = deviceDist(responses);
  const devTotal = devices.reduce((s, x) => s + x.value, 0);
  const topDev = [...devices].sort((a, b) => b.value - a.value)[0];
  const known = !!devTotal && !!topDev && topDev.label !== "غير معروف";

  const onExport = () => {
    if (!responses.length) { toast.info("لا مشاركات لتصديرها."); return; }
    exportCsv(agg, responses);
    toast.success("جُهّز ملفّ CSV.");
  };
  /** النقرُ على خيار يفتح البيانات مصفّاةً بمن اختاره */
  const onPick = (p: NonNullable<Pick>) => { setPick(p); setView("data"); };

  const status = STATUS_META[agg.status as SurveyStatus] ?? STATUS_META.draft;
  /**
   * **سطورُ التذكرة سطورُ كرتها في الغرفة وحدها** (قاعدةُ صفحة السجلّ): الحالُ والإنشاءُ والمُعِدّ. وكانت معها عددُ الأسئلة والأجهزة
   * فثقلت (ستّةُ سطور): الأجهزةُ خبرُ وصول المشاركات فصارت في سطر نبضها، وعددُ الأسئلة لا يحتاجه قارئُ النتائج. وبلا صفّ الغرفة عددُ الأسئلة وحده.
   */
  const info: AdMeta[] = survey
    ? surveyInfo(survey, true, serverNow)
    : [{ icon: <ListChecks />, text: agg.questions.length ? arCount(agg.questions.length, QUESTIONS) : "لا أسئلة" }];
  const devicesLine = known ? `أغلبُها من ${topDev!.label} (${pct(topDev!.value, devTotal)}%)` : null;
  const figures: AdFigure[] = [
    { icon: <ChatCenteredDots />, value: fmtNum(t.responses), label: arCounted(t.responses, DONE_NOUN) },
    { icon: <Eye />, value: fmtNum(t.views), label: arCounted(t.views, VIEW_NOUN) },
    { icon: <Percent />, value: conv == null ? "—" : `${fmtNum(conv)}%`, label: "معدّل تحويل تقريبيّ", ltr: true },
    { icon: <ClockCountdown />, value: fmtDur(t.avgSeconds), label: "متوسّط وقت الإجابة" },
  ];
  const positions: AdPosition[] = [{ key: "summary", label: "الخلاصة" }, { key: "data", label: "البيانات", count: responses.length }];

  return (
    <AdRoom label={`نتائج ${agg.title}`}>
      <RecordTicket
        title={agg.title}
        desc={agg.description}
        seed={String(agg.id)}
        // الكعبُ عددُ هذا الاستبيان نفسِه لا عددُ صفّه في الغرفة: ذاك يُعدّ في طلبٍ واحدٍ لكلّ استبياناتك وقد يُقصّ عند ألف صفّ
        stub={{ big: fmtNum(t.responses), small: arCounted(t.responses, RESP_NOUN) }}
        chips={survey ? surveyChips(survey) : <AdBadge>{status.label}</AdBadge>}
        acts={
          <>
            <AdButton variant="fill" size="sm" icon={<DownloadSimple />} onClick={onExport}>تصدير CSV</AdButton>
            {canEdit ? <AdButton variant="soft" size="sm" icon={<PencilSimple />} href={`/dashboard/surveys/${agg.id}/edit`}>تحرير</AdButton> : null}
          </>
        }
        info={info}
        figures={figures}
      />

      {t.responses === 0 ? (
        <AdEmpty icon={<ChatCenteredDots />} title="لا مشاركات بعد" desc="انشر رابط الاستبيان، وحين تصل أوّلُ مشاركة تظهر النتائج هنا." />
      ) : (
        <>
          <AdSwitch label="العرض" positions={positions} position={view} onPosition={(k) => setView(k as typeof view)} />
          {view === "summary" ? (
            <>
              <Pulse agg={agg} responses={responses} serverNow={serverNow} devices={devicesLine} />
              <Summary agg={agg} responses={responses} openResponse={setDetail} onPick={onPick} onData={() => { setPick(null); setView("data"); }} onComments={setComments} />
            </>
          ) : (
            <Data agg={agg} rows={responses} pick={pick} setPick={setPick} open={setDetail} onExport={onExport} q={search} setQ={setSearch} />
          )}
        </>
      )}

      {/* المشاركةُ كاملةً: نافذةٌ جسمُها سطور (قالبُ النوافذ) — السؤالُ تسميةٌ فوق جوابه، و«لم تُجَب» حيث تُرك */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? who(detail) : ""}
        description={detail ? `${detail.date}، ${fmtDur(detail.seconds)}${detail.device ? `، ${deviceName(detail.device)}` : ""}` : undefined}
        size="md"
        footer={<AdButton plain variant="line" onClick={() => setDetail(null)}>إغلاق</AdButton>}
      >
        {detail ? (
          <ul className="ad-lines">
            {agg.questions.map((q) => <AdLine key={q.qid} icon={<ListChecks />} k={q.text} v={detail.answers[q.qid] || "لم تُجَب"} tone={detail.answers[q.qid] ? undefined : "muted"} read />)}
          </ul>
        ) : null}
      </Modal>

      {/* التعليقاتُ كلُّها بأسماء أصحابها: النقرُ على أحدها يفتح مشاركتَه */}
      <Modal
        open={comments !== null}
        onClose={() => setComments(null)}
        title={comments?.text ?? ""}
        description={comments ? answers(comments.answered) : undefined}
        size="md"
        footer={<AdButton plain variant="line" onClick={() => setComments(null)}>إغلاق</AdButton>}
      >
        {comments ? (
          <ul className="ad-lines">
            {responses.filter((r) => r.answers[comments.qid]).map((r) => (
              <AdLine key={r.id} icon={<ChatCenteredDots />} k={`${who(r)}، ${r.date}`} v={r.answers[comments.qid]} read
                onClick={() => { setComments(null); setDetail(r); }} act={{ icon: <CaretLeft />, text: "فتح", label: "المشاركة كاملة" }} />
            ))}
          </ul>
        ) : null}
      </Modal>
    </AdRoom>
  );
}
