"use client";

/**
 * **محرّرُ النظام على «المنضدة»** (قالبُ «مساحة العمل»، ٢٠٢٦-١١-١٦ — لم يُعتمد بعد، مختبرُه `/dashboard/ad/reg-editor`).
 * كان `RegEditor`: رأسٌ قديم، وكرتُ حال المسوّدة، والوثيقةُ كما تُقرأ وتحت كلّ مادّةٍ أزرارُها، وكلُّ تعديلٍ نافذةٌ فيها الحقلان و«كما ستظهر».
 * فصار: حالُ المسوّدة وموافقتا الرئيسين وفعلُها التالي تنبيهًا فوق التحرير؛ وكلُّ بابٍ قسمٌ، وكلُّ مادّةٍ قطعةٌ تُفتح فتُكتب في موضعها؛
 * **والمنضدةُ صفحةُ النظام العامّةُ نفسُها** (`/frame/regulation`) بالمسوّدة وما يُكتب الآن، تنزل إلى المادّة المفتوحة. والمعاينةُ في المبدّل
 * على كلّ شاشة كمحرّر الكتيّب: الوثيقةُ طويلةٌ تحتاج الشاشةَ كلَّها.
 *
 * **السلوكُ سلوكُ القديم حرفًا** (`actions.ts` كما هو): كلُّ حفظٍ يُكتب في المسوّدة في لحظته ببصمتها (`rev`)، وقبل الإطلاق يُصحَّح النصُّ
 * في موضعه بلا ترقيمٍ ولا نشر، وبعده إصدارٌ جديد، وإضافةٌ وحذفٌ وأبواب، وموافقةُ الرئيسين معًا (الدستور م٦٨)، ثمّ النشرُ بتاريخ نفاذ.
 */
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, Modal, ModalSectionHeading, Textarea } from "@adeeb/design-system";
import { BookOpenText, CalendarBlank, ClockCounterClockwise, Notepad, SealCheck, TextAa, TreeStructure } from "@phosphor-icons/react";
import { ArrowSquareOut, Check, Eye, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { RegBlocks, RegTextProvider, type RegTextContext } from "@/app/regulations/_parts/RegText";
import type { RegDocProps } from "@/app/regulations/_parts/RegRead";
import { fmtDateOnly } from "@/lib/dates";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { blocksToMarkup, markupToBlocks } from "@/lib/regulations/edit";
import { AR_ARTICLE, chapterParts, excerptOf, latin } from "@/lib/regulations/text";
import type { PresidentSeat } from "@/lib/regulations/authz";
import type { RegArticle, RegBlock, RegChapter } from "@/lib/regulations/types";
import * as act from "@/app/dashboard/regulations/actions";
import type { RoomDoc, RoomVersion } from "@/app/dashboard/regulations/data";
import { AdLog, type AdLogEvent } from "../log";
import { AdButton, AdConfirm, AdNote } from "../primitives";
import { FormSection } from "../form";
import { StageFrame, WorkBlock, WorkRoom, useLeaveGuard } from "../workspace";
import { RichField } from "../rich";

const SEAT_NAME: Record<PresidentSeat, string> = { club_president: "رئيس أدِيب", executive_council_president: "الرئيس التنفيذي" };
const SEATS = Object.keys(SEAT_NAME) as PresidentSeat[];
const AR_VERSION: ArForms = ["إصدارٌ واحد", "إصداران", "إصدارات", "إصدارًا"];
const AR_EDITED: ArForms = ["مادّةٌ واحدة", "مادّتان", "موادّ", "مادّةً"];
const AR_TITLE: ArForms = ["عنوانُ بابٍ واحد", "عنوانا بابين", "عناوينُ أبواب", "عنوانَ باب"];

/** ما يحتاجه العارضُ العامّ غيرَ نصّ الوثيقة — يحسبه الخادم (`docContext`) */
export type RegStageCtx = Omit<RegDocProps, "doc" | "base">;
/** ما يصل المنضدةَ: الوثيقةُ بالمسوّدة وما يُكتب الآن، والمادّةُ المفتوحة لتنزل إليها */
export type RegStageDraft = { doc: RegDocProps["doc"]; ctx: RegStageCtx; focus: number | null };

/** ما يُكتب في القطعة المفتوحة: مادّةٌ، أو عنوانُ باب، أو مادّةٌ جديدة في موضعها، أو بابٌ جديد */
type Open =
  | { kind: "article"; no: number; title: string; text: string }
  | { kind: "add"; chapter: number; index: number; at: number; title: string; text: string }
  | { kind: "chapter"; chapter: number; title: string }
  | { kind: "newChapter"; title: string; artTitle: string; text: string };

const parse = (text: string) => (text.trim() ? markupToBlocks(text) : null);

/** الوثيقةُ كما ستكون بما يُكتب الآن: المادّةُ أو العنوانُ المعدَّل، أو الجديدُ في موضعه */
function liveBody(body: RegChapter[], open: Open | null): RegChapter[] {
  if (open?.kind === "article") {
    const p = parse(open.text);
    const blocks: RegBlock[] | null = p && "blocks" in p ? p.blocks : null;
    return body.map((c) => ({ ...c, articles: c.articles.map((a) => (a.no === open.no ? { ...a, title: open.title.trim() || a.title, blocks: blocks ?? a.blocks } : a)) }));
  }
  if (open?.kind === "chapter") return body.map((c, i) => (i === open.chapter ? { ...c, title: open.title.trim() || c.title } : c));
  // **والجديدةُ تُرى في موضعها وهي تُكتب** (المراجعة ٢٠٢٦-١١-١٦): كانت المنضدةُ لا تُري إلا المادّةَ المعدّلة، فمن أضاف مادّةً لم يرَها حتى يحفظ.
  // تدخل برقمها وتتأخّر أرقامُ ما بعدها، كما سيكون؛ وما لم يُكتب نصُّه بعدُ لا يُرى
  if (open?.kind === "add" || open?.kind === "newChapter") {
    const p = parse(open.text);
    if (!p || !("blocks" in p)) return body;
    if (open.kind === "newChapter") {
      const total = body.reduce((n, c) => n + c.articles.length, 0);
      return [...body, { title: open.title.trim() || "بابٌ جديد", articles: [{ no: total + 1, title: open.artTitle.trim() || "مادّةٌ جديدة", blocks: p.blocks }] }];
    }
    const { at, chapter, index } = open;
    const fresh: RegArticle = { no: at, title: open.title.trim() || "مادّةٌ جديدة", blocks: p.blocks };
    return body.map((c, i) => {
      const arts = c.articles.map((a) => (a.no >= at ? { ...a, no: a.no + 1 } : a));
      return { ...c, articles: i === chapter ? [...arts.slice(0, index), fresh, ...arts.slice(index)] : arts };
    });
  }
  return body;
}

export function RegEditorRoom({ doc, seat, today, summary, note, ctx: stageCtx, serverNow, dry }: {
  doc: RoomDoc;
  seat: PresidentSeat | null;
  today: string;
  /** سطرُ تعريف الوثيقة وملحوظتُها كما في صفحتها العامّة — للمنضدة */
  summary: string;
  note: string;
  ctx: RegStageCtx;
  serverNow: number;
  /** مختبر: الأفعالُ لا تُنفَّذ */
  dry?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<Open | null>(null);
  const [del, setDel] = useState<number | null>(null);
  const [discard, setDiscard] = useState(false);
  const [publish, setPublish] = useState(false);
  const [pane, setPane] = useState<"edit" | "stage">("edit");
  /** قطعةٌ تُفتح والمفتوحةُ فيها ما لم يُحفظ: تُسأل قبل أن تُترك (المراجع ٢٠٢٦-١١-١٦: كان فتحُ مادّةٍ أخرى يمحو ما كُتب بلا كلمة) */
  const [ask, setAsk] = useState<{ next: Open | null } | null>(null);

  const draft = doc.draft;
  const editing = !!draft;
  // قبل نشر الإصدار الأوّل يُصحَّح النصُّ في موضعه، ولا يتغيّر الترقيمُ ولا يُنشر من هنا
  const structural = editing && doc.published;
  const mine = draft?.approvals.some((a) => a.seat === seat) ?? false;
  const both = (draft?.approvals.length ?? 0) >= 2;
  const changed = !!draft && (Object.keys(draft.changes).length > 0 || draft.removed.length > 0 || draft.chapters.length > 0);
  const current = doc.versions.find((v) => v.state === "current") ?? null;
  const rev = draft?.rev ?? "";

  const textCtx = useMemo<RegTextContext>(
    () => ({ here: doc.slug, base: "/regulations", previews: {}, docNames: doc.docNames, counts: doc.counts, terms: [] }),
    [doc.slug, doc.docNames, doc.counts],
  );

  function run(fn: () => Promise<act.RoomResult>, done?: string, after?: () => void) {
    if (dry) { toast.info("مختبر: لا يُحفظ شيءٌ من هنا."); return; }
    start(async () => {
      const r = await fn();
      if (!r.ok) { toast.error(r.message); return; }
      if (r.message ?? done) toast.success((r.message ?? done)!);
      after?.();
      router.refresh();
    });
  }
  const close = () => setOpen(null);

  // **ما لم يُحفظ في القطعة المفتوحة يُحرس** عند المغادرة (كان يضيع بإغلاق النافذة القديمة بلا كلمة)
  const baseOf = (o: Open | null) => {
    if (!o) return "";
    if (o.kind === "article") { const a = doc.body.flatMap((c) => c.articles).find((x) => x.no === o.no); return a ? latin(a.title) + "\n" + blocksToMarkup(a.blocks) : ""; }
    if (o.kind === "chapter") return latin(doc.body[o.chapter]?.title ?? "");
    return "\n";
  };
  const typed = (o: Open | null) => !o ? "" : o.kind === "article" || o.kind === "add" ? o.title + "\n" + o.text : o.kind === "chapter" ? o.title : o.title + o.artTitle + "\n" + o.text;
  const dirty = !!open && typed(open).trim() !== baseOf(open).trim();
  const leave = useLeaveGuard(dirty);
  /** الانتقالُ إلى قطعةٍ أخرى (أو إغلاقُ المفتوحة) يمرّ بالسؤال حين يكون فيها ما لم يُحفظ — والكتابةُ نفسُها `setOpen` */
  const go = (next: Open | null) => { if (dirty) setAsk({ next }); else setOpen(next); };
  /** رقمُ المادّة كما سيصير: ما بعد المادّة الجديدة يتأخّر رقمًا ما دامت مفتوحة (كانت تُرى مادّتان برقمٍ واحد) */
  const shownNo = (no: number) => (open?.kind === "add" && no >= open.at ? no + 1 : no);

  // ── الحال: سطرُ ما تغيّر، ومن وافق ──
  const changeLine = (() => {
    if (!draft) return "";
    const v = Object.values(draft.changes);
    const ed = v.filter((x) => x === "edited").length, nw = v.filter((x) => x === "new").length;
    const parts = [
      ed ? `عُدّلت ${arCount(ed, AR_EDITED)}` : null,
      nw ? `وأُضيفت ${arCount(nw, AR_EDITED)}` : null,
      draft.removed.length ? `وحُذفت ${draft.removed.map((n) => `المادّة ${n}`).join("، ")}` : null,
      draft.chapters.length ? `وعُدّل ${arCount(draft.chapters.length, AR_TITLE)}` : null,
    ].filter(Boolean) as string[];
    if (!parts.length) return "لم يتغيّر فيها شيءٌ عن المنشور بعد.";
    return parts.join("، ").replace(/^و/, "") + ".";
  })();
  const approvalsLine = draft ? SEATS.map((s) => {
    const a = draft.approvals.find((x) => x.seat === s);
    return a ? `وافق ${a.label}${a.name ? ` (${a.name})` : ""}` : `ينتظر ${SEAT_NAME[s]}`;
  }).join("، ") + "." : "";

  // «اعرضها» لا «اعرضها في الموقع»: الفعلُ يفتح تبويبًا جديدًا برمزه، والفعلان يتّسعان لصفٍّ واحدٍ في الجوّال (درسُ محرّر الكتيّب)
  const siteLink = <AdButton variant="line" size="sm" icon={<ArrowSquareOut />} href={`/regulations/${doc.slug}`} external>اعرضها</AdButton>;
  let lead: ReactNode;
  if (!draft) {
    lead = (
      <AdNote tone="ok" title={current ? `الإصدار ${current.no} نافذٌ منذ ${fmtDateOnly(current.effectiveFrom)}` : "منشور"}
        action={<>
          <AdButton variant="fill" size="sm" icon={<PencilSimple />} busy={pending} onClick={() => run(() => act.startDraft(doc.slug))}>إصدارٌ جديد</AdButton>
          {siteLink}
        </>}>
        التعديلُ يبدأ مسوّدةً من المنشور، ولا يراه أحدٌ حتى يوافق الرئيسان ويُنشر.
      </AdNote>
    );
  } else if (!structural) {
    lead = (
      <AdNote tone="info" title="قبل الإطلاق: يُصحَّح النصّ في موضعه" action={siteLink}>
        لا تتغيّر الأرقامُ ولا يُنشر من هنا. والإصدارُ الأوّل للأنظمة كلِّها يُنشر معًا يوم الإطلاق.
      </AdNote>
    );
  } else {
    lead = (
      <AdNote tone="warn" title={`مسوّدة الإصدار ${draft.no}`}
        action={<>
          {changed && both ? <AdButton variant="fill" size="sm" icon={<SealCheck />} onClick={() => setPublish(true)}>انشر</AdButton> : null}
          {changed && seat && !mine ? <AdButton variant="fill" size="sm" icon={<Check />} busy={pending} onClick={() => run(() => act.approveDraft(doc.slug, rev), "سُجّلت موافقتك.")}>أوافق على المسوّدة</AdButton> : null}
          {mine ? <AdButton variant="line" size="sm" icon={<ClockCounterClockwise />} busy={pending} onClick={() => run(() => act.withdrawApproval(doc.slug), "سُحبت موافقتك.")}>اسحب موافقتي</AdButton> : null}
          <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => setDiscard(true)}>احذف المسوّدة</AdButton>
        </>}>
        {/* كلُّ تعديلٍ يُسقط الموافقتين (الدستور م٦٨): يُقال هنا لا في نافذة */}
        {changeLine} {approvalsLine}{changed && !both ? " وكلُّ تعديلٍ بعد الموافقة يُسقطها." : ""}
      </AdNote>
    );
  }

  // ── القطعة: مادّةٌ تُقرأ أو تُكتب ──
  const articleBlock = (a: RegArticle, ci: number, ai: number) => {
    const ch = draft?.changes[a.no];
    const isOpen = open?.kind === "article" && open.no === a.no;
    const o = isOpen ? (open as Extract<Open, { kind: "article" }>) : null;
    const p = o ? parse(o.text) : null;
    const bad = p && "error" in p ? p.error : undefined;
    const same = o ? o.title.trim() === latin(a.title).trim() && o.text.trim() === blocksToMarkup(a.blocks).trim() : true;
    const sub = ch === "new" ? "جديدةٌ في هذه المسوّدة" : ch === "edited" ? "معدّلةٌ في هذه المسوّدة" : latin(excerptOf(a, 90));
    return (
      <div key={a.no} className="ad-wblk-slot">
        <WorkBlock n={shownNo(a.no)} title={latin(a.title)} sub={sub} open={isOpen}
          verb={editing ? undefined : { label: "نصّها", icon: <Eye /> }}
          onToggle={() => go(isOpen ? null : { kind: "article", no: a.no, title: latin(a.title), text: blocksToMarkup(a.blocks) })}
          acts={editing ? (
            <>
              {/* فعلا البناء معًا في أوّل الذيل، والحذفُ وحده في آخره — لا ثلاثةٌ يقع أوسطُها في المنتصف */}
              {(() => {
                const save = (
                  <AdButton variant="fill" size="sm" icon={<PencilSimple />} held={same || !!bad || !p || !o?.title.trim()} busy={pending}
                    onClick={() => o && run(() => act.saveArticle(doc.slug, rev, a.no, o.title, o.text), "حُفظت المادّة.", close)}>احفظ المادّة</AdButton>
                );
                // قبل الإطلاق فعلٌ واحد يملأ الذيل، وبعده فعلا البناء معًا ثمّ الحذف
                return structural ? (
                  <span className="ad-wblk-foot-g">
                    {save}
                    <AdButton variant="line" size="sm" icon={<Plus />} onClick={() => go({ kind: "add", chapter: ci, index: ai + 1, at: a.no + 1, title: "", text: "" })}>مادّةٌ بعدها</AdButton>
                  </span>
                ) : save;
              })()}
              {structural ? <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => setDel(a.no)}>حذف</AdButton> : null}
            </>
          ) : undefined}>
          {editing && o ? (
            <div className="form-grid">
              <Field className="form-full" label="عنوانُ المادّة" icon={<TextAa />} innerIcon={<PencilSimple />} placeholder="عنوانٌ يصفها في كلمةٍ أو كلمتين"
                value={o.title} onChange={(e) => setOpen({ ...o, title: e.target.value })} required />
              <RichField label="نصُّها" icon={<Notepad />} innerIcon={<Notepad />} placeholder="نصُّ المادّة." value={o.text} onChange={(v) => setOpen({ ...o, text: v })} error={bad} />
            </div>
          ) : (
            <div className="ad-rgx-read"><RegBlocks blocks={a.blocks} lead={<span className="reg-art-t">{latin(a.title)}:</span>} /></div>
          )}
        </WorkBlock>
      </div>
    );
  };

  // ── مادّةٌ جديدةٌ في موضعها (بعد مادّة، أو أوّلَ الباب، أو أوّلَ بابٍ جديد) ──
  const newBlock = (o: Extract<Open, { kind: "add" }>) => {
    const p = parse(o.text);
    const bad = p && "error" in p ? p.error : undefined;
    return (
      <div key="new" className="ad-wblk-slot">
        <WorkBlock n={o.at} title={o.title.trim() || "مادّةٌ جديدة"} untitled={!o.title.trim()} sub={`تصير المادّة ${o.at}، وتتأخّر أرقامُ ما بعدها`} open onToggle={() => go(null)}
          acts={<span className="ad-wblk-foot-g">
            <AdButton variant="fill" size="sm" icon={<Plus />} held={!o.title.trim() || !p || !!bad} busy={pending}
              onClick={() => run(() => act.addArticle(doc.slug, rev, o.chapter, o.index, o.title, o.text), "أُضيفت المادّة.", close)}>أضف المادّة</AdButton>
            <AdButton plain variant="line" size="sm" onClick={close}>إلغاء</AdButton>
          </span>}>
          <div className="form-grid">
            <Field className="form-full" label="عنوانُ المادّة" icon={<TextAa />} innerIcon={<PencilSimple />} placeholder="عنوانٌ يصفها في كلمةٍ أو كلمتين"
              value={o.title} onChange={(e) => setOpen({ ...o, title: e.target.value })} required />
            <RichField label="نصُّها" icon={<Notepad />} innerIcon={<Notepad />} placeholder="نصُّ المادّة." value={o.text} onChange={(v) => setOpen({ ...o, text: v })} error={bad} />
          </div>
        </WorkBlock>
      </div>
    );
  };

  const chapters = doc.body.map((c, ci) => {
    const [kicker, name] = chapterParts(c.title);
    const titleOpen = open?.kind === "chapter" && open.chapter === ci ? open : null;
    const addHere = open?.kind === "add" && open.chapter === ci ? open : null;
    const items: ReactNode[] = [];
    if (addHere && addHere.index === 0) items.push(newBlock(addHere));
    c.articles.forEach((a, ai) => {
      items.push(articleBlock(a, ci, ai));
      if (addHere && addHere.index === ai + 1) items.push(newBlock(addHere));
    });
    const sub = [kicker, arCount(c.articles.length, AR_ARTICLE), draft?.chapters.includes(ci) ? "عنوانُه معدّل" : null].filter(Boolean).join("، ");
    return (
      <FormSection key={ci} id={`ch${ci}`} icon={<BookOpenText />} title={name ?? doc.title} sub={sub}
        act={editing ? (
          <>
            <AdButton variant="line" size="sm" icon={<PencilSimple />} onClick={() => go(titleOpen ? null : { kind: "chapter", chapter: ci, title: latin(c.title ?? "") })}>عنوانُ الباب</AdButton>
            {structural ? <AdButton variant="line" size="sm" icon={<Plus />} onClick={() => go({ kind: "add", chapter: ci, index: 0, at: c.articles[0]?.no ?? 1, title: "", text: "" })}>مادّةٌ في أوّله</AdButton> : null}
          </>
        ) : undefined}>
        {titleOpen ? (
          // **عنوانُ الباب قطعةٌ مفتوحةٌ في صدر قسمه** لا نافذة (محمد ٢٠٢٦-١١-١٦ سأل: «يبقى أم نافذة؟»): الغرفةُ كلُّها تُكتب في موضعها، والعنوانُ
          // يُرى فوق موادّه وهو يُكتب؛ فيلبس شكلَ المادّة المفتوحة نفسَه — أرضُها وحدُّها وذيلُها بشعرته — لا حقلًا عاريًا بين الرأس والموادّ
          <div className="ad-rgx-title">
            <Field label="عنوانُ الباب" icon={<TextAa />} innerIcon={<BookOpenText />} placeholder="الباب الأول: التعريف" value={titleOpen.title}
              onChange={(e) => setOpen({ ...titleOpen, title: e.target.value })} required />
            <span className="ad-rgx-title-acts ad-rgx-title-foot">
              <AdButton variant="fill" size="sm" icon={<PencilSimple />} held={!titleOpen.title.trim() || titleOpen.title.trim() === latin(c.title ?? "").trim()} busy={pending}
                onClick={() => run(() => act.saveChapter(doc.slug, rev, ci, titleOpen.title), "حُفظ عنوان الباب.", close)}>احفظ العنوان</AdButton>
              <AdButton plain variant="line" size="sm" onClick={close}>إلغاء</AdButton>
            </span>
          </div>
        ) : null}
        <div className="ad-wblks">{items}</div>
      </FormSection>
    );
  });

  // ── بابٌ جديد آخرَ الوثيقة ──
  const nc = open?.kind === "newChapter" ? open : null;
  const ncParsed = nc ? parse(nc.text) : null;
  const ncBad = ncParsed && "error" in ncParsed ? ncParsed.error : undefined;
  const total = doc.body.reduce((s, c) => s + c.articles.length, 0);
  const newChapter = structural ? (nc ? (
    <FormSection id="new-chapter" icon={<Plus />} title="بابٌ جديد" sub={`آخرَ الوثيقة، وأوّلُ موادّه المادّة ${total + 1}`}>
      <div className="form-grid">
        <Field className="form-full" label="عنوانُ الباب" icon={<TextAa />} innerIcon={<BookOpenText />} placeholder="الباب الثاني عشر: أحكام ختامية"
          value={nc.title} onChange={(e) => setOpen({ ...nc, title: e.target.value })} required />
        <Field className="form-full" label="عنوانُ مادّته الأولى" icon={<TextAa />} innerIcon={<PencilSimple />} placeholder="عنوانٌ يصفها في كلمةٍ أو كلمتين"
          value={nc.artTitle} onChange={(e) => setOpen({ ...nc, artTitle: e.target.value })} required />
        <RichField label="نصُّ المادّة الأولى" icon={<Notepad />} innerIcon={<Notepad />} placeholder="نصُّ المادّة." value={nc.text} onChange={(v) => setOpen({ ...nc, text: v })} error={ncBad} />
      </div>
      <span className="ad-rgx-title-acts ad-rgx-foot">
        <AdButton variant="fill" icon={<Plus />} held={!nc.title.trim() || !nc.artTitle.trim() || !ncParsed || !!ncBad} busy={pending}
          onClick={() => run(() => act.addChapter(doc.slug, rev, nc.title, nc.artTitle, nc.text), "أُضيف الباب.", close)}>أضف الباب</AdButton>
        <AdButton plain variant="line" onClick={close}>إلغاء</AdButton>
      </span>
    </FormSection>
  ) : (
    <span className="ad-wblks-add"><AdButton variant="fill" icon={<Plus />} onClick={() => go({ kind: "newChapter", title: "", artTitle: "", text: "" })}>بابٌ جديد</AdButton></span>
  )) : null;

  // ── سجلُّ الإصدارات ──
  const versionEvent = (v: RoomVersion): AdLogEvent => ({
    icon: v.state === "scheduled" ? <CalendarBlank /> : <SealCheck />,
    tone: v.state === "current" ? "ok" : v.state === "scheduled" ? "info" : undefined,
    title: `الإصدار ${v.no}${v.state === "current" ? "، النافذ" : v.state === "scheduled" ? "، مجدول" : ""}`,
    change: v.changeNote ? latin(v.changeNote) : undefined,
    meta: [
      { icon: <CalendarBlank />, text: v.state === "scheduled" ? `يسري في ${fmtDateOnly(v.effectiveFrom)}` : `نافذٌ منذ ${fmtDateOnly(v.effectiveFrom)}` },
      ...(v.approvalNote ? [{ icon: <SealCheck />, text: latin(v.approvalNote) }] : []),
    ],
  });
  const versions = doc.versions.length ? (
    <FormSection id="versions" icon={<ClockCounterClockwise />} title="سجلّ الإصدارات" >
      <AdLog<RoomVersion> bare items={doc.versions} at={(v) => v.publishedAt ?? `${v.effectiveFrom}T12:00:00Z`} idOf={(v) => String(v.no)}
        event={versionEvent} noun={AR_VERSION} now={serverNow} />
    </FormSection>
  ) : null;

  // ── المنضدة: الوثيقةُ بما يُكتب الآن ──
  const live = liveBody(doc.body, open);
  const focus = open?.kind === "article" ? open.no : open?.kind === "add" ? open.at
    : open?.kind === "newChapter" ? doc.body.reduce((n, c) => n + c.articles.length, 0) + 1 : null;
  const stageDraft: RegStageDraft = { doc: { slug: doc.slug, title: doc.title, summary, note, chapters: live }, ctx: stageCtx, focus: pane === "stage" ? focus : null };
  const stage = <StageFrame src="/frame/regulation" kind="regulation" payload={stageDraft} title={`${doc.title} كما تُقرأ في الموقع`} />;

  return (
    <RegTextProvider value={textCtx}>
      <WorkRoom look="b" path="/dashboard/regulations" title={doc.title} switched view={pane} onView={setPane} stage={stage} stageTitle="كما تُقرأ في الموقع" lead={lead}>
        {chapters}
        {newChapter}
        {versions}
      </WorkRoom>
      <AdConfirm open={del !== null} onClose={() => setDel(null)} tone="danger" icon={<Trash />} title={del !== null ? `حذف المادّة ${del}؟` : ""}
        text="تتقدّم أرقامُ ما بعدها، وتتبعها الإحالاتُ إليها." confirmLabel="احذفها" loading={pending}
        onConfirm={() => del !== null && run(() => act.removeArticle(doc.slug, rev, del), "حُذفت المادّة.", () => { setDel(null); close(); })} />
      <AdConfirm open={discard} onClose={() => setDiscard(false)} tone="danger" icon={<Trash />} title="حذف المسوّدة؟"
        text="يذهب ما عُدّل فيها، ويبقى الإصدارُ المنشور كما هو." confirmLabel="احذف المسوّدة" loading={pending}
        onConfirm={() => run(() => act.discardDraft(doc.slug, rev), "حُذفت المسوّدة.", () => setDiscard(false))} />
      {publish && draft ? (
        <PublishDialog slug={doc.slug} no={draft.no} today={today} busy={pending} dry={dry} onClose={() => setPublish(false)}
          onPublish={(d, n, a) => run(() => act.publishDraft(doc.slug, rev, d, n, a), undefined, () => setPublish(false))} />
      ) : null}
      <AdConfirm open={ask !== null} onClose={() => setAsk(null)} tone="warning" icon={<Notepad />} title="تترك ما كتبتَه؟"
        text="ما كتبتَه هنا ولم يُحفظ سيضيع." confirmLabel="اتركه" cancelLabel="ابقَ فيه"
        onConfirm={() => { const n = ask?.next ?? null; setAsk(null); setOpen(n); }} />
      {leave}
    </RegTextProvider>
  );
}

/** النشرُ نافذةُ نموذج (قالبُ النوافذ): يومُ النفاذ، وخلاصةُ التعديل، وملحوظةُ الإقرار، وما يصدر معه — كما كان */
function PublishDialog({ slug, no, today, busy, dry, onClose, onPublish }: {
  slug: string; no: number; today: string; busy: boolean; dry?: boolean; onClose: () => void;
  onPublish: (effectiveFrom: string, changeNote: string, approvalNote: string) => void;
}) {
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [appr, setAppr] = useState("");
  const [plan, setPlan] = useState<act.PublishPlan | { ok: false; message: string } | null>(dry ? { ok: true, broken: [], followups: [] } as unknown as act.PublishPlan : null);
  useEffect(() => {
    if (dry) return;
    let live = true;
    act.publishPlan(slug).then((p) => live && setPlan(p as act.PublishPlan | { ok: false; message: string }));
    return () => { live = false; };
  }, [slug, dry]);
  const broken = plan?.ok ? plan.broken : [];
  const held = !plan?.ok || broken.length > 0 || note.trim().length < 2 || date < today;
  return (
    <Modal open onClose={onClose} busy={busy} size="lg" title={`نشر الإصدار ${no}`}
      footer={<>
        {/* زرّا النافذة كما في نوافذ البوّابة كلّها (قالبُ النوافذ يرسمهما من `.mdl` في `ad.css`) */}
        <Button variant="ghost" size="md" onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button variant="primary" size="md" onClick={() => onPublish(date, note, appr)} loading={busy} disabled={held}>انشر</Button>
      </>}>
      <Field label="يسري من" type="date" min={today} icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder={today} value={date} onChange={(e) => setDate(e.target.value)} required />
      <Textarea label="خلاصةُ التعديل" icon={<Notepad />} innerIcon={<Notepad />} placeholder="أُضيفت مادّةٌ في الإشراف، وعُدّلت المادة 19." rows={3} value={note} onChange={(e) => setNote(e.target.value)} required />
      <Textarea label="ملحوظةُ الإقرار" icon={<SealCheck />} innerIcon={<SealCheck />} placeholder="عُرض على المجلس الإداري في 20 أكتوبر 2026." rows={2} value={appr} onChange={(e) => setAppr(e.target.value)} optional />
      {plan && !plan.ok ? <Alert tone="warning" title="تعذّر حساب ما يصدر معه">{plan.message}</Alert> : null}
      {broken.length ? (
        <Alert tone="danger" title="موادُّ في وثائق أخرى تُحيل إلى ما حُذف">
          {broken.map((b) => `${b.title} (${b.articles.join("، ")})`).join("، ")}
        </Alert>
      ) : null}
      {plan?.ok && plan.followups.length ? (
        <section>
          <ModalSectionHeading icon={<TreeStructure />} title="يصدر معه" />
          <ul className="rgx-follow">
            {plan.followups.map((f) => (
              <li key={f.slug}>
                <b>{f.title}</b>
                <span>تُصحَّح أرقامُ الإحالات في {arCount(f.articles, AR_EDITED)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Modal>
  );
}
