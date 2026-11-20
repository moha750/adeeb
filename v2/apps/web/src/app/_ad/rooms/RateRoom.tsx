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
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Modal, Textarea } from "@adeeb/design-system";
import { ChatCircleText, Compass, Lightbulb, NotePencil, PaperPlaneTilt, Scales, StarHalf, ThumbsUp, UsersThree } from "@phosphor-icons/react";
import { Check, DuotoneZone, Eye, PencilSimple, Star } from "@/app/_components/glyphs";
import { useDraft } from "@/lib/useDraft";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { MyBallot } from "@/app/dashboard/evaluation/actions";
import type { SheetRow } from "@/app/dashboard/evaluation/data";
import type { SubmitFn } from "@/app/dashboard/evaluation/_views/RateA";
import { OPEN_MAX, OPEN_QUESTION, SCALE_LABELS, itemsFor } from "@/app/dashboard/evaluation/vocab";
import { cycleName, lastDay, seatLine } from "@/app/dashboard/evaluation/_views/parts";
import { AdNote, AdStepsBar } from "../primitives";
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
  const toast = useToast();
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
    toast.success(r.message);
    onSent();
  };
  const setRef = (i: number) => (el: HTMLElement | null) => { refs.current[i] = el as HTMLLIElement | null; };
  return { items, cur, setTyped, tried, pending, error, setRef, answered, pick, send };
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
 * **السؤالُ وجوابُه** (`SayItem`، محمد ٢٠٢٦-١١-٢٠: «جيم بأيقونة»): الإجابةُ **بندٌ في قائمة البنود نفسِها** لا قطعةٌ تحتها — رمزُها على المربّع
 * المصبوغ، والسؤالُ عنوانُها، والجوابُ تحته، والفارغُ «لم تكتب شيئًا» خافتًا. اعتُمد بعد اثني عشر شكلًا رُدّت: النصُّ السائب، والفقاعة،
 * وخطُّ الاقتباس، والشريطُ المضاء، وعلامةُ الاقتباس، والورقة، والمنقوش، ولسانُ اللوح، والمعلَّقُ المصبوغ، ثمّ من البحث «سطرُ الملخّص»
 * (GOV.UK) و«كلامُك أوّلًا» (Typeform)، و«امتدادُ البنود» بلا رمز. والرمزان: الإبهامُ لما يستمرّ، والمصباحُ لما يتغيّر (اقتراحٌ لا عيب).
 */
function SayItem({ q, a, icon }: { q: string; a: string | null; icon: ReactNode }) {
  // الفارغُ قد يأتي نصًّا خاليًا لا `null` (حقلٌ لُمس ثمّ مُسح)، فالحكمُ على ما بعد التشذيب
  const said = a?.trim() ? a.trim() : null;
  return (
    <li className="ad-rate-v ad-rate-say" data-empty={said ? undefined : ""}>
      <span className="ad-rate-say-ic" aria-hidden>{icon}</span>
      <span className="ad-rate-qt"><b>{q}</b><span className="ad-rate-say-a">{said ?? "لم تكتب شيئًا"}</span></span>
    </li>
  );
}

/** الورقةُ في نافذةٍ باسم صاحبها، والإرسالُ في تذييلها، ثمّ تُغلق. */
function WindowSheet({ sheet, onSubmit, onSent, onClose, draftKey }: { sheet: SheetRow; onSubmit: SubmitFn; onSent: () => void; onClose: () => void; draftKey: string | null }) {
  const s = useSheet(sheet, onSubmit, onSent, draftKey);
  return (
    <Modal open onClose={onClose} size="md" className="ad-rate-win" busy={s.pending} title={`تقييم ${sheet.full_name}`}
      description={seatLine(sheet.role_name, sheet.unit_name, sheet.gender)}
      footer={
        <>
          <Button variant="primary" size="md" loading={s.pending} onClick={() => void s.send()}><PaperPlaneTilt aria-hidden />أرسل التقييم</Button>
          <Button variant="ghost" size="md" onClick={onClose} disabled={s.pending}>إغلاق</Button>
        </>
      }>
      <SheetBody sheet={sheet} s={s} />
      {s.error ? <Alert tone="danger" compact>{s.error}</Alert> : null}
    </Modal>
  );
}

/**
 * **«عرض تقييمي»** (محمد ٢٠٢٦-١١-٢٠): ورقتُك كما أرسلتَها **تُقرأ لا تُلمس**. رُدّ شكلان قبله: الإيصالُ سطورًا («قبيحٌ جدًّا»)، والورقةُ نفسُها
 * مقفلة («مضلّل: لماذا الزرُّ لا يعمل؟ لماذا لا أستطيع الكتابة؟»). فلا مقياسَ بأزرار ولا حقلَ ببئر، والتنبيهُ يقول إنّ التقييمَ لا يُعدَّل.
 * ورُدّ بعدهما «الشريط» و«الشارة» («ضعيفة بصريًّا… غير جميلة»)، والتنبيهُ فوقها (العنوانُ «تقييمك لريم» يكفي عنه)، و«الكعب».
 * **واختار محمد «الدرجات»** (درجاتُ الإنذار في «عضويتي»: خمسٌ يمتلئ منها بقدرها): «القراءةُ الأساسيّة ليست الرقمَ ولا النصّ بل
 * التلوين»، فسقط الرقمُ وبقيت الكلمة. والإجابتان **بندان أخيران في القائمة نفسِها** (`SayItem`)، ولكلٍّ رمزُه.
 * والورقةُ من القاعدة لصاحب الجلسة وحده (`evaluation_my_ballot`)، ولا تُعرض في جلسة معاينة.
 */
function ViewSheet({ sheet, load, onClose }: { sheet: SheetRow; load: (id: number) => Promise<MyBallot | null>; onClose: () => void }) {
  const [b, setB] = useState<MyBallot | null | undefined>(undefined);
  // تُجلب مرّةً لكلّ ورقة: الدالّةُ تُعاد مع كلّ رسمٍ للصفحة، فلا تكون سببًا لجلبٍ آخر
  const loader = useRef(load);
  useEffect(() => {
    let live = true;
    void loader.current(sheet.target_id).then((x) => { if (live) setB(x); });
    return () => { live = false; };
  }, [sheet.target_id]);
  const items = itemsFor(sheet.part);
  return (
    <Modal open onClose={onClose} size="md" className="ad-rate-win ad-rate-view" title={`تقييمك لـ${sheet.full_name}`}
      description={seatLine(sheet.role_name, sheet.unit_name, sheet.gender)}
      footer={<Button variant="ghost" size="md" onClick={onClose}>إغلاق</Button>}>
      {b === undefined ? <AdNote tone="info" title="تُجلب ورقتك…" />
        : b === null ? <AdNote tone="warn" title="لا تُعرض الورقة الآن">إن كنت تعاين حساب غيرك فالأوراق لا تُعرض في المعاينة.</AdNote>
        : (
          <>
            <ol className="ad-rate-vs">
              {items.map((it, i) => {
                const v = b.scores[i] as 1 | 2 | 3 | 4 | 5;
                return (
                  <li key={it.key} className="ad-rate-v">
                    <span className="ad-rate-qt"><b>{it.label}</b><span>{it.hint}</span></span>
                    {/* الكلمةُ وحدها تحت الدرجات: الرقمُ يكرّر ما يقوله عددُ الممتلئ (محمد ٢٠٢٦-١١-٢٠)، ويبقى لقارئ الشاشة في وسمها */}
                    <AdStepsBar steps={{ now: v, max: 5, label: SCALE_LABELS[v] }} />
                  </li>
                );
              })}
              {sheet.part === "members" ? (
                <>
                  <SayItem q={OPEN_QUESTION.keep} a={b.keep} icon={<ThumbsUp />} />
                  <SayItem q={OPEN_QUESTION.change} a={b.change} icon={<Lightbulb />} />
                </>
              ) : null}
            </ol>
          </>
        )}
    </Modal>
  );
}

export function RateRoom({ sheets, dueOn, onSubmit, loadMine, draftOwner = null }: {
  sheets: SheetRow[]; dueOn: string; onSubmit: SubmitFn; draftOwner?: string | null;
  /** ورقتي كما أرسلتُها: `getMyBallot` في الصفحة، وورقةُ المتقمَّص في المحاكي */
  loadMine: (targetId: number) => Promise<MyBallot | null>;
}) {
  const [done, setDone] = useState<Set<number>>(() => new Set(sheets.filter((s) => s.done).map((s) => s.target_id)));
  const [open, setOpen] = useState<number | null>(null);
  const total = sheets.length;
  const finished = done.size;
  const key = (id: number) => (draftOwner ? `evaluation:${draftOwner}:${id}` : null);
  const [viewing, setViewing] = useState<number | null>(null);
  // بعد الإرسال تُغلق النافذةُ ويصير السطرُ «قيّمت» بفعل «عرض تقييمي»، ولا تُفتح ورقةُ التالي وحدها: ترى أنّك أنجزت، ثمّ تختار
  const afterSend = (id: number) => {
    setDone((d) => new Set(d).add(id));
    setOpen(null);
  };
  const last = lastDay(sheets[0]?.last_day ?? dueOn);
  const current = open === null ? null : sheets.find((x) => x.target_id === open) ?? null;
  const viewed = viewing === null ? null : sheets.find((x) => x.target_id === viewing) ?? null;

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
                  tone={isDone ? "ok" : undefined} toneAt="sub"
                  act={isDone ? { icon: <Eye />, text: "عرض تقييمي", label: `عرض تقييمك لـ${s.full_name}`, tone: "ok" } : { icon: <PencilSimple />, text: "قيّم", label: `قيّم ${s.full_name}` }}
                  onClick={() => (isDone ? setViewing(s.target_id) : setOpen(s.target_id))} />
              );
            })}
          </AdSection>
        </DuotoneZone>
      </div>
      {current ? <WindowSheet sheet={current} onSubmit={onSubmit} onSent={() => afterSend(current.target_id)} onClose={() => setOpen(null)} draftKey={key(current.target_id)} /> : null}
      {viewed ? <ViewSheet sheet={viewed} load={loadMine} onClose={() => setViewing(null)} /> : null}
    </AccountRoom>
  );
}
