"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge, Button, Checkbox, Container, Field, IconButton, Modal, Radio, SectionCard, Segmented, Select, Textarea,
} from "@adeeb/design-system";
import {
  Bell, Buildings, CalendarBlank, Camera, ChatCircleDots, Circle, Clock, ClockCounterClockwise, HourglassMedium, LinkSimple, ClipboardText, CloudCheck, HandHeart, Images, ListBullets, Megaphone, Newspaper,
  NotePencil, PaperPlaneTilt, Quotes, TextAlignLeft, Ticket, UsersThree,
} from "@phosphor-icons/react";
import { ArrowDown, ArrowUp, ArrowUUpLeft, Check, Eye, PencilSimple, Plus, Star, Trash, UploadSimple, X } from "@/app/_components/glyphs";
import { ConfirmDialog } from "@/app/dashboard/_components/ConfirmDialog";
import { CATEGORY_META, CATEGORY_OPTIONS, type Category } from "@adeeb/core/news";
import { sectionsToBlocks } from "@/lib/news/blocks";
import { ArticleBody } from "@/app/news/[slug]/_parts/ArticleBody";
import { arCount, type ArForms } from "@/lib/arabicCount";

/* ══ النموذج ══════════════════════════════════════════════════════════ */

const AR_CHAPTER: ArForms = ["فصلٌ واحد", "فصلان", "فصول", "فصلًا"];
const CHIEF = "محمد المطر";

/** أجزاءُ التكليف بلغة العمل لا بأسماء الحقول (قرار المالك ٢٠٢٦-١٠-١٦). */
type Part = "الترويسة" | "المتن" | "الصور";
const PARTS: { part: Part; hint: string; Icon: typeof Newspaper }[] = [
  { part: "الترويسة", hint: "العنوان والملخّص", Icon: Newspaper },
  { part: "المتن", hint: "المدخل والفصول", Icon: TextAlignLeft },
  { part: "الصور", hint: "الغلاف والمعرض", Icon: Images },
];

/** القالبُ المعتمد لكلّ فئة (٢٠٢٦-١٠-١٦). */
const TEMPLATE: Record<Category, string[]> = {
  coverage: ["المحاور", "التفاعل والأثر", "رسالة النادي"],
  partnership: ["أهداف الشراكة", "أثر الاتفاقية", "رؤية الطرفين"],
  achievement: ["الإنجاز", "الطريق إليه", "رسالة النادي"],
  announcement: ["التفاصيل", "طريقة المشاركة"],
};

type Person = { id: string; name: string; hint: string; group: "اللجنة" | "الأعضاء" | "المتطوّعون" };
const PEOPLE: Person[] = [
  { id: "p1", name: "سارة الأحمد", hint: "لجنة التقارير والأرشفة", group: "اللجنة" },
  { id: "p2", name: "نورة العلي", hint: "لجنة التقارير والأرشفة", group: "اللجنة" },
  { id: "p3", name: "فهد السالم", hint: "لجنة التصوير", group: "الأعضاء" },
  { id: "p4", name: "ريم الحسن", hint: "متطوّعة أدِيب", group: "المتطوّعون" },
];
const GROUP_TITLE: Record<Person["group"], string> = {
  "اللجنة": "لجنة التقارير والأرشفة", "الأعضاء": "أعضاء أدِيب", "المتطوّعون": "متطوّعو أدِيب",
};
/** موعد التسليم: اختياراتٌ سريعة ومعها «تاريخ محدّد»، والساعة اختياريّة لما له يوم بعينه (قرار المالك ٢٠٢٦-١٠-١٦). */
const DUES = [
  { value: "", label: "بلا موعد" },
  { value: "today", label: "اليوم" },
  { value: "tomorrow", label: "غدًا" },
  { value: "3d", label: "خلال 3 أيام" },
  { value: "week", label: "خلال أسبوع" },
  { value: "date", label: "تاريخ محدّد" },
];
type Due = { kind: string; date: string; time: string };
const NO_DUE: Due = { kind: "", date: "", time: "" };
const dueHasDay = (d: Due) => d.kind === "today" || d.kind === "tomorrow" || d.kind === "date";
const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 || 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "صباحًا" : "مساءً"}`;
};
const fmtDay = (iso: string) => {
  const d = new Date(`${iso}T12:00`);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ar-u-nu-latn", o).format(d);
  return `${part({ weekday: "long" })} ${part({ day: "numeric" })} ${part({ month: "long" })}`;
};
/** «قبل 10 مساءً اليوم»، «بنهاية الخميس 22 أكتوبر»، «خلال أسبوع». */
function dueLabel(d: Due): string {
  if (!d.kind || (d.kind === "date" && !d.date)) return "";
  if (d.kind === "3d") return "خلال 3 أيام";
  if (d.kind === "week") return "خلال أسبوع";
  if (d.time) return `قبل ${fmtTime(d.time)}${d.kind === "today" ? " اليوم" : d.kind === "tomorrow" ? " غدًا" : `، ${fmtDay(d.date)}`}`;
  return d.kind === "today" ? "بنهاية اليوم" : d.kind === "tomorrow" ? "بنهاية الغد" : `بنهاية ${fmtDay(d.date)}`;
}

type Ch = { id: number; heading: string; body: string };
/** خيطُ التكليف: ملاحظةُ التكليف أوّلُ رسالة، والإعادةُ رسالة، وأسئلةُ الكاتب وردودُ الرئيس (قرار المالك ٢٠٢٦-١٠-١٦). */
type Msg = { id: number; from: "chief" | "writer"; kind: "assign" | "return" | "msg"; text: string };
type Asg = { id: string; person: Person; parts: Part[]; due: string; state: "open" | "submitted" | "returned"; thread: Msg[] };
type Status = "draft" | "assigned" | "review" | "published";
type Content = { title: string; summary: string; lead: string; chapters: Ch[]; cover: string | null; gallery: string[]; authors: string[] };
/** نسخةٌ عند كلّ نشرٍ وكلّ «حدِّث المنشور» — لا عند حفظ المسودّة. */
type Version = { id: number; label: string; snap: Content };
type LogItem = { id: number; text: string; version?: number };
type PubComment = { id: number; newsId: string; who: string; guest: boolean; text: string };
export type Activity = { id: string; name: string; unit: string | null };
type News = Content & {
  id: string; category: Category; status: Status; asg: Asg[];
  /** ما يغطّيه: الفعاليّةُ اختياريّة والجهةُ منها، وإلّا يدويّة (صاحبةُ الحدث لا الكاتبة). */
  activity: string; unit: string; featured: boolean; slug: string;
  /** ما يراه القرّاء؛ وما سواه نسخةُ عملٍ حتى «حدِّث المنشور». */
  live: Content | null; versions: Version[]; log: LogItem[];
  /** نسخةٌ استُرجعت إلى نسخة العمل ولم تُنشر بعد. */
  restored?: string;
};
type ChiefScreen =
  | { kind: "list"; tab: "news" | "comments"; filter?: string }
  | { kind: "editor"; id: string; tab: "write" | "preview" | "manage"; thread?: string };
type WriterScreen = { kind: "home" } | { kind: "task"; id: string; asg: string; tab: "write" | "preview" };
type Note = { id: number; to: string; text: string; go: ChiefScreen | WriterScreen; read: boolean };

const STATUS: Record<Status, { label: string; tone: "neutral" | "info" | "warning" | "success" }> = {
  draft: { label: "مسودّة", tone: "neutral" },
  assigned: { label: "مُكلَّف", tone: "info" },
  review: { label: "جاهز للمراجعة", tone: "warning" },
  published: { label: "منشور", tone: "success" },
};

let seq = 0;
let uid = 0;
const nextId = () => ++uid;
const ch = (heading: string, body = ""): Ch => ({ id: ++seq, heading, body });
const snap = (n: Content): Content => ({
  title: n.title, summary: n.summary, lead: n.lead, chapters: n.chapters.map((c) => ({ ...c })),
  cover: n.cover, gallery: [...n.gallery], authors: [...n.authors],
});
const same = (a: Content, b: Content) => JSON.stringify(snap(a)) === JSON.stringify(snap(b));
function changedParts(a: Content, b: Content): string[] {
  const out: string[] = [];
  if (a.title !== b.title || a.summary !== b.summary) out.push("الترويسة");
  if (a.lead !== b.lead || JSON.stringify(a.chapters) !== JSON.stringify(b.chapters)) out.push("المتن");
  if (a.cover !== b.cover || a.gallery.join() !== b.gallery.join()) out.push("الصور");
  if (a.authors.join() !== b.authors.join()) out.push("الكتّاب");
  return out;
}
/** المعرّف: بلا تشكيل، نحوُ خمس كلمات من العنوان النهائيّ، ويُثبَّت عند النشر الأوّل. */
const slugOf = (t: string) => t.replace(/[ً-ْٰـ]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").trim().split(/\s+/).slice(0, 5).join("-");
const SEED_COMMENTS = [
  { who: "سارة الأحمد", guest: false, text: "تغطية جميلة، شكرًا لمن كتبها." },
  { who: "أبو فيصل", guest: true, text: "متى الورشة القادمة؟" },
];

/* ══ أدوات مشتركة ════════════════════════════════════════════════════ */

function splitPasted(text: string): { lead: string; chapters: Ch[] } {
  const chunks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((c) => c.split("\n").map((l) => l.trim()).filter(Boolean)).filter((c) => c.length);
  const isHead = (l: string) => l.length <= 40 && !/[.!؟?:،,»"]$/.test(l) && !/^[•"«“]/.test(l);
  let lead = "";
  const chapters: Ch[] = [];
  chunks.forEach((lines, i) => {
    const hasAfter = lines.length > 1 || i < chunks.length - 1;
    if (isHead(lines[0]) && hasAfter) chapters.push(ch(lines[0], lines.slice(1).join("\n")));
    else if (chapters.length) {
      const c = chapters[chapters.length - 1];
      c.body = [c.body, lines.join("\n")].filter(Boolean).join("\n\n");
    } else lead = [lead, lines.join("\n")].filter(Boolean).join("\n\n");
  });
  return { lead, chapters };
}

/** متنٌ بحقل الهويّة، وفوقه «بند» و«اقتباس» ما دام الكاتبُ فيه. */
function BodyField({ label, value, onChange, placeholder, rows = 4, onPaste, disabled }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number; onPaste?: () => void; disabled?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const lineOp = (op: "bullet" | "quote") => {
    const el = box.current?.querySelector("textarea");
    if (!el) return;
    const at = el.selectionStart;
    const start = value.lastIndexOf("\n", at - 1) + 1;
    const endIdx = value.indexOf("\n", at);
    const end = endIdx === -1 ? value.length : endIdx;
    const line = value.slice(start, end);
    const next = op === "bullet" ? (line.startsWith("• ") ? line.slice(2) : `• ${line}`) : (/^«.*»$/.test(line) ? line.slice(1, -1) : `«${line}»`);
    onChange(value.slice(0, start) + next + value.slice(end));
  };
  return (
    <div ref={box} className="nwx-bodyf" data-on={on || undefined}>
      <div className="nwx-tools" onMouseDown={(e) => e.preventDefault()} aria-hidden={!on}>
        <button type="button" tabIndex={on ? 0 : -1} onClick={() => lineOp("bullet")}><ListBullets size={14} aria-hidden />بند</button>
        <button type="button" tabIndex={on ? 0 : -1} onClick={() => lineOp("quote")}><Quotes size={14} aria-hidden />اقتباس</button>
      </div>
      <Textarea label={label} icon={<TextAlignLeft />} innerIcon={<PencilSimple />} placeholder={placeholder} disabled={disabled}
        rows={Math.min(14, Math.max(rows, Math.ceil(value.length / 42) + value.split("\n").length))}
        value={value} onChange={(e) => onChange(e.target.value)} onFocus={() => setOn(true)} onBlur={() => setOn(false)} onPaste={onPaste} />
    </div>
  );
}

/** الخبرُ كما سيراه القارئ. */
function Preview({ n }: { n: News }) {
  const blocks = sectionsToBlocks([{ heading: null, body: n.lead }, ...n.chapters.map((c) => ({ heading: c.heading || null, body: c.body }))]);
  return (
    <div className="nwx-prev">
      <section className="nwx-panel">
        <span className="nwx-cat">{CATEGORY_META[n.category].label}</span>
        <h2 className="nwx-p-title">{n.title || "خبرٌ بلا عنوان"}</h2>
        {n.summary ? <p className="nwx-p-dek">{n.summary}</p> : null}
        <p className="nwx-by">بريشة {n.authors.join("، ") || "—"}</p>
      </section>
      {n.cover ? (
        <figure className="nwx-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={n.cover} alt="" />
        </figure>
      ) : null}
      <div className="art nwx-p-body"><ArticleBody blocks={blocks} /></div>
      {n.gallery.length ? (
        <div className="nwx-gal-grid jr-prev-gal">
          {n.gallery.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * **أجزاءُ الخبر نموذجًا** — مكوّنٌ واحدٌ يستعمله رئيسُ التحرير (الأجزاءُ كلُّها) والمكلَّفُ (ما كُلِّف به وحده):
 * فلا يرى المكلَّفُ حقلًا مقفلًا قطّ، بل لا يرى إلّا عمله.
 */
function PartsForm({ n, parts, set, photos, locked }: {
  n: News; parts: Part[]; set: (p: Partial<News>) => void; photos: string[]; locked?: boolean;
}) {
  const [gone, setGone] = useState<{ at: number; c: Ch } | null>(null);
  const [offer, setOffer] = useState<{ lead: string; chapters: Ch[] } | null>(null);
  const pasted = useRef(false);
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => setGone(null), 8000);
    return () => clearTimeout(t);
  }, [gone]);

  const patch = (i: number, p: Partial<Ch>) => set({ chapters: n.chapters.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const move = (i: number, by: number) => {
    const to = i + by;
    if (to < 0 || to >= n.chapters.length) return;
    const next = [...n.chapters];
    [next[i], next[to]] = [next[to], next[i]];
    set({ chapters: next });
  };
  const drop = (i: number) => { setGone({ at: i, c: n.chapters[i] }); set({ chapters: n.chapters.filter((_, j) => j !== i) }); };
  const undo = () => {
    if (!gone) return;
    const next = [...n.chapters];
    next.splice(gone.at, 0, gone.c);
    set({ chapters: next });
    setGone(null);
  };
  const onLead = (v: string) => {
    set({ lead: v });
    if (!pasted.current) return;
    pasted.current = false;
    const p = splitPasted(v);
    if (p.chapters.length) setOffer(p);
  };
  const applySplit = () => {
    if (!offer) return;
    const empty = n.chapters.every((c) => !c.body.trim());
    set({ lead: offer.lead, chapters: empty ? offer.chapters : [...n.chapters, ...offer.chapters] });
    setOffer(null);
  };
  const goneEl = gone ? (
    <div className="nwx-gone" role="status">
      <span>حُذف فصل «{gone.c.heading || "بلا عنوان"}»</span>
      <Button variant="ghost" size="sm" onClick={undo}><ArrowUUpLeft size={16} />تراجع</Button>
    </div>
  ) : null;

  return (
    <>
      {parts.includes("الترويسة") ? (
        <SectionCard title="الترويسة" icon={<Newspaper />}>
          <div className="form-grid">
            <Field className="form-full" label="العنوان" icon={<Newspaper />} innerIcon={<PencilSimple />} placeholder="مشاركة أدِيب في…"
              value={n.title} disabled={locked} onChange={(e) => set({ title: e.target.value })}
              helper={`${n.title.length} من 60 حرفًا`} error={n.title.length > 60 ? `يزيد ${n.title.length - 60} حرفًا.` : undefined} />
            <Textarea className="form-full" label="الملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} rows={2} placeholder="سطران يُغريان بالقراءة"
              value={n.summary} disabled={locked} onChange={(e) => set({ summary: e.target.value })}
              helper={`${n.summary.length} من 120 حرفًا`} error={n.summary.length > 120 ? `يزيد ${n.summary.length - 120} حرفًا.` : undefined} />
          </div>
        </SectionCard>
      ) : null}

      {parts.includes("المتن") ? (
        <>
          <SectionCard title="المدخل" icon={<TextAlignLeft />}>
            <BodyField label="الفقرة التي يبدأ بها الخبر" value={n.lead} onChange={onLead} placeholder="نظّم نادي أدِيب…" rows={3}
              disabled={locked} onPaste={() => { pasted.current = true; }} />
            {offer ? (
              <div className="nwx-offer">
                <span>فيه {arCount(offer.chapters.length, AR_CHAPTER)}</span>
                <Button variant="primary" size="sm" onClick={applySplit}>قطّعه إلى فصول</Button>
                <Button variant="ghost" size="sm" onClick={() => setOffer(null)}>أبقِه كما هو</Button>
              </div>
            ) : null}
          </SectionCard>
          {n.chapters.map((c, i) => (
            <div key={c.id} className="nwx-chwrap">
              {gone && gone.at === i ? goneEl : null}
              <SectionCard
                title={<span className="nwx-chtitle"><b>{String(i + 1).padStart(2, "0")}</b>{c.heading || "فصلٌ بلا عنوان"}</span>}
                icon={<TextAlignLeft />}
                actions={locked ? undefined : (
                  <span className="nwx-chacts">
                    <IconButton aria-label="أعلى" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></IconButton>
                    <IconButton aria-label="أسفل" disabled={i === n.chapters.length - 1} onClick={() => move(i, 1)}><ArrowDown /></IconButton>
                    <IconButton aria-label="حذف الفصل" tone="danger" onClick={() => drop(i)}><Trash /></IconButton>
                  </span>
                )}
              >
                <div className="nwx-chform">
                  <Field label="عنوان الفصل" icon={<Newspaper />} innerIcon={<PencilSimple />} placeholder="المحاور" disabled={locked}
                    value={c.heading} onChange={(e) => patch(i, { heading: e.target.value })} />
                  <BodyField label="متن الفصل" value={c.body} onChange={(v) => patch(i, { body: v })} placeholder="تناولت الورشة…" disabled={locked} />
                </div>
              </SectionCard>
            </div>
          ))}
          {gone && gone.at >= n.chapters.length ? goneEl : null}
          {locked ? null : (
            <button type="button" className="nwx-add" onClick={() => set({ chapters: [...n.chapters, ch("")] })}>
              <Plus size={18} aria-hidden />أضف فصلًا
            </button>
          )}
        </>
      ) : null}

      {parts.includes("الصور") ? (
        <SectionCard title="الصور" icon={<Images />}>
          {n.cover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="nwx-f-cover" src={n.cover} alt="الغلاف" />
              <p className="nwx-f-by"><Camera size={14} aria-hidden />الغلاف</p>
            </>
          ) : null}
          {n.gallery.length ? (
            <div className="nwx-gal-grid mt-3">
              {n.gallery.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" />
              ))}
            </div>
          ) : null}
          {locked ? null : (
            <div className="btn-row mt-3">
              <Button variant="ghost" size="sm" onClick={() => set({ cover: photos[0] ?? null })}><UploadSimple size={16} />{n.cover ? "استبدال الغلاف" : "رفع الغلاف"}</Button>
              <Button variant="ghost" size="sm" onClick={() => set({ gallery: photos.slice(1, 5) })}><Images size={16} />إضافة صور</Button>
            </div>
          )}
        </SectionCard>
      ) : null}
    </>
  );
}

function Bellish({ notes, onGo }: { notes: Note[]; onGo: (n: Note) => void }) {
  const [open, setOpen] = useState(false);
  const unread = notes.filter((n) => !n.read).length;
  return (
    <div className="jr-bell">
      <button type="button" className="jr-bell-btn" aria-label="الإشعارات" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Bell size={20} aria-hidden />{unread ? <b>{unread}</b> : null}
      </button>
      {open ? (
        <div className="jr-bell-pop">
          {notes.length ? notes.slice().reverse().map((n) => (
            <button key={n.id} type="button" className="jr-note" data-unread={!n.read || undefined} onClick={() => { setOpen(false); onGo(n); }}>{n.text}</button>
          )) : <p className="jr-note-empty">لا إشعارات</p>}
        </div>
      ) : null}
    </div>
  );
}

/** خيطُ تكليفٍ واحد: بين رئيس التحرير وهذا الكاتب وحده. */
function Thread({ a, me, onSend, readOnly }: { a: Asg; me: "chief" | "writer"; onSend: (t: string) => void; readOnly?: boolean }) {
  const [text, setText] = useState("");
  const name = (m: Msg) => (m.from === "chief" ? CHIEF : a.person.name);
  return (
    <div className="jr-thread">
      {a.thread.length ? a.thread.map((m) => (
        <div key={m.id} className="jr-msg" data-me={m.from === me || undefined} data-kind={m.kind}>
          <small>{m.kind === "assign" ? `${name(m)}، مع التكليف` : m.kind === "return" ? `${name(m)}، أعاده` : name(m)}</small>
          <p>{m.text}</p>
        </div>
      )) : <p className="jr-note-empty">لا رسائل بعد.</p>}
      {readOnly ? null : (
        <div className="jr-thread-send">
          <Textarea label={me === "writer" ? "اسأل أو علّق" : "ردّ"} icon={<ChatCircleDots />} innerIcon={<PencilSimple />} rows={2}
            placeholder={me === "writer" ? "هل أذكر أسماء الضيوف؟" : "نعم، اذكرهم…"} value={text} onChange={(e) => setText(e.target.value)} />
          <Button variant="primary" size="md" disabled={!text.trim()} onClick={() => { onSend(text.trim()); setText(""); }}><PaperPlaneTilt size={18} />أرسِل</Button>
        </div>
      )}
    </div>
  );
}

/* ══ الرحلة ══════════════════════════════════════════════════════════ */

export function JourneyLab({ photos, published, activities, units }: {
  photos: string[]; published: { title: string; cover: string | null }[]; activities: Activity[]; units: string[];
}) {
  const [news, setNews] = useState<News[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [comments, setComments] = useState<PubComment[]>([]);
  const [who, setWho] = useState<string>("chief");
  const [chief, setChief] = useState<ChiefScreen>({ kind: "list", tab: "news" });
  const [writer, setWriter] = useState<Record<string, WriterScreen>>({});
  const [w, setW] = useState("375");
  const [creating, setCreating] = useState<{ title: string; category: Category } | null>(null);
  const [assigning, setAssigning] = useState<{ id: string; person: string; parts: Part[]; due: Due; note: string } | null>(null);
  const [returning, setReturning] = useState<{ id: string; asg: string; note: string } | null>(null);
  const [kill, setKill] = useState<number | null>(null);
  const [saved, setSaved] = useState<"saved" | "saving">("saved");

  const notify = (to: string, text: string, go: ChiefScreen | WriterScreen) => setNotes((s) => [...s, { id: nextId(), to, text, go, read: false }]);
  const upd = (id: string, f: (n: News) => News) => setNews((s) => s.map((n) => (n.id === id ? f(n) : n)));
  const withLog = (x: News, text: string, version?: number): News => ({ ...x, log: [{ id: nextId(), text, version }, ...x.log] });
  const edit = (id: string, p: Partial<News>) => { setSaved("saving"); upd(id, (n) => ({ ...n, ...p })); };
  useEffect(() => {
    if (saved !== "saving") return;
    const t = setTimeout(() => setSaved("saved"), 900);
    return () => clearTimeout(t);
  }, [saved, news]);

  const actOf = (n: News) => activities.find((a) => a.id === n.activity);
  const unitOf = (n: News) => actOf(n)?.unit ?? (n.unit || null);
  const dirty = (n: News) => n.status === "published" && !!n.live && !same(n, n.live);
  const forReaders = (n: News): News => (n.live ? { ...n, ...n.live } : n);

  const assignees = PEOPLE.filter((p) => news.some((n) => n.asg.some((a) => a.person.id === p.id)));
  const roles = [{ value: "chief", label: `رئيس التحرير` }, ...assignees.map((p) => ({ value: p.id, label: p.name }))];
  const myNotes = notes.filter((n) => n.to === who);
  const goNote = (n: Note) => {
    setNotes((s) => s.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (who === "chief") setChief(n.go as ChiefScreen); else setWriter((s) => ({ ...s, [who]: n.go as WriterScreen }));
  };

  /* ── أفعال رئيس التحرير ── */
  const create = () => {
    if (!creating?.title.trim()) return;
    const id = `n${news.length + 1}`;
    const n: News = {
      id, title: creating.title, summary: "", category: creating.category, lead: "", chapters: TEMPLATE[creating.category].map((h) => ch(h)),
      cover: null, gallery: [], authors: [], status: "draft", asg: [], activity: "", unit: "", featured: false, slug: "", live: null, versions: [], log: [],
    };
    setNews((s) => [withLog(n, `أنشأه ${CHIEF}`), ...s]);
    setCreating(null);
    setChief({ kind: "editor", id, tab: "write" });
  };
  const assign = () => {
    if (!assigning) return;
    const person = PEOPLE.find((p) => p.id === assigning.person);
    if (!person || !assigning.parts.length || (assigning.due.kind === "date" && !assigning.due.date)) return;
    const thread: Msg[] = assigning.note.trim() ? [{ id: nextId(), from: "chief", kind: "assign", text: assigning.note.trim() }] : [];
    const a: Asg = { id: `a${nextId()}`, person, parts: assigning.parts, due: dueLabel(assigning.due), state: "open", thread };
    const n = news.find((x) => x.id === assigning.id)!;
    upd(assigning.id, (x) => withLog({ ...x, asg: [...x.asg, a], status: x.status === "draft" ? "assigned" : x.status }, `كلّف ${person.name}: ${a.parts.join(" و")}`));
    notify(person.id, `كلّفك ${CHIEF}: ${assigning.parts.join(" و")} في خبر «${n.title}»`, { kind: "task", id: n.id, asg: a.id, tab: "write" });
    setAssigning(null);
  };
  const publish = (id: string) => {
    const n = news.find((x) => x.id === id)!;
    const slug = n.slug.trim() || slugOf(n.title);
    const v: Version = { id: nextId(), label: "النشر الأوّل", snap: snap(n) };
    upd(id, (x) => withLog({ ...x, status: "published", slug, live: snap(x), versions: [v] }, `نشره ${CHIEF}`, v.id));
    n.asg.forEach((a) => notify(a.person.id, `نُشر خبر «${n.title}» الذي شاركتَ فيه`, { kind: "task", id, asg: a.id, tab: "preview" }));
    // تعليقان يصلان بعد النشر — يُنشران فورًا، ويصل الرئيسَ إشعارُ كلٍّ منهما.
    setComments((s) => [...SEED_COMMENTS.map((c) => ({ ...c, id: nextId(), newsId: id })), ...s]);
    SEED_COMMENTS.forEach((c) => notify("chief", `تعليقٌ جديد على «${n.title}»: ${c.who}`, { kind: "list", tab: "comments", filter: id }));
  };
  const update = (id: string) => upd(id, (x) => {
    if (!x.live) return x;
    const parts = changedParts(x.live, x);
    const v: Version = { id: nextId(), label: `التحديث ${x.versions.length}`, snap: snap(x) };
    const what = x.restored ? `استرجع «${x.restored}» ونشرها` : `حدّث المنشور: ${parts.join(" و")}`;
    return withLog({ ...x, live: snap(x), versions: [...x.versions, v], restored: undefined }, what, v.id);
  });
  const discard = (id: string) => upd(id, (x) => (x.live ? { ...x, ...snap(x.live), restored: undefined } : x));
  const restore = (id: string, vid: number) => {
    upd(id, (x) => { const v = x.versions.find((y) => y.id === vid); return v ? { ...x, ...snap(v.snap), restored: v.label } : x; });
    setChief({ kind: "editor", id, tab: "preview" });
  };
  const toggleFeatured = (id: string) => upd(id, (x) => withLog({ ...x, featured: !x.featured }, x.featured ? "ألغى تمييزه" : "ميّزه، فدخل صدر الرئيسيّة"));
  const sendBack = () => {
    if (!returning?.note.trim()) return;
    const n = news.find((x) => x.id === returning.id)!;
    const a = n.asg.find((x) => x.id === returning.asg)!;
    const m: Msg = { id: nextId(), from: "chief", kind: "return", text: returning.note.trim() };
    upd(returning.id, (x) => withLog({ ...x, status: "assigned", asg: x.asg.map((y) => (y.id === a.id ? { ...y, state: "returned", thread: [...y.thread, m] } : y)) }, `أعاده إلى ${a.person.name}`));
    notify(a.person.id, `أعاد إليك ${CHIEF} خبر «${n.title}»: ${m.text}`, { kind: "task", id: n.id, asg: a.id, tab: "write" });
    setReturning(null);
  };
  const say = (id: string, asgId: string, from: "chief" | "writer", text: string) => {
    const n = news.find((x) => x.id === id)!;
    const a = n.asg.find((x) => x.id === asgId)!;
    const m: Msg = { id: nextId(), from, kind: "msg", text };
    upd(id, (x) => ({ ...x, asg: x.asg.map((y) => (y.id === asgId ? { ...y, thread: [...y.thread, m] } : y)) }));
    if (from === "writer") notify("chief", `${a.person.name} في «${n.title}»: ${text}`, { kind: "editor", id, tab: "write", thread: asgId });
    else notify(a.person.id, `${CHIEF}: ${text}`, { kind: "task", id, asg: asgId, tab: "write" });
  };
  const removeComment = () => {
    const c = comments.find((x) => x.id === kill);
    if (!c) return;
    setComments((s) => s.filter((x) => x.id !== c.id));
    upd(c.newsId, (x) => withLog(x, `حذف تعليقًا كتبه ${c.who}`));
    setKill(null);
  };

  /* ── أفعال المكلَّف ── */
  const submit = (id: string, asgId: string) => {
    const n = news.find((x) => x.id === id)!;
    const a = n.asg.find((x) => x.id === asgId)!;
    upd(id, (x) => {
      const asg = x.asg.map((y) => (y.id === asgId ? { ...y, state: "submitted" as const } : y));
      // من كتب المتن يدخل «بريشة» تلقائيًّا، ولرئيس التحرير أن يعدّل (قرار المالك).
      const authors = a.parts.includes("المتن") && !x.authors.includes(a.person.name) ? [...x.authors, a.person.name] : x.authors;
      // «جاهزٌ للمراجعة» حين يسلّم المكلَّفون جميعًا.
      const status: Status = asg.every((y) => y.state === "submitted") ? "review" : x.status;
      return withLog({ ...x, asg, authors, status }, `سلّم ${a.person.name} ${a.parts.join(" و")}`);
    });
    notify("chief", `سلّم ${a.person.name} ${a.parts.join(" و")} في خبر «${n.title}»`, { kind: "editor", id, tab: "preview" });
  };

  /* ── الشاشات ── */
  const listScreen = (s: Extract<ChiefScreen, { kind: "list" }>) => {
    const shown = comments.filter((c) => !s.filter || c.newsId === s.filter);
    const titleOf = (id: string) => news.find((x) => x.id === id)?.title ?? "";
    return (
      <div className="jr-screen">
        <div className="jr-head"><h2>غرفة الأخبار</h2>{s.tab === "news" ? <Button variant="primary" size="sm" onClick={() => setCreating({ title: "", category: "coverage" })}><Plus size={16} />خبر جديد</Button> : null}</div>
        <Segmented wide aria-label="الغرفة" items={[{ value: "news", label: "الأخبار" }, { value: "comments", label: comments.length ? `التعليقات (${comments.length})` : "التعليقات" }]}
          value={s.tab} onValueChange={(v) => setChief({ kind: "list", tab: v as "news" | "comments" })} />
        {s.tab === "news" ? (
          <div className="jr-list">
            {news.map((n) => (
              <button key={n.id} type="button" className="jr-item" onClick={() => setChief({ kind: "editor", id: n.id, tab: n.status === "review" ? "preview" : "write" })}>
                <span className="jr-item-t">{n.featured ? <Star size={15} aria-hidden /> : null}{n.title}</span>
                <span className="jr-item-s">
                  <Badge tone={STATUS[n.status].tone} dot>{STATUS[n.status].label}</Badge>
                  {dirty(n) ? <Badge tone="warning" dot>تعديلات لم تُنشر</Badge> : null}
                  {n.asg.length ? <span>{n.asg.map((a) => `${a.person.name}: ${a.parts.join(" و")}`).join("، ")}</span> : null}
                </span>
              </button>
            ))}
            {published.map((p) => (
              <div key={p.title} className="jr-item" data-static>
                <span className="jr-item-t">{p.title}</span>
                <span className="jr-item-s"><Badge tone="success" dot>منشور</Badge></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="jr-list">
            {s.filter ? (
              <div className="jr-filter"><span>على «{titleOf(s.filter)}»</span><Button variant="ghost" size="sm" onClick={() => setChief({ kind: "list", tab: "comments" })}><X size={14} />كلّ التعليقات</Button></div>
            ) : null}
            {shown.length ? shown.map((c) => (
              <div key={c.id} className="jr-cmt">
                <div className="jr-cmt-top"><b>{c.who}</b>{c.guest ? <Badge tone="neutral" variant="outline">زائر</Badge> : null}</div>
                <p>{c.text}</p>
                <div className="jr-cmt-foot">
                  <span>على «{titleOf(c.newsId)}»</span>
                  <Button variant="ghost" size="sm" onClick={() => setKill(c.id)}><Trash size={14} />حذف</Button>
                </div>
              </div>
            )) : <p className="jr-note-empty">لا تعليقات.</p>}
          </div>
        )}
      </div>
    );
  };

  const manageTab = (n: News) => {
    const act = actOf(n);
    const count = comments.filter((c) => c.newsId === n.id).length;
    return (
      <div className="nwx-form">
        <SectionCard title="ما يغطّيه" icon={<Buildings />}>
          <div className="form-grid">
            <Select className="form-full" label="الفعاليّة" icon={<CalendarBlank />} optional searchable
              options={[{ value: "", label: "بلا فعاليّة" }, ...activities.map((a) => ({ value: a.id, label: a.name }))]}
              value={n.activity} onValueChange={(v) => edit(n.id, { activity: v })} />
            {act?.unit ? (
              <p className="jr-from form-full"><Buildings size={16} aria-hidden />الجهة: {act.unit}، من الفعاليّة</p>
            ) : (
              <Select className="form-full" label="الجهة" icon={<Buildings />} searchable placeholder="صاحبة الحدث"
                options={units.map((u) => ({ value: u, label: u }))} value={n.unit} onValueChange={(v) => edit(n.id, { unit: v })}
                helper={act ? "هذه الفعاليّة بلا جهةٍ منظِّمة، فاخترها." : "صاحبةُ الحدث، لا اللجنةُ الكاتبة."} />
            )}
          </div>
        </SectionCard>
        <SectionCard title="الظهور" icon={<Star />}>
          <div className="form-grid">
            <Checkbox className="form-full" card label="مميّز" description="يدخل صدر الصفحة الرئيسيّة وتظهر عليه النجمة." checked={n.featured} onChange={() => toggleFeatured(n.id)} />
            {n.status === "published" ? (
              <p className="jr-from form-full"><LinkSimple size={16} aria-hidden />adeeb.club/news/{n.slug}</p>
            ) : (
              <Field className="form-full" label="المعرّف (رابط الخبر)" icon={<LinkSimple />} innerIcon={<PencilSimple />} optional
                placeholder={slugOf(n.title)} value={n.slug} onChange={(e) => edit(n.id, { slug: e.target.value })}
                helper="إن تركتَه وُلِّد من العنوان عند النشر، ثم لا يتغيّر." />
            )}
          </div>
        </SectionCard>
        <SectionCard title="تعليقات القرّاء" icon={<ChatCircleDots />}>
          {n.status === "published" ? (
            <div className="jr-from"><span>{count ? `${count} على هذا الخبر` : "لا تعليقات بعد"}</span>
              {count ? <Button variant="ghost" size="sm" onClick={() => setChief({ kind: "list", tab: "comments", filter: n.id })}>افتحها</Button> : null}
            </div>
          ) : <p className="jr-note-empty">تُفتح بعد النشر.</p>}
        </SectionCard>
        <SectionCard title="السجلّ" icon={<ClockCounterClockwise />}>
          <ul className="jr-log">
            {n.log.map((l) => (
              <li key={l.id}>
                <span>{l.text}</span>
                {l.version && n.status === "published" ? <Button variant="ghost" size="sm" onClick={() => restore(n.id, l.version!)}><ArrowUUpLeft size={14} />استرجاع</Button> : null}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    );
  };

  const screenChief = () => {
    if (chief.kind === "list") return listScreen(chief);
    const n = news.find((x) => x.id === chief.id)!;
    const full = n.chapters.filter((c) => c.heading.trim() && c.body.trim()).length;
    const ready = [
      { label: "المدخل", ok: !!n.lead.trim() },
      { label: full >= 2 ? arCount(full, AR_CHAPTER) : "فصلان", ok: full >= 2 },
      { label: "الملخّص", ok: !!n.summary.trim() },
      { label: "الغلاف", ok: !!n.cover },
      { label: "الكاتب", ok: n.authors.length > 0 },
    ];
    const gaps = ready.filter((r) => !r.ok).length;
    const pending = n.asg.filter((a) => a.state !== "submitted");
    const isDirty = dirty(n);
    return (
      <div className="jr-screen">
        <button type="button" className="jr-back" onClick={() => setChief({ kind: "list", tab: "news" })}>→ الأخبار</button>
        <div className="nwx-top">
          <div className="nwx-top-id">
            <h1 className="nwx-top-t">{n.title}</h1>
            <Badge tone={STATUS[n.status].tone} dot>{STATUS[n.status].label}</Badge>
            {isDirty ? <Badge tone="warning" dot>تعديلات لم تُنشر</Badge> : null}
          </div>
          <span className="nwx-save" data-state={saved}><CloudCheck size={16} aria-hidden />{saved === "saving" ? "يُحفظ" : "حُفظ"}</span>
        </div>

        {/* الطاقم: من كُلِّف بماذا، وأين وصل، وخيطُ كلٍّ منهم. */}
        <section className="jr-crew">
          {n.asg.map((a) => {
            const open = chief.thread === a.id;
            return (
              <div key={a.id} className="jr-crew-item">
                <div className="jr-crew-row">
                  <span className="jr-crew-who"><b>{a.person.name}</b><span>{a.parts.join(" و")}{a.due ? `، ${a.due}` : ""}</span></span>
                  <Badge tone={a.state === "submitted" ? "success" : a.state === "returned" ? "danger" : "info"} dot>
                    {a.state === "submitted" ? "سلّم" : a.state === "returned" ? "أُعيد إليه" : "يعمل"}
                  </Badge>
                  <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setChief({ ...chief, thread: open ? undefined : a.id })}>
                    <ChatCircleDots size={16} />{a.thread.length ? `المحادثة (${a.thread.length})` : "المحادثة"}
                  </Button>
                </div>
                {open ? <Thread a={a} me="chief" onSend={(t) => say(n.id, a.id, "chief", t)} readOnly={n.status === "published"} /> : null}
              </div>
            );
          })}
          {n.status !== "published" ? (
            <Button variant="ghost" size="md" onClick={() => setAssigning({ id: n.id, person: "", parts: ["المتن"], due: NO_DUE, note: "" })}>
              <UsersThree size={18} />كلِّف
            </Button>
          ) : null}
        </section>

        <Segmented className="mb-4" wide aria-label="ألواح الخبر"
          items={[{ value: "write", label: "الكتابة" }, { value: "preview", label: "المعاينة" }, { value: "manage", label: "الإدارة" }]}
          value={chief.tab} onValueChange={(v) => setChief({ ...chief, tab: v as "write" | "preview" | "manage" })} />

        {chief.tab === "preview" ? <Preview n={n} /> : chief.tab === "manage" ? manageTab(n) : (
          <div className="nwx-form">
            <PartsForm n={n} parts={["الترويسة", "المتن", "الصور"]} set={(p) => edit(n.id, p)} photos={photos} />
            <SectionCard title="تفاصيل النشر" icon={<ClipboardText />}>
              <div className="form-grid">
                <Select label="الفئة" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={n.category} onValueChange={(v) => edit(n.id, { category: v as Category })} />
                <Field label="الكتّاب" icon={<UsersThree />} innerIcon={<PencilSimple />} placeholder="من كتب الخبر" value={n.authors.join("، ")}
                  onChange={(e) => edit(n.id, { authors: e.target.value.split("،").map((s) => s.trim()).filter(Boolean) })} />
              </div>
            </SectionCard>
          </div>
        )}

        {n.status !== "published" ? (
          <section className="nwx-end">
            <ul className="nwx-ready" aria-label="جاهزيّة النشر">
              {ready.map((r) => <li key={r.label} data-ok={r.ok || undefined}>{r.ok ? <Check size={13} aria-hidden /> : <Circle size={13} aria-hidden />}{r.label}</li>)}
              {pending.length ? <li>{arCount(pending.length, ["مكلَّفٌ لم يسلّم", "مكلَّفان لم يسلّما", "مكلَّفين لم يسلّموا", "مكلَّفًا لم يسلّموا"])}</li> : null}
            </ul>
            <p className="jr-slug"><LinkSimple size={14} aria-hidden />سيُنشر على adeeb.club/news/{n.slug.trim() || slugOf(n.title)}</p>
            <div className="btn-row">
              <Button variant="primary" size="md" disabled={gaps > 0 || pending.length > 0} onClick={() => publish(n.id)}><Megaphone size={18} />نشر</Button>
              {n.asg.some((a) => a.state === "submitted") ? (
                <Button variant="ghost" size="md" onClick={() => setReturning({ id: n.id, asg: n.asg.find((a) => a.state === "submitted")!.id, note: "" })}>
                  <ArrowUUpLeft size={18} />أعِده بملاحظة
                </Button>
              ) : null}
              {chief.tab !== "write" ? <Button variant="ghost" size="md" onClick={() => setChief({ ...chief, tab: "write" })}><NotePencil size={18} />عدّله بنفسي</Button> : null}
            </div>
          </section>
        ) : isDirty ? (
          <section className="nwx-end">
            <p className="jr-slug">{n.restored ? `استرجعتَ «${n.restored}» إلى نسخة العمل، ولن يراها القرّاء حتى تحدّث المنشور.` : "القرّاء يرون النسخة المنشورة، وتعديلاتك هنا لا تظهر لهم حتى تحدّث المنشور."}</p>
            <ul className="nwx-ready" aria-label="جاهزيّة النشر">
              {ready.map((r) => <li key={r.label} data-ok={r.ok || undefined}>{r.ok ? <Check size={13} aria-hidden /> : <Circle size={13} aria-hidden />}{r.label}</li>)}
            </ul>
            <div className="btn-row">
              <Button variant="primary" size="md" disabled={gaps > 0} onClick={() => update(n.id)}><Megaphone size={18} />حدِّث المنشور</Button>
              <Button variant="ghost" size="md" onClick={() => discard(n.id)}><ArrowUUpLeft size={18} />تراجع عن التعديلات</Button>
            </div>
          </section>
        ) : <p className="jr-done"><Megaphone size={18} aria-hidden />منشور. وأيّ تعديلٍ يبقى عندك حتى تضغط «حدِّث المنشور».</p>}
      </div>
    );
  };

  const screenWriter = (pid: string) => {
    const person = PEOPLE.find((p) => p.id === pid)!;
    const s = writer[pid] ?? { kind: "home" };
    const mine = news.flatMap((n) => n.asg.filter((a) => a.person.id === pid).map((a) => ({ n, a })));
    if (s.kind === "home") {
      return (
        <div className="jr-screen">
          <div className="jr-head"><h2>أهلًا {person.name.split(" ")[0]}</h2></div>
          {/* «مهامّ الكتابة» في الرئيسية: البابُ الدائمُ للعضو والمتطوّع معًا، لمن فاته الإشعار. */}
          <SectionCard title="مهامّ الكتابة" icon={<NotePencil />}>
            {mine.length ? (
              <div className="jr-list">
                {mine.map(({ n, a }) => (
                  <button key={a.id} type="button" className="jr-item" onClick={() => setWriter((x) => ({ ...x, [pid]: { kind: "task", id: n.id, asg: a.id, tab: "write" } }))}>
                    <span className="jr-item-t">{a.parts.join(" و")} في «{forReaders(n).title}»</span>
                    <span className="jr-item-s">
                      <Badge tone={n.status === "published" ? "success" : a.state === "submitted" ? "neutral" : a.state === "returned" ? "danger" : "info"} dot>
                        {n.status === "published" ? "نُشر" : a.state === "submitted" ? "سلّمتَه" : a.state === "returned" ? "أُعيد إليك" : "مطلوبٌ منك"}
                      </Badge>
                      {a.due && a.state !== "submitted" && n.status !== "published" ? <span>{a.due}</span> : null}
                    </span>
                  </button>
                ))}
              </div>
            ) : <p className="jr-note-empty">لا مهامّ كتابة.</p>}
          </SectionCard>
          <div className="jr-rooms" aria-hidden>
            <span><HandHeart size={18} />تطوّعي</span><span><Ticket size={18} />حجوزاتي</span>
          </div>
        </div>
      );
    }
    const n0 = news.find((x) => x.id === s.id)!;
    const isPub = n0.status === "published";
    // بعد النشر يرى الكاتبُ ما يراه القرّاء، لا نسخةَ عمل الرئيس.
    const n = isPub ? forReaders(n0) : n0;
    const a = n0.asg.find((x) => x.id === s.asg)!;
    const done = a.state === "submitted" || isPub;
    const act = actOf(n0);
    const unit = unitOf(n0);
    return (
      <div className="jr-screen">
        <button type="button" className="jr-back" onClick={() => setWriter((x) => ({ ...x, [pid]: { kind: "home" } }))}>→ الرئيسية</button>
        <div className="nwx-top">
          <div className="nwx-top-id"><h1 className="nwx-top-t">{a.parts.join(" و")}</h1>
            <Badge tone={isPub ? "success" : done ? "neutral" : "info"} dot>{isPub ? "نُشر" : done ? "سلّمتَه" : "مطلوبٌ منك"}</Badge>
          </div>
          {done ? null : <span className="nwx-save" data-state={saved}><CloudCheck size={16} aria-hidden />{saved === "saving" ? "يُحفظ" : "حُفظ"}</span>}
        </div>
        <p className="jr-ctx">في خبر «{n.title}»، {CATEGORY_META[n.category].label}{act ? `، عن فعاليّة «${act.name}»` : ""}{unit ? `، ${unit}` : ""}</p>
        {a.due && !done ? <p className="nwx-brief-fields"><span>{a.due}</span></p> : null}
        {isPub ? <p className="jr-from"><LinkSimple size={16} aria-hidden />منشورٌ على adeeb.club/news/{n0.slug}</p> : null}

        <section className="jr-crew-item">
          <p className="jr-pick-h">المحادثة مع {CHIEF}</p>
          <Thread a={a} me="writer" onSend={(t) => say(n0.id, a.id, "writer", t)} readOnly={isPub} />
        </section>

        <Segmented className="mb-4 mt-4" wide aria-label="ألواح المهمة"
          items={[{ value: "write", label: "عملي" }, { value: "preview", label: "الخبر كاملًا" }]}
          value={s.tab} onValueChange={(v) => setWriter((x) => ({ ...x, [pid]: { ...s, tab: v as "write" | "preview" } }))} />
        {s.tab === "preview" ? <Preview n={n} /> : (
          <div className="nwx-form">
            <PartsForm n={n} parts={a.parts} set={(p) => edit(n0.id, p)} photos={photos} locked={done} />
          </div>
        )}
        {done ? (
          <p className="jr-done"><Check size={18} aria-hidden />{isPub ? "نُشر الخبر، ومهمّتك للقراءة." : `سلّمتَه، وهو عند ${CHIEF}.`}</p>
        ) : (
          <section className="nwx-end">
            <div className="btn-row"><Button variant="primary" size="md" onClick={() => submit(n0.id, a.id)}><PaperPlaneTilt size={18} />سلِّم</Button></div>
          </section>
        )}
      </div>
    );
  };

  const current = PEOPLE.find((p) => p.id === who);
  return (
    <main className="py-12">
      <Container>
        <h1 className="font-display text-3xl font-black text-content">رحلة الخبر</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-content-muted">أنت الآن:</span>
          <Segmented items={roles} value={who} onValueChange={setWho} aria-label="الدور" />
          <Segmented items={[{ value: "375", label: "375" }, { value: "1100", label: "1100" }]} value={w} onValueChange={setW} aria-label="العرض" />
        </div>
      </Container>

      <div className="nwx-frame mt-6" style={{ maxWidth: Number(w) }}>
        <div className="jr-app">
          <header className="jr-bar">
            <span className="jr-bar-id">{who === "chief" ? <><Newspaper size={18} aria-hidden />غرفة الأخبار</> : <><Eye size={18} aria-hidden />بوّابة أدِيب، {current?.name}</>}</span>
            <Bellish notes={myNotes} onGo={goNote} />
          </header>
          <div className="nwx-ed">{who === "chief" ? screenChief() : screenWriter(who)}</div>
        </div>
      </div>

      <Modal open={!!creating} onClose={() => setCreating(null)} title="خبر جديد" size="sm"
        footer={<><Button variant="ghost" size="md" onClick={() => setCreating(null)}>إلغاء</Button><Button variant="primary" size="md" disabled={!creating?.title.trim()} onClick={create}>إنشاء</Button></>}>
        <Field label="العنوان المبدئيّ" icon={<Newspaper />} innerIcon={<PencilSimple />} placeholder="ورشة في كتابة القصة القصيرة"
          value={creating?.title ?? ""} onChange={(e) => setCreating((c) => c && { ...c, title: e.target.value })} />
        <Select label="الفئة" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={creating?.category ?? "coverage"}
          onValueChange={(v) => setCreating((c) => c && { ...c, category: v as Category })} />
      </Modal>

      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="كلِّف" size="md"
        footer={<><Button variant="ghost" size="md" onClick={() => setAssigning(null)}>إلغاء</Button>
          <Button variant="primary" size="md" disabled={!assigning?.person || !assigning?.parts.length || (assigning.due.kind === "date" && !assigning.due.date)} onClick={assign}>كلِّف</Button></>}>
        {(["اللجنة", "الأعضاء", "المتطوّعون"] as const).map((g) => (
            <div key={g} className="jr-pick-g">
              <p className="jr-pick-h">{GROUP_TITLE[g]}</p>
              {PEOPLE.filter((p) => p.group === g).map((p) => (
                <Radio key={p.id} name="jr-person" label={p.name} description={p.hint} checked={assigning?.person === p.id}
                  onChange={() => setAssigning((x) => x && { ...x, person: p.id })} />
              ))}
            </div>
          ))}
        <p className="jr-pick-h">المطلوب منه</p>
          {PARTS.map(({ part, hint }) => (
            <Checkbox key={part} card label={part} description={hint} checked={!!assigning?.parts.includes(part)}
              onChange={(e) => setAssigning((x) => x && { ...x, parts: e.target.checked ? [...x.parts, part] : x.parts.filter((y) => y !== part) })} />
          ))}
        <Select label="موعد التسليم" icon={<CalendarBlank />} options={DUES} value={assigning?.due.kind ?? ""} optional
          onValueChange={(v) => setAssigning((x) => x && { ...x, due: { ...x.due, kind: v } })} />
        {assigning?.due.kind === "date" ? (
          <Field label="التاريخ" type="date" icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder="اختر التاريخ" required
            value={assigning.due.date} onChange={(e) => setAssigning((x) => x && { ...x, due: { ...x.due, date: e.target.value } })} />
        ) : null}
        {assigning && dueHasDay(assigning.due) ? (
          <Field label="الساعة" type="time" icon={<Clock />} innerIcon={<HourglassMedium />} placeholder="—" optional
            value={assigning.due.time} onChange={(e) => setAssigning((x) => x && { ...x, due: { ...x.due, time: e.target.value } })} />
        ) : null}
        <Textarea label="ملاحظة" helper="تصير أوّلَ رسالةٍ في محادثة التكليف." icon={<TextAlignLeft />} innerIcon={<PencilSimple />} rows={2} placeholder="ما المطلوب تحديدًا…" optional
          value={assigning?.note ?? ""} onChange={(e) => setAssigning((x) => x && { ...x, note: e.target.value })} />
      </Modal>

      <Modal open={!!returning} onClose={() => setReturning(null)} title="أعِده بملاحظة" size="sm"
        footer={<><Button variant="ghost" size="md" onClick={() => setReturning(null)}>إلغاء</Button><Button variant="primary" size="md" disabled={!returning?.note.trim()} onClick={sendBack}>أعِده</Button></>}>
        <Textarea label="ما ينبغي تعديله" icon={<ArrowUUpLeft />} innerIcon={<PencilSimple />} rows={3} placeholder="الفصل الثاني يحتاج…" required
          value={returning?.note ?? ""} onChange={(e) => setReturning((x) => x && { ...x, note: e.target.value })} />
      </Modal>

      <ConfirmDialog open={kill !== null} onClose={() => setKill(null)} tone="danger" icon={<Trash />}
        title="حذف التعليق؟" text="يُحذف نهائيًّا ومعه إعجاباته." confirmLabel="حذف" onConfirm={removeComment} />
    </main>
  );
}
