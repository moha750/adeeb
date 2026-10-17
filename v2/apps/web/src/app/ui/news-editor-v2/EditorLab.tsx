"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Container, Field, IconButton, PersonPicker, SectionCard, Segmented, Select, Textarea } from "@adeeb/design-system";
import {
  Camera, Circle, ClipboardText, CloudCheck, Images, ListBullets, LockSimple, Megaphone, Newspaper, PaperPlaneTilt,
  Quotes, TextAlignLeft, Users,
} from "@phosphor-icons/react";
import { ArrowDown, ArrowUp, ArrowUUpLeft, Check, PencilSimple, Plus, Trash, UploadSimple } from "@/app/_components/glyphs";
import { CATEGORY_META, CATEGORY_OPTIONS, type Category } from "@adeeb/core/news";
import { sectionsToBlocks } from "@/lib/news/blocks";
import { ArticleBody } from "@/app/news/[slug]/_parts/ArticleBody";
import { arCount, type ArForms } from "@/lib/arabicCount";

const AR_CHAPTER: ArForms = ["فصلٌ واحد", "فصلان", "فصول", "فصلًا"];

export type Chapter = { heading: string; body: string };
export type Draft = {
  title: string;
  summary: string;
  category: Category;
  authors: string[];
  cover: string | null;
  coverBy: string | null;
  gallery: string[];
  lead: string;
  chapters: Chapter[];
};
type Role = "chief" | "writer";
type Ch = Chapter & { id: number };

const TITLE_MAX = 60;
const SUMMARY_MAX = 120;
let seq = 0;
const withId = (c: Chapter): Ch => ({ ...c, id: ++seq });

/** «٥٣ من ٦٠» بأرقامٍ لاتينيّة، ورسالةُ الزيادة إن جاوز. والإنذارُ عند ٩٠٪ لا ٨٠٪. */
const countOf = (n: number, max: number) => ({
  helper: `${n} من ${max} حرفًا`,
  error: n > max ? `يزيد ${n - max} حرفًا.` : undefined,
});

/** تقطيعُ نصٍّ ملصوقٍ كاملٍ: سطرٌ قصيرٌ بلا علامة ختامٍ يتلوه كلامٌ = عنوانُ فصل، وما قبل أوّل عنوانٍ = المدخل. */
function splitPasted(text: string): { lead: string; chapters: Chapter[] } {
  const chunks = text.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((c) => c.split("\n").map((l) => l.trim()).filter(Boolean)).filter((c) => c.length);
  const isHead = (l: string) => l.length <= 40 && !/[.!؟?:،,»"]$/.test(l) && !/^[•"«“]/.test(l);
  let lead = "";
  const chapters: Chapter[] = [];
  chunks.forEach((lines, i) => {
    const hasAfter = lines.length > 1 || i < chunks.length - 1;
    if (isHead(lines[0]) && hasAfter) chapters.push({ heading: lines[0], body: lines.slice(1).join("\n") });
    else if (chapters.length) {
      const c = chapters[chapters.length - 1];
      c.body = [c.body, lines.join("\n")].filter(Boolean).join("\n\n");
    } else lead = [lead, lines.join("\n")].filter(Boolean).join("\n\n");
  });
  return { lead, chapters };
}

/**
 * متنٌ بحقل الهويّة نفسِه، وفوقه زرّا «بند» و«اقتباس» ما دام الكاتبُ فيه — بدل السطر الشارح القديم.
 * ويطبّقان على سطر المؤشّر: «• » في أوّله، أو « » حوله، ويرفعانه إن كان قائمًا.
 */
function BodyField({ label, value, onChange, placeholder, rows = 5, onPaste }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number; onPaste?: () => void;
}) {
  // حقلُ الهويّة لا يمرّر `ref`، فيُبلَغ النصُّ من وعائه.
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
    const next = op === "bullet"
      ? (line.startsWith("• ") ? line.slice(2) : `• ${line}`)
      : (/^«.*»$/.test(line) ? line.slice(1, -1) : `«${line}»`);
    onChange(value.slice(0, start) + next + value.slice(end));
  };
  return (
    <div ref={box} className="nwx-bodyf" data-on={on || undefined}>
      <div className="nwx-tools" onMouseDown={(e) => e.preventDefault()} aria-hidden={!on}>
        <button type="button" tabIndex={on ? 0 : -1} onClick={() => lineOp("bullet")}><ListBullets size={14} aria-hidden />بند</button>
        <button type="button" tabIndex={on ? 0 : -1} onClick={() => lineOp("quote")}><Quotes size={14} aria-hidden />اقتباس</button>
      </div>
      <Textarea
        label={label} icon={<TextAlignLeft />} innerIcon={<PencilSimple />} placeholder={placeholder}
        // يطول الحقلُ مع نصّه (إلى ١٤ سطرًا) فلا يُقرأ المتنُ من ثقبٍ بخمسة أسطر.
        rows={Math.min(14, Math.max(rows, Math.ceil(value.length / 42) + value.split("\n").length))}
        value={value} onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOn(true)} onBlur={() => setOn(false)} onPaste={onPaste}
      />
    </div>
  );
}

/* ══ المعاينة: الخبرُ كما سيراه القارئ ══ */
function Preview({ d }: { d: Omit<Draft, "chapters"> & { chapters: Ch[] } }) {
  const blocks = sectionsToBlocks([{ heading: null, body: d.lead }, ...d.chapters.map((c) => ({ heading: c.heading || null, body: c.body }))]);
  return (
    <div className="nwx-prev">
      <section className="nwx-panel">
        <span className="nwx-cat">{CATEGORY_META[d.category].label}</span>
        <h2 className="nwx-p-title">{d.title || "خبرٌ بلا عنوان"}</h2>
        {d.summary ? <p className="nwx-p-dek">{d.summary}</p> : null}
        <p className="nwx-by">بريشة {d.authors.join("، ") || "—"}</p>
      </section>
      {d.cover ? (
        <figure className="nwx-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.cover} alt="" />
          {d.coverBy ? <figcaption className="nwx-cover-acts"><span className="nwx-glass"><Camera size={14} aria-hidden />{d.coverBy}</span></figcaption> : null}
        </figure>
      ) : null}
      <div className="art nwx-p-body"><ArticleBody blocks={blocks} /></div>
    </div>
  );
}

/* ══ المحرّر ══ */
function Editor({ initial, role }: { initial: Draft; role: Role }) {
  const [d, setD] = useState<Omit<Draft, "chapters"> & { chapters: Ch[] }>(() => ({ ...initial, chapters: initial.chapters.map(withId) }));
  const [view, setView] = useState<"write" | "preview" | "manage">("write");
  const [saved, setSaved] = useState<"saved" | "saving">("saved");
  const [gone, setGone] = useState<{ at: number; ch: Ch } | null>(null);
  const [offer, setOffer] = useState<{ lead: string; chapters: Chapter[] } | null>(null);
  const pasted = useRef(false);
  const first = useRef(true);
  const may = (part: "head" | "media" | "content") => role === "chief" || part === "content";
  const people = d.authors.map((name) => ({ name, hint: "عضو أدِيب" }));

  // الحفظُ تلقائيّ: ثانيةٌ بعد آخر تعديل، والحالُ صغيرةٌ في الرأس.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const t = setTimeout(() => setSaved("saved"), 1000);
    return () => clearTimeout(t);
  }, [d]);
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => setGone(null), 8000);
    return () => clearTimeout(t);
  }, [gone]);

  const set = (p: Partial<typeof d>) => { setSaved("saving"); setD((s) => ({ ...s, ...p })); };
  const patch = (i: number, p: Partial<Chapter>) => set({ chapters: d.chapters.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  const move = (i: number, by: number) => {
    const to = i + by;
    if (to < 0 || to >= d.chapters.length) return;
    const next = [...d.chapters];
    [next[i], next[to]] = [next[to], next[i]];
    set({ chapters: next });
  };
  const drop = (i: number) => { setGone({ at: i, ch: d.chapters[i] }); set({ chapters: d.chapters.filter((_, j) => j !== i) }); };
  const undo = () => {
    if (!gone) return;
    const next = [...d.chapters];
    next.splice(gone.at, 0, gone.ch);
    set({ chapters: next });
    setGone(null);
  };
  const onLead = (v: string) => {
    set({ lead: v });
    if (!pasted.current) return;
    pasted.current = false;
    const parts = splitPasted(v);
    if (parts.chapters.length) setOffer(parts);
  };
  const applySplit = () => {
    if (!offer) return;
    const fresh = offer.chapters.map(withId);
    const empty = d.chapters.every((c) => !c.body.trim());
    set({ lead: offer.lead, chapters: empty ? fresh : [...d.chapters, ...fresh] });
    setOffer(null);
  };

  const full = d.chapters.filter((c) => c.heading.trim() && c.body.trim()).length;
  const ready = [
    { label: "المدخل", ok: !!d.lead.trim(), mine: true },
    { label: full >= 2 ? arCount(full, AR_CHAPTER) : "فصلان", ok: full >= 2, mine: true },
    { label: "الملخّص", ok: !!d.summary.trim(), mine: false },
    { label: "الغلاف", ok: !!d.cover, mine: false },
    { label: "الكاتب", ok: d.authors.length > 0, mine: false },
  ].filter((r) => role === "chief" || r.mine);
  const gaps = ready.filter((r) => !r.ok).length;
  const lock = role === "writer" ? <LockSimple /> : <PencilSimple />;

  return (
    <div className="nwx-ed">
      <div className="nwx-top">
        <div className="nwx-top-id">
          <h1 className="nwx-top-t">{d.title || "خبرٌ بلا عنوان"}</h1>
          <Badge tone={role === "chief" ? "warning" : "info"} dot>{role === "chief" ? "جاهز للمراجعة" : "قيد الكتابة"}</Badge>
        </div>
        <span className="nwx-save" data-state={saved}><CloudCheck size={16} aria-hidden />{saved === "saving" ? "يُحفظ" : "حُفظ"}</span>
      </div>

      {/* «المعاينة» لوحٌ ثالثٌ بجانب «الكتابة» و«الإدارة»: الكتابةُ نموذجٌ لا لبسَ فيه، والمعاينةُ الخبرُ كما يُنشَر. */}
      <Segmented className="mb-4" wide aria-label="ألواح الخبر"
        items={[{ value: "write", label: "الكتابة" }, { value: "preview", label: "المعاينة" }, { value: "manage", label: "الإدارة" }]}
        value={view} onValueChange={(v) => setView(v as typeof view)} />

      {view === "preview" ? <Preview d={d} /> : view === "manage" ? (
        <p className="nwx-later">لوحُ الإدارة في الخطوة التالية من المراجعة.</p>
      ) : (
        <div className="nwx-form">
          {role === "writer" ? (
            <section className="nwx-brief">
              <div className="nwx-brief-ret">
                <ArrowUUpLeft size={16} aria-hidden />
                <div><b>أعاده إليك محمد المطر</b><p>الفصل الثاني يحتاج أسماء المشاركين في الورشة.</p></div>
              </div>
              <div className="nwx-brief-task">
                <b>تكليفك</b>
                <span className="nwx-brief-fields"><span>المتن</span></span>
                <p>اكتب التقرير كاملًا قبل الخميس.</p>
              </div>
            </section>
          ) : null}

          <SectionCard title="الترويسة" icon={<Newspaper />}>
            <div className="form-grid">
              <Field className="form-full" label="العنوان" icon={<Newspaper />} innerIcon={lock} placeholder="مشاركة أدِيب في…"
                value={d.title} disabled={!may("head")} onChange={(e) => set({ title: e.target.value })} {...countOf(d.title.length, TITLE_MAX)} />
              <Textarea className="form-full" label="الملخّص" icon={<TextAlignLeft />} innerIcon={lock} rows={2} placeholder="سطران يُغريان بالقراءة"
                value={d.summary} disabled={!may("head")} onChange={(e) => set({ summary: e.target.value })} {...countOf(d.summary.length, SUMMARY_MAX)} />
              <Select label="الفئة" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={d.category} disabled={!may("head")}
                onValueChange={(v) => set({ category: v as Category })} />
              <PersonPicker label="الكتّاب" icon={<Users />} people={people} value={d.authors} disabled={!may("head")}
                onChange={(v) => set({ authors: v })} placeholder="ابحث في أهل أدِيب أو اكتب اسمًا" />
            </div>
          </SectionCard>

          <SectionCard title="الغلاف" icon={<Images />}>
            {d.cover ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="nwx-f-cover" src={d.cover} alt="غلاف الخبر" />
                {d.coverBy ? <p className="nwx-f-by"><Camera size={14} aria-hidden />{d.coverBy}</p> : null}
              </>
            ) : null}
            {may("media") ? (
              <div className="btn-row mt-3">
                <Button variant="ghost" size="sm"><UploadSimple size={16} />{d.cover ? "استبدال" : "رفع الغلاف"}</Button>
                {d.cover ? <Button variant="ghost-danger" size="sm"><Trash size={16} />حذف</Button> : null}
              </div>
            ) : null}
          </SectionCard>

          <SectionCard title="المدخل" icon={<TextAlignLeft />}>
            <BodyField label="الفقرة التي يبدأ بها الخبر" value={d.lead} onChange={onLead} placeholder="نظّم نادي أدِيب…" rows={3}
              onPaste={() => { pasted.current = true; }} />
            {offer ? (
              <div className="nwx-offer">
                <span>فيه {arCount(offer.chapters.length, AR_CHAPTER)}</span>
                <Button variant="primary" size="sm" onClick={applySplit}>قطّعه إلى فصول</Button>
                <Button variant="ghost" size="sm" onClick={() => setOffer(null)}>أبقِه كما هو</Button>
              </div>
            ) : null}
          </SectionCard>

          {d.chapters.map((c, i) => (
            <div key={c.id} className="nwx-chwrap">
              {gone && gone.at === i ? <Gone g={gone} onUndo={undo} /> : null}
              <SectionCard
                title={<span className="nwx-chtitle"><b>{String(i + 1).padStart(2, "0")}</b>{c.heading || "فصلٌ بلا عنوان"}</span>}
                icon={<TextAlignLeft />}
                actions={
                  <span className="nwx-chacts">
                    <IconButton aria-label="أعلى" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></IconButton>
                    <IconButton aria-label="أسفل" disabled={i === d.chapters.length - 1} onClick={() => move(i, 1)}><ArrowDown /></IconButton>
                    <IconButton aria-label="حذف الفصل" tone="danger" onClick={() => drop(i)}><Trash /></IconButton>
                  </span>
                }
              >
                <div className="nwx-chform">
                  <Field label="عنوان الفصل" icon={<Newspaper />} innerIcon={<PencilSimple />} placeholder="المحاور"
                    value={c.heading} onChange={(e) => patch(i, { heading: e.target.value })} />
                  <BodyField label="متن الفصل" value={c.body} onChange={(v) => patch(i, { body: v })} placeholder="تناولت الورشة…" />
                </div>
              </SectionCard>
            </div>
          ))}
          {gone && gone.at >= d.chapters.length ? <Gone g={gone} onUndo={undo} /> : null}

          <button type="button" className="nwx-add" onClick={() => set({ chapters: [...d.chapters, withId({ heading: "", body: "" })] })}>
            <Plus size={18} aria-hidden />أضف فصلًا
          </button>

          <SectionCard title={d.gallery.length ? `معرض الصور (${d.gallery.length})` : "معرض الصور"} icon={<Images />}>
            <div className="nwx-gal-grid">
              {d.gallery.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" />
              ))}
            </div>
            {may("media") ? <button type="button" className="nwx-add nwx-gal-add"><Plus size={18} aria-hidden />إضافة صور</button> : null}
          </SectionCard>

          <section className="nwx-end">
            <ul className="nwx-ready" aria-label="جاهزيّة النشر">
              {ready.map((r) => (
                <li key={r.label} data-ok={r.ok || undefined}>
                  {r.ok ? <Check size={13} aria-hidden /> : <Circle size={13} aria-hidden />}{r.label}
                </li>
              ))}
            </ul>
            <div className="btn-row">
              {role === "chief" ? (
                <>
                  <Button variant="primary" size="md" disabled={gaps > 0}><Megaphone size={18} />نشر</Button>
                  <Button variant="ghost" size="md"><ArrowUUpLeft size={18} />إعادة بملاحظة</Button>
                </>
              ) : (
                <Button variant="primary" size="md"><PaperPlaneTilt size={18} />رفع إلى المراجعة</Button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Gone({ g, onUndo }: { g: { ch: Chapter }; onUndo: () => void }) {
  return (
    <div className="nwx-gone" role="status">
      <span>حُذف فصل «{g.ch.heading || "بلا عنوان"}»</span>
      <Button variant="ghost" size="sm" onClick={onUndo}><ArrowUUpLeft size={16} />تراجع</Button>
    </div>
  );
}

const ROLES = [
  { value: "writer", label: "المكلَّف" },
  { value: "chief", label: "رئيس التحرير" },
];
const WIDTHS = [
  { value: "375", label: "375" },
  { value: "1100", label: "1100" },
];

export function EditorLab({ initial }: { initial: Draft }) {
  const [role, setRole] = useState<Role>("writer");
  const [w, setW] = useState("375");
  return (
    <main className="py-12">
      <Container>
        <h1 className="font-display text-3xl font-black text-content">المحرّر: الكتابة</h1>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Segmented items={ROLES} value={role} onValueChange={(v) => setRole(v as Role)} aria-label="بعينَي من" />
          <Segmented items={WIDTHS} value={w} onValueChange={setW} aria-label="العرض" />
        </div>
      </Container>
      <div className="nwx-frame mt-8" style={{ maxWidth: Number(w) }}>
        <Editor key={role} initial={initial} role={role} />
      </div>
    </main>
  );
}
