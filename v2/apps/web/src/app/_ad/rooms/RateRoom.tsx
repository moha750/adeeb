"use client";

/**
 * **قيّم القيادات على الهويّة الجديدة** (٢٠٢٦-١١-٢٠، مسوّدةٌ للعرض) — السلوكُ سلوكُ `dashboard/evaluation/_views/RateA.tsx` حرفًا: ورقةٌ لكلّ
 * مقيَّم ببنود شقّه (م٦/2 أو م٧/2) على المقياس الخماسيّ (م٦/1، بلا «لم أتعامل معه»)، والسؤالان المفتوحان لشقّ الأعضاء وحده، ولا يُرسل
 * ناقص، والمسوّدةُ على الجهاز بمعرّف المقيِّم والمقيَّم (`useDraft`)، وبعد الإرسال تُطوى الورقةُ وتُفتح التي تليها.
 *
 * والشكلُ من قطع الهويّة لا من «مسار» القديم (اعتمده محمد ٢٠٢٦-١١-٢٠، «باء» من شكلين): لوحُ الغرفة، وقسمُ الدورة رأسَها، والمقيَّمون
 * **سطورُ «حسابي»** في قسمٍ واحد عددُ ما قيّمتَ تحت اسمه، والسطرُ يفتح ورقتَه في **نافذة** (قالبُ النوافذ) والإرسالُ في تذييلها، ثمّ تصير
 * إيصالًا بما أُرسل، وبإغلاقها يكون السطرُ «قيّمت» أمام عينك. ورُدّ «ألف»: كلُّ مقيَّمٍ قسمٌ تنفتح ورقتُه في جسمه — «تنفتح قائمةٌ طويلة فتحسّ الصفحةَ تضيع منك».
 * والمقياسُ **المبدّلُ نفسُه** (`.ad-switch`) خمسةَ أجزاءٍ برقمٍ فوق كلمته (كلماتُ اللائحة م٦/1 حرفًا)، والحقولُ حقولُ قالب النماذج.
 */
import { useRef, useState, type ReactNode } from "react";
import { Alert, Button, Modal, Textarea } from "@adeeb/design-system";
import { ChatCircleText, Compass, NotePencil, PaperPlaneTilt, Scales, StarHalf, UsersThree } from "@phosphor-icons/react";
import { Check, DuotoneZone, PencilSimple, Star } from "@/app/_components/glyphs";
import { useDraft } from "@/lib/useDraft";
import type { SheetRow } from "@/app/dashboard/evaluation/data";
import type { SubmitFn } from "@/app/dashboard/evaluation/_views/RateA";
import { OPEN_MAX, OPEN_QUESTION, SCALE_LABELS, itemsFor } from "@/app/dashboard/evaluation/vocab";
import { cycleName, lastDay, seatLine } from "@/app/dashboard/evaluation/_views/parts";
import { AdNote } from "../primitives";
import { AccountRoom, AdLine, AdSection } from "../account";

const NAV = "/dashboard/evaluation/rate";
const rankIcon = (role: string): ReactNode => (role === "department_head" ? <Compass /> : role === "committee_leader" ? <Star /> : <StarHalf />);

type Draft = { scores: (number | null)[]; keep: string; change: string };
function parseDraft(raw: string | null, items: number): Draft | null {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as Draft;
    return Array.isArray(d.scores) && d.scores.length === items ? { scores: d.scores, keep: d.keep ?? "", change: d.change ?? "" } : null;
  } catch {
    return null;
  }
}

/** حالُ الورقة وأفعالُها، واحدةٌ للشكلين: الشكلُ يرسم، وهذه تحفظ وترسل. */
function useSheet(sheet: SheetRow, onSubmit: SubmitFn, onSent: () => void, draftKey: string | null) {
  const items = itemsFor(sheet.part);
  const [typed, setTyped] = useState<Draft | null>(null);
  const draft = useDraft(draftKey, typed ? JSON.stringify(typed) : null);
  const cur: Draft = typed ?? parseDraft(draft.found, items.length) ?? { scores: items.map(() => null), keep: "", change: "" };
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** رسالةُ الوصول بعد الإرسال: النافذةُ تصير إيصالًا بما أُرسل (محمد ٢٠٢٦-١١-٢٠: «يرى التقييم الذي قيّمه كي يتأكّد») */
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<(HTMLLIElement | null)[]>([]);
  const answered = cur.scores.filter((v) => v !== null).length;

  const pick = (i: number, v: number) => {
    const wasEmpty = cur.scores[i] === null;
    setTyped({ ...cur, scores: cur.scores.map((x, j) => (j === i ? v : x)) });
    // النزولُ إلى البند التالي بعد اللمسة الأولى فيه، لا بعد تبديل درجةٍ اختيرت (قرارُ «مسار»: صفحةٌ واحدةٌ تُمرَّر)
    if (wasEmpty) refs.current[i + 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const send = async () => {
    setTried(true);
    if (answered < items.length) {
      refs.current[cur.scores.findIndex((v) => v === null)]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setPending(true);
    setError(null);
    const r = await onSubmit({ targetId: sheet.target_id, part: sheet.part, scores: cur.scores as number[], keep: cur.keep, change: cur.change });
    setPending(false);
    if (!r.ok) return setError(r.message);
    draft.clear();
    setSent(r.message);
    onSent();
  };
  const setRef = (i: number) => (el: HTMLElement | null) => { refs.current[i] = el as HTMLLIElement | null; };
  return { items, cur, setTyped, tried, pending, error, sent, setRef, answered, pick, send };
}
type SheetState = ReturnType<typeof useSheet>;

/** البنود: سطرٌ لكلّ بند — رقمُه على المربّع المصبوغ (علامةٌ إذا أُجيب)، واسمُه ووصفُه، ثمّ المقياسُ خمسةَ أجزاءٍ من المبدّل. */
function SheetBody({ sheet, s }: { sheet: SheetRow; s: SheetState }) {
  const { items, cur, setTyped, tried, setRef, pick } = s;
  return (
    <>
      <ol className="ad-rate-qs">
        {items.map((it, i) => {
          const v = cur.scores[i];
          const id = `ad-rate-${sheet.target_id}-${it.key}`;
          return (
            <li key={it.key} className="ad-rate-q" data-state={v !== null ? "done" : tried ? "bad" : undefined} ref={setRef(i)}>
              <div className="ad-rate-qh">
                <span className="ad-rate-n" aria-hidden>{v !== null ? <Check /> : <span className="lat">{i + 1}</span>}</span>
                <span className="ad-rate-qt"><b id={id}>{it.label}</b><span>{it.hint}</span></span>
              </div>
              <div className="ad-switch ad-rate-scale" role="radiogroup" aria-labelledby={id}>
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={v === n} className={"ad-switch-seg" + (v === n ? " is-on" : "")} onClick={() => pick(i, n)}>
                    <b className="lat">{n}</b>
                    <span>{SCALE_LABELS[n]}</span>
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      {sheet.part === "members" ? (
        <div className="ad-rate-open" ref={setRef(items.length)}>
          <Textarea label={OPEN_QUESTION.keep} icon={<ChatCircleText />} innerIcon={<NotePencil />} optional rows={3} count={{ max: OPEN_MAX }} placeholder="اكتب ما تريد أن يستمر"
            value={cur.keep} onChange={(e) => setTyped({ ...cur, keep: e.target.value })} />
          <Textarea label={OPEN_QUESTION.change} icon={<ChatCircleText />} innerIcon={<NotePencil />} optional rows={3} count={{ max: OPEN_MAX }} placeholder="اكتب ما يحتاج إلى تغيير"
            value={cur.change} onChange={(e) => setTyped({ ...cur, change: e.target.value })} />
        </div>
      ) : null}
    </>
  );
}

/**
 * **الإيصال** (محمد ٢٠٢٦-١١-٢٠، الطريقُ الأوّل من اثنين): بعد الإرسال تبقى النافذةُ وتصير ورقةً تُقرأ — ما اخترتَه في كلّ بندٍ وما كتبتَه — من
 * حال الصفحة نفسِها، فلا تقرأ القاعدةُ ورقةً بعد إرسالها (السرّيّة: لا دالّةَ تُعيد ورقةَ أحد، ولو لصاحبها؛ والمعاينةُ الكاملة تجعل المعاينَ
 * صاحبَ الجلسة). ويبقى التقييمُ بلا تعديل (`evaluation_submit`: «التقييمُ لا يُعاد»). ورُدّ الطريقُ الثاني («اعرض تقييمي» متى شاء): بابٌ
 * جديدٌ على أوراقٍ أُغلقت عمدًا.
 */
function Receipt({ sheet, s }: { sheet: SheetRow; s: SheetState }) {
  return (
    <>
      <AdNote tone="ok" title={s.sent ?? "وصل تقييمُك"}>هذا ما أرسلته، ولا يُعدَّل بعد الإرسال.</AdNote>
      <ul className="ad-lines ad-rate-receipt">
        {s.items.map((it, i) => {
          const v = s.cur.scores[i] as 1 | 2 | 3 | 4 | 5;
          return <AdLine key={it.key} icon={<Check />} k={it.label} v={`${v}، ${SCALE_LABELS[v]}`} />;
        })}
        {sheet.part === "members" ? (
          <>
            <AdLine icon={<ChatCircleText />} k={OPEN_QUESTION.keep} v={s.cur.keep.trim() || "لم تكتب شيئًا"} tone={s.cur.keep.trim() ? undefined : "muted"} read />
            <AdLine icon={<ChatCircleText />} k={OPEN_QUESTION.change} v={s.cur.change.trim() || "لم تكتب شيئًا"} tone={s.cur.change.trim() ? undefined : "muted"} read />
          </>
        ) : null}
      </ul>
    </>
  );
}

/** الورقةُ في نافذةٍ باسم صاحبها، والإرسالُ في تذييلها؛ وبعده إيصالُها والإغلاقُ وحده. */
function WindowSheet({ sheet, onSubmit, onSent, onClose, draftKey }: { sheet: SheetRow; onSubmit: SubmitFn; onSent: () => void; onClose: () => void; draftKey: string | null }) {
  const s = useSheet(sheet, onSubmit, onSent, draftKey);
  return (
    <Modal open onClose={onClose} size="md" className="ad-rate-win" busy={s.pending} title={`تقييم ${sheet.full_name}`}
      description={seatLine(sheet.role_name, sheet.unit_name, sheet.gender)}
      footer={s.sent ? (
        <Button variant="ghost" size="md" onClick={onClose}>إغلاق</Button>
      ) : (
        <>
          <Button variant="primary" size="md" loading={s.pending} onClick={() => void s.send()}><PaperPlaneTilt aria-hidden />أرسل التقييم</Button>
          <Button variant="ghost" size="md" onClick={onClose} disabled={s.pending}>إغلاق</Button>
        </>
      )}>
      {s.sent ? <Receipt sheet={sheet} s={s} /> : <SheetBody sheet={sheet} s={s} />}
      {s.error ? <Alert tone="danger" compact>{s.error}</Alert> : null}
    </Modal>
  );
}

export function RateRoom({ sheets, dueOn, onSubmit, draftOwner = null }: {
  sheets: SheetRow[]; dueOn: string; onSubmit: SubmitFn; draftOwner?: string | null;
}) {
  const [done, setDone] = useState<Set<number>>(() => new Set(sheets.filter((s) => s.done).map((s) => s.target_id)));
  const [open, setOpen] = useState<number | null>(null);
  const total = sheets.length;
  const finished = done.size;
  const key = (id: number) => (draftOwner ? `evaluation:${draftOwner}:${id}` : null);
  // بعد الإرسال تبقى النافذةُ إيصالًا، ويصير السطرُ خلفها «قيّمت»؛ وإغلاقُها يعيدك إلى القائمة، ولا تُفتح ورقةُ التالي وحدها
  const afterSend = (id: number) => setDone((d) => new Set(d).add(id));
  const last = lastDay(sheets[0]?.last_day ?? dueOn);
  const current = open === null ? null : sheets.find((x) => x.target_id === open) ?? null;

  return (
    <AccountRoom navPath={NAV} title="قيّم القيادات">
      <div className="ad-rate">
        <AdSection icon={<Scales />} title={cycleName(dueOn)} sub={`آخر يوم ${last}، ولا يرى أحدٌ تقييمك`} />
        <DuotoneZone>
          {/* العدُّ وصفٌ تحت اسم القسم لا شارة: الشارةُ في الهويّة للحال لا للعدّ */}
          <AdSection icon={<UsersThree />} title="من تقيّمهم" sub={`قيّمت ${finished} من ${total}`}>
            {sheets.map((s) => {
              const isDone = done.has(s.target_id);
              return (
                <AdLine key={s.target_id} icon={rankIcon(s.role_name)} v={s.full_name} sub={isDone ? "قيّمت" : seatLine(s.role_name, s.unit_name, s.gender)}
                  tone={isDone ? "ok" : undefined} toneAt="sub" disabled={isDone}
                  act={isDone ? undefined : { icon: <PencilSimple />, text: "قيّم", label: `قيّم ${s.full_name}` }}
                  onClick={isDone ? undefined : () => setOpen(s.target_id)} />
              );
            })}
          </AdSection>
        </DuotoneZone>
      </div>
      {current ? <WindowSheet sheet={current} onSubmit={onSubmit} onSent={() => afterSend(current.target_id)} onClose={() => setOpen(null)} draftKey={key(current.target_id)} /> : null}
    </AccountRoom>
  );
}
