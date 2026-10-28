"use client";

/**
 * **قيّم القيادات، المقترح أ: «مسار»** — لغةُ صفحة الاستبيان المعتمَدة (٢٠٢٦-١٠-٢٠) داخل اللوحة: غلافٌ بنقش
 * أدِيب فيه الموعدُ والسرّيّةُ وحلقةُ ما أُنجز، وورقةٌ تخرج منه عليها مَن تقيّمهم خطواتٍ على طريق. تفتح
 * الخطوةُ فتصير ورقتَه: البنودُ عُقدٌ على الطريق، والمقياسُ عدّادٌ يمتلئ، والنزولُ إلى البند التالي بعد
 * اللمسة. وبعد الإرسال تُطوى وتفتح التي تليها.
 */
import { useRef, useState } from "react";
import { useDraft } from "@/lib/useDraft";
import { Alert, Button } from "@adeeb/design-system";
import { Check, CaretDown } from "@/app/_components/glyphs";
import { CalendarBlank, LockSimple, PaperPlaneTilt } from "@phosphor-icons/react";
import { Avatar } from "../../_components/Avatar";
import { useToast } from "../../_components/ToastProvider";
import type { SheetRow } from "../data";
import type { EvaluationResult } from "../actions";
import { OPEN_MAX, OPEN_QUESTION, SCALE_LABELS, itemsFor, type Part } from "../vocab";
import { cycleName, lastDay, seatLine } from "./parts";

export type SubmitFn = (input: { targetId: number; part: Part; scores: number[]; keep?: string | null; change?: string | null }) => Promise<EvaluationResult>;

/**
 * `draftOwner`: معرّفُ المقيِّم، به تُحفظ الورقةُ مسوّدةً على الجهاز (`useDraft`) فلا يضيع ما عبّأه إن خرج قبل
 * الإرسال. والمفتاحُ بالمقيِّم وبالمقيَّم معًا: الجهازُ قد يُشارَك. و`null` في المعرض: لا أثرَ يُخلَّف.
 */
export function RateA({ sheets, dueOn, onSubmit, draftOwner = null }: { sheets: SheetRow[]; dueOn: string; onSubmit: SubmitFn; draftOwner?: string | null }) {
  const [done, setDone] = useState<Set<number>>(() => new Set(sheets.filter((s) => s.done).map((s) => s.target_id)));
  const firstOpen = sheets.find((s) => !s.done)?.target_id ?? null;
  const [open, setOpen] = useState<number | null>(firstOpen);
  const total = sheets.length;
  const finished = done.size;

  const afterSend = (id: number) => {
    const next = new Set(done).add(id);
    setDone(next);
    setOpen(sheets.find((s) => !next.has(s.target_id))?.target_id ?? null);
  };

  return (
    <div className="evr">
      <section className="evr-hero">
        <div className="evr-hero-in">
          <div className="evr-hero-tx">
            <p className="evr-eyebrow">{cycleName(dueOn)}</p>
            <h1 className="evr-title">قيّم القيادات</h1>
            <ul className="evr-facts">
              <li><span className="evr-fi"><CalendarBlank /></span>آخر يوم {lastDay(sheets[0]?.last_day ?? dueOn)}</li>
              <li><span className="evr-fi"><LockSimple /></span>لا يرى أحدٌ تقييمك</li>
            </ul>
          </div>
          <div className="evr-ring" style={{ ["--p" as string]: total ? (finished / total) * 100 : 0 }} role="img" aria-label={`أنجزت ${finished} من ${total}`}>
            <svg className="evr-ring-svg" viewBox="0 0 36 36" aria-hidden>
              <circle cx="18" cy="18" r="15.9155" />
              <circle className="on" cx="18" cy="18" r="15.9155" pathLength={100} />
            </svg>
            <span className="evr-ring-n"><b>{finished}</b><small>من {total}</small></span>
          </div>
        </div>
      </section>

      <div className="evr-paper">
        <ol className="evr-people">
          {sheets.map((s) => {
            const isDone = done.has(s.target_id);
            const isOpen = open === s.target_id && !isDone;
            return (
              <li key={s.target_id} className="evr-person" data-state={isDone ? "done" : isOpen ? "open" : "idle"}>
                <button
                  type="button"
                  className="evr-person-head"
                  aria-expanded={isOpen}
                  disabled={isDone}
                  onClick={() => setOpen(isOpen ? null : s.target_id)}
                >
                  <Avatar name={s.full_name} gender={s.gender} size="lg" />
                  <span className="evr-person-tx">
                    <b>{s.full_name}</b>
                    <span>{seatLine(s.role_name, s.unit_name, s.gender)}</span>
                  </span>
                  <span className="evr-person-end">
                    {isDone ? (
                      <span className="evr-done"><Check aria-hidden />قيّمت</span>
                    ) : (
                      // لا شارةَ للشقّ (الأعضاء أو المجلس): شأنُ الحساب لا المقيِّم، فأربكت (محمد ٢٠٢٦-١٠-٢٧)
                      <CaretDown className="evr-caret" aria-hidden />
                    )}
                  </span>
                </button>
                {isOpen ? <SheetA sheet={s} onSubmit={onSubmit} onSent={() => afterSend(s.target_id)} draftKey={draftOwner ? `evaluation:${draftOwner}:${s.target_id}` : null} /> : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

type Draft = { scores: (number | null)[]; keep: string; change: string };

/** المسوّدةُ من المخزن إن كانت صالحةً لهذه الورقة (عددُ بنودها نفسُه)، وإلّا لا شيء. */
function parseDraft(raw: string | null, items: number): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Draft;
    return Array.isArray(d.scores) && d.scores.length === items ? { scores: d.scores, keep: d.keep ?? "", change: d.change ?? "" } : null;
  } catch {
    return null;
  }
}

function SheetA({ sheet, onSubmit, onSent, draftKey }: { sheet: SheetRow; onSubmit: SubmitFn; onSent: () => void; draftKey: string | null }) {
  const items = itemsFor(sheet.part);
  // الاستعادةُ اشتقاقٌ لا نسخ (نهج `ApplyForm`): ما لم يُلمس شيءٌ بعدُ، المعروضُ هو المسوّدةُ إن وُجدت
  const [typed, setTyped] = useState<Draft | null>(null);
  const draft = useDraft(draftKey, typed ? JSON.stringify(typed) : null);
  const cur: Draft = typed ?? parseDraft(draft.found, items.length) ?? { scores: items.map(() => null), keep: "", change: "" };
  const { scores, keep, change } = cur;
  const setKeep = (v: string) => setTyped({ ...cur, keep: v });
  const setChange = (v: string) => setTyped({ ...cur, change: v });
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const toast = useToast();
  const answered = scores.filter((v) => v !== null).length;
  const first = sheet.full_name.split(" ")[0];

  const pick = (i: number, v: number) => {
    const wasEmpty = scores[i] === null;
    setTyped({ ...cur, scores: scores.map((x, j) => (j === i ? v : x)) });
    // النزولُ إلى البند التالي بعد اللمسة الأولى فيه، لا بعد تبديل درجةٍ اختيرت
    if (wasEmpty) refs.current[i + 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const send = async () => {
    setTried(true);
    if (answered < items.length) {
      refs.current[scores.findIndex((v) => v === null)]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPending(true);
    setError(null);
    const r = await onSubmit({ targetId: sheet.target_id, part: sheet.part, scores: scores as number[], keep, change });
    setPending(false);
    if (!r.ok) return setError(r.message);
    draft.clear();
    toast.success(r.message);
    onSent();
  };

  return (
    <div className="evr-sheet">
      <div className="evr-path">
        {items.map((it, i) => {
          const v = scores[i];
          const state = v !== null ? "done" : tried ? "err" : "idle";
          return (
            <div key={it.key} className="spt-q evr-q" data-state={state} ref={(el) => { refs.current[i] = el; }}>
              <span className="spt-node" aria-hidden>{v !== null ? <Check /> : <span className="font-latin">{i + 1}</span>}</span>
              <h3 className="spt-qt" id={`evr-${sheet.target_id}-${it.key}`}>{it.label}</h3>
              <p className="evr-qh">{it.hint}</p>
              <div className="evr-scale" role="radiogroup" aria-labelledby={`evr-${sheet.target_id}-${it.key}`}>
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={v === n}
                    className={"evr-step" + (v !== null && n <= v ? " fill" : "") + (v === n ? " pick" : "")}
                    style={{ ["--i" as string]: n - 1 }}
                    onClick={() => pick(i, n)}
                  >
                    <span className="evr-step-n">{n}</span>
                    <span className="evr-step-l">{SCALE_LABELS[n]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {sheet.part === "members" ? (
          <div className="spt-q evr-q" data-state={keep || change ? "done" : "idle"} ref={(el) => { refs.current[items.length] = el; }}>
            <span className="spt-node" aria-hidden><span className="font-latin">{items.length + 1}</span></span>
            <h3 className="spt-qt">{OPEN_QUESTION.keep}<span className="fld-opt">(اختياريّ)</span></h3>
            <div className="spt-ans">
              <textarea className="spt-ta" rows={3} maxLength={OPEN_MAX} placeholder="اكتب ما تريد أن يستمر" value={keep} onChange={(e) => setKeep(e.target.value)} />
            </div>
            <h3 className="spt-qt evr-qt2">{OPEN_QUESTION.change}<span className="fld-opt">(اختياريّ)</span></h3>
            <div className="spt-ans">
              <textarea className="spt-ta" rows={3} maxLength={OPEN_MAX} placeholder="اكتب ما يحتاج إلى تغيير" value={change} onChange={(e) => setChange(e.target.value)} />
            </div>
          </div>
        ) : null}

        <div className="spt-q spt-end evr-end">
          <span className="spt-node" aria-hidden><PaperPlaneTilt /></span>
          <div className="evr-send">
            <div className="evr-send-tx">
              <b>تقييم {first}</b>
              <span><span className="font-latin">{answered}</span> من <span className="font-latin">{items.length}</span> بنود</span>
            </div>
            <Button variant="inverse" size="lg" loading={pending} onClick={send}>
              <PaperPlaneTilt aria-hidden />أرسل التقييم
            </Button>
            {error ? <Alert tone="danger" className="evr-send-alert">{error}</Alert> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
