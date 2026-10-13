"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Modal, ModalSectionHeading, Textarea } from "@adeeb/design-system";
import { BookOpenText, CalendarBlank, ClockCounterClockwise, Notepad, SealCheck, TextAa, TreeStructure, UserCircleCheck } from "@phosphor-icons/react";
import { ArrowSquareOut, Check, Eye, PencilSimple, Plus, Trash } from "@/app/_components/glyphs";
import { RegBlocks, RegTextProvider, type RegTextContext } from "@/app/regulations/_parts/RegText";
import { fmtDateOnly } from "@/lib/dates";
import { blocksToMarkup, markupToBlocks } from "@/lib/regulations/edit";
import { chapterParts, latin } from "@/lib/regulations/text";
import type { PresidentSeat } from "@/lib/regulations/authz";
import type { RegArticle } from "@/lib/regulations/types";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { PageHeader, type HeaderAction } from "../../_components/PageHeader";
import type { MenuGroup } from "../../_components/DropdownMenu";
import { useToast } from "../../_components/ToastProvider";
import * as act from "../actions";
import type { RoomDoc } from "../data";

// صفحةُ الوثيقة في غرفة التحرير: النصُّ كما يُقرأ في الموقع، ولكلّ مادّةٍ أفعالُها حين تكون مسودّة.
// وفوقه حالُ المسودّة: ما تغيّر فيها عن المنشور، وموافقةُ الرئيسين (الدستور م٦٨)، ثمّ النشر.

type Dialog =
  | { kind: "article"; no: number; title: string; text: string }
  | { kind: "add"; chapter: number; index: number; at: number; title: string; text: string }
  | { kind: "chapter"; chapter: number; title: string }
  | { kind: "newChapter"; title: string; artTitle: string; text: string }
  | { kind: "delete"; no: number }
  | { kind: "discard" }
  | { kind: "publish" }
  | null;

const SEAT_NAME: Record<PresidentSeat, string> = { club_president: "رئيس أدِيب", executive_council_president: "الرئيس التنفيذي" };
const SEATS = Object.keys(SEAT_NAME) as PresidentSeat[];

export function RegEditor({ doc, seat, today }: { doc: RoomDoc; seat: PresidentSeat | null; today: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [dlg, setDlg] = useState<Dialog>(null);

  const draft = doc.draft;
  const editing = !!draft;
  // قبل نشر الإصدار الأوّل يُصحَّح النصُّ في موضعه، ولا يتغيّر الترقيم ولا يُنشر من هنا.
  const structural = editing && doc.published;
  const mine = draft?.approvals.some((a) => a.seat === seat) ?? false;
  const both = (draft?.approvals.length ?? 0) >= 2;
  const changed = !!draft && (Object.keys(draft.changes).length > 0 || draft.removed.length > 0 || draft.chapters.length > 0);
  const current = doc.versions.find((v) => v.state === "current") ?? null;
  const rev = draft?.rev ?? "";

  const ctx = useMemo<RegTextContext>(
    () => ({ here: doc.slug, base: "/regulations", previews: {}, docNames: doc.docNames, counts: doc.counts, terms: [] }),
    [doc.slug, doc.docNames, doc.counts],
  );

  function run(fn: () => Promise<act.RoomResult>, done?: string) {
    start(async () => {
      const r = await fn();
      if (!r.ok) {
        toast.error(r.message);
        return;
      }
      if (r.message ?? done) toast.success((r.message ?? done)!);
      setDlg(null);
      router.refresh();
    });
  }

  // ── الرأس: فعلٌ واحدٌ هو خطوةُ المسودّة التالية، وما سواه في القائمة ──
  let action: HeaderAction | undefined;
  if (!draft && doc.published) action = { label: "إصدار جديد", icon: <PencilSimple size={18} />, kind: "primary", loading: pending, onClick: () => run(() => act.startDraft(doc.slug)) };
  else if (draft && structural && changed && both) action = { label: "انشر", icon: <SealCheck />, kind: "primary", onClick: () => setDlg({ kind: "publish" }) };
  else if (draft && structural && changed && seat && !mine) action = { label: "أوافق على المسودة", icon: <Check size={18} />, kind: "primary", loading: pending, onClick: () => run(() => act.approveDraft(doc.slug, rev), "سُجّلت موافقتك.") };

  const menu: MenuGroup[] = [
    {
      items: [
        { label: "عرضها في الموقع", icon: <ArrowSquareOut />, onSelect: () => window.open(`/regulations/${doc.slug}`, "_blank", "noopener") },
        ...(mine ? [{ label: "سحب موافقتي", icon: <ClockCounterClockwise />, onSelect: () => run(() => act.withdrawApproval(doc.slug), "سُحبت موافقتك.") }] : []),
      ],
    },
    ...(draft && doc.published ? [{ danger: true, items: [{ label: "حذف المسودة", icon: <Trash />, danger: true, onSelect: () => setDlg({ kind: "discard" }) }] }] : []),
  ];

  const status = draft
    ? doc.published ? { label: `مسودة الإصدار ${draft.no}`, tone: "warning" as const } : { label: "لم يُنشر بعد", tone: "neutral" as const }
    : current ? { label: `الإصدار ${current.no}`, tone: "success" as const } : undefined;

  const editArticle = (a: RegArticle) => setDlg({ kind: "article", no: a.no, title: latin(a.title), text: blocksToMarkup(a.blocks) });
  const addAt = (chapter: number, index: number, at: number) => setDlg({ kind: "add", chapter, index, at, title: "", text: "" });

  return (
    <RegTextProvider value={ctx}>
      <PageHeader title={doc.title} parent={{ label: "أنظمة أدِيب", href: "/dashboard/regulations" }} status={status} action={action} menu={menu} />

      {draft && structural ? (
        <Card className="rgx-state">
          <CardHeader
            variant="soft"
            icon={<Notepad />}
            title={`مسودة الإصدار ${draft.no}`}
            actions={<Changes draft={draft} />}
          />
          <CardBody>
            {draft.removed.length ? <p className="rgx-removed">حُذفت من المنشور: {draft.removed.map((n) => `المادة ${n}`).join("، ")}</p> : null}
            <ul className="rgx-appr">
              {SEATS.map((s) => {
                const a = draft.approvals.find((x) => x.seat === s);
                return (
                  <li key={s} data-ok={a ? "" : undefined}>
                    <span className="tico tico-steel" aria-hidden>{a ? <Check /> : <UserCircleCheck />}</span>
                    <b>{a?.label ?? SEAT_NAME[s]}</b>
                    <span>{a ? a.name : "بانتظار الموافقة"}</span>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <div className="rgx-doc">
        {doc.body.map((c, ci) => {
          const [kicker, name] = chapterParts(c.title);
          return (
            <Card key={ci} className="reg-ch">
              <h2 className="reg-band">
                <span className="reg-band-ic"><BookOpenText aria-hidden /></span>
                <span className="reg-band-t">{name ?? doc.title}</span>
                {kicker ? <Badge variant="glass">{kicker}</Badge> : null}
              </h2>
              {editing ? (
                <div className="rgx-ch-acts">
                  <button type="button" className="reg-act" onClick={() => setDlg({ kind: "chapter", chapter: ci, title: latin(c.title ?? "") })}>
                    <PencilSimple aria-hidden />
                    عنوان الباب
                  </button>
                  {structural ? (
                    <button type="button" className="reg-act" onClick={() => addAt(ci, 0, c.articles[0]?.no ?? 1)}>
                      <Plus aria-hidden />
                      مادة في أوّله
                    </button>
                  ) : null}
                  {draft?.chapters.includes(ci) ? <Badge tone="warning">عنوانٌ معدّل</Badge> : null}
                </div>
              ) : null}
              {c.articles.map((a, ai) => {
                const ch = draft?.changes[a.no];
                return (
                  <section key={a.no} id={`m${a.no}`} className="reg-art" data-change={ch}>
                    <div className="reg-gut">
                      <span className="reg-no">{a.no}</span>
                    </div>
                    <div className="min-w-0">
                      <RegBlocks blocks={a.blocks} lead={<span className="reg-art-t">{latin(a.title)}:</span>} />
                      {editing || ch ? (
                        <div className="reg-art-acts">
                          {ch ? <Badge tone={ch === "new" ? "success" : "warning"}>{ch === "new" ? "جديدة" : "معدّلة"}</Badge> : null}
                          {editing ? (
                            <button type="button" className="reg-act" onClick={() => editArticle(a)}>
                              <PencilSimple aria-hidden />
                              تعديل
                            </button>
                          ) : null}
                          {structural ? (
                            <>
                              <button type="button" className="reg-act" onClick={() => addAt(ci, ai + 1, a.no + 1)}>
                                <Plus aria-hidden />
                                مادة بعدها
                              </button>
                              <button type="button" className="reg-act" onClick={() => setDlg({ kind: "delete", no: a.no })}>
                                <Trash aria-hidden />
                                حذف
                              </button>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </Card>
          );
        })}
        {structural ? (
          <Button variant="ghost" className="rgx-add-ch" onClick={() => setDlg({ kind: "newChapter", title: "", artTitle: "", text: "" })}>
            <Plus size={18} aria-hidden />
            باب جديد
          </Button>
        ) : null}
      </div>

      {doc.versions.length ? (
        <Card className="rgx-vers">
          <CardHeader variant="soft" icon={<ClockCounterClockwise />} title="سجل الإصدارات" />
          <ol>
            {doc.versions.map((v) => (
              <li key={v.no}>
                <span className="reg-no">{v.no}</span>
                <div>
                  <p className="rgx-ver-h">
                    <b>{v.state === "scheduled" ? `يسري في ${fmtDateOnly(v.effectiveFrom)}` : `نافذ منذ ${fmtDateOnly(v.effectiveFrom)}`}</b>
                    {v.state === "current" ? <Badge tone="success">النافذ</Badge> : v.state === "scheduled" ? <Badge tone="info">مجدول</Badge> : null}
                  </p>
                  {v.changeNote ? <p>{latin(v.changeNote)}</p> : null}
                  {v.approvalNote ? <p className="rgx-ver-n">{latin(v.approvalNote)}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      {dlg?.kind === "article" || dlg?.kind === "add" ? (
        <ArticleDialog
          dlg={dlg}
          busy={pending}
          onChange={(p) => setDlg({ ...dlg, ...p })}
          onClose={() => setDlg(null)}
          onSave={() =>
            dlg.kind === "article"
              ? run(() => act.saveArticle(doc.slug, rev, dlg.no, dlg.title, dlg.text), "حُفظت المادة.")
              : run(() => act.addArticle(doc.slug, rev, dlg.chapter, dlg.index, dlg.title, dlg.text), "أُضيفت المادة.")
          }
        />
      ) : null}

      {dlg?.kind === "chapter" ? (
        <Modal
          open
          onClose={() => setDlg(null)}
          busy={pending}
          title="عنوان الباب"
          footer={<DialogFooter busy={pending} onClose={() => setDlg(null)} onSave={() => run(() => act.saveChapter(doc.slug, rev, dlg.chapter, dlg.title), "حُفظ عنوان الباب.")} />}
        >
          <Field label="عنوان الباب" icon={<TextAa />} innerIcon={<BookOpenText />} placeholder="الباب الأول: التعريف" value={dlg.title} onChange={(e) => setDlg({ ...dlg, title: e.target.value })} required />
        </Modal>
      ) : null}

      {dlg?.kind === "newChapter" ? (
        <ArticleDialog
          dlg={{ kind: "add", at: doc.body.reduce((s, c) => s + c.articles.length, 0) + 1, title: dlg.artTitle, text: dlg.text }}
          chapterTitle={dlg.title}
          onChapterTitle={(t) => setDlg({ ...dlg, title: t })}
          busy={pending}
          onChange={(p) => setDlg({ ...dlg, artTitle: p.title ?? dlg.artTitle, text: p.text ?? dlg.text })}
          onClose={() => setDlg(null)}
          onSave={() => run(() => act.addChapter(doc.slug, rev, dlg.title, dlg.artTitle, dlg.text), "أُضيف الباب.")}
        />
      ) : null}

      <ConfirmDialog
        open={dlg?.kind === "delete"}
        onClose={() => setDlg(null)}
        tone="danger"
        icon={<Trash />}
        title={dlg?.kind === "delete" ? `حذف المادة ${dlg.no}` : ""}
        text="تتقدّم أرقامُ ما بعدها، وتتبعها الإحالاتُ إليها."
        confirmLabel="احذف"
        loading={pending}
        onConfirm={() => dlg?.kind === "delete" && run(() => act.removeArticle(doc.slug, rev, dlg.no), "حُذفت المادة.")}
      />
      <ConfirmDialog
        open={dlg?.kind === "discard"}
        onClose={() => setDlg(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف المسودة"
        text="يذهب ما عُدّل فيها، ويبقى الإصدار المنشور كما هو."
        confirmLabel="احذف المسودة"
        loading={pending}
        onConfirm={() => run(() => act.discardDraft(doc.slug, rev), "حُذفت المسودة.")}
      />

      {dlg?.kind === "publish" && draft ? (
        <PublishDialog slug={doc.slug} no={draft.no} today={today} busy={pending} onClose={() => setDlg(null)}
          onPublish={(d, n, a) => run(() => act.publishDraft(doc.slug, rev, d, n, a))} />
      ) : null}
    </RegTextProvider>
  );
}

function Changes({ draft }: { draft: NonNullable<RoomDoc["draft"]> }) {
  const vals = Object.values(draft.changes);
  const edited = vals.filter((v) => v === "edited").length;
  const added = vals.filter((v) => v === "new").length;
  if (!edited && !added && !draft.removed.length && !draft.chapters.length) return <Badge>لا تغيير بعد</Badge>;
  return (
    <span className="rgx-changes">
      {edited ? <Badge tone="warning">معدّلة {edited}</Badge> : null}
      {added ? <Badge tone="success">جديدة {added}</Badge> : null}
      {draft.removed.length ? <Badge tone="danger">محذوفة {draft.removed.length}</Badge> : null}
      {draft.chapters.length ? <Badge tone="warning">أبواب {draft.chapters.length}</Badge> : null}
    </span>
  );
}

function DialogFooter({ busy, onClose, onSave, label = "حفظ", disabled }: { busy: boolean; onClose: () => void; onSave: () => void; label?: string; disabled?: boolean }) {
  return (
    <>
      <Button variant="ghost" onClick={onClose} disabled={busy}>إلغاء</Button>
      <Button variant="primary" onClick={onSave} loading={busy} disabled={disabled}>{label}</Button>
    </>
  );
}

/** المادّةُ تُكتب نصًّا وتُعايَن كما ستظهر. */
function ArticleDialog({
  dlg, busy, onChange, onClose, onSave, chapterTitle, onChapterTitle,
}: {
  dlg: { kind: "article" | "add"; at?: number; no?: number; title: string; text: string };
  busy: boolean;
  onChange: (p: { title?: string; text?: string }) => void;
  onClose: () => void;
  onSave: () => void;
  chapterTitle?: string;
  onChapterTitle?: (t: string) => void;
}) {
  const parsed = useMemo(() => (dlg.text.trim() ? markupToBlocks(dlg.text) : null), [dlg.text]);
  const no = dlg.kind === "article" ? dlg.no : dlg.at;
  const title = onChapterTitle ? "باب جديد" : dlg.kind === "article" ? `تعديل المادة ${no}` : `مادة جديدة تصير المادة ${no}`;
  return (
    <Modal open onClose={onClose} busy={busy} size="lg" title={title}
      footer={<DialogFooter busy={busy} onClose={onClose} onSave={onSave} disabled={!parsed || "error" in parsed} />}>
      <div className="rgx-form">
        {onChapterTitle ? (
          <Field label="عنوان الباب" icon={<TextAa />} innerIcon={<BookOpenText />} placeholder="الباب الثاني عشر: أحكام ختامية" value={chapterTitle ?? ""} onChange={(e) => onChapterTitle(e.target.value)} required />
        ) : null}
        <Field label="عنوان المادة" icon={<TextAa />} innerIcon={<PencilSimple />} placeholder="النفاذ" value={dlg.title} onChange={(e) => onChange({ title: e.target.value })} required />
        <Textarea
          label="نص المادة"
          icon={<Notepad />}
          innerIcon={<Notepad />}
          placeholder={"نص المادة.\n- بند\n- بند"}
          rows={9}
          value={dlg.text}
          onChange={(e) => onChange({ text: e.target.value })}
          error={parsed && "error" in parsed ? parsed.error : undefined}
          required
        />
        {parsed && "blocks" in parsed ? (
          <section>
            <ModalSectionHeading icon={<Eye />} title="كما ستظهر" />
            <div className="rgx-prev">
              <RegBlocks blocks={parsed.blocks} lead={<span className="reg-art-t">{dlg.title.trim() || "عنوان المادة"}:</span>} />
            </div>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}

function PublishDialog({ slug, no, today, busy, onClose, onPublish }: {
  slug: string; no: number; today: string; busy: boolean; onClose: () => void;
  onPublish: (effectiveFrom: string, changeNote: string, approvalNote: string) => void;
}) {
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [appr, setAppr] = useState("");
  const [plan, setPlan] = useState<act.PublishPlan | { ok: false; message: string } | null>(null);
  useEffect(() => {
    let live = true;
    act.publishPlan(slug).then((p) => live && setPlan(p as act.PublishPlan | { ok: false; message: string }));
    return () => { live = false; };
  }, [slug]);
  const broken = plan?.ok ? plan.broken : [];
  return (
    <Modal open onClose={onClose} busy={busy} size="lg" title={`نشر الإصدار ${no}`}
      footer={<DialogFooter busy={busy} onClose={onClose} label="انشر" onSave={() => onPublish(date, note, appr)}
        disabled={!plan?.ok || broken.length > 0 || note.trim().length < 2 || date < today} />}>
      <div className="rgx-form">
        <Field label="يسري من" type="date" min={today} icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder={today} value={date} onChange={(e) => setDate(e.target.value)} required />
        <Textarea label="خلاصة التعديل" icon={<Notepad />} innerIcon={<Notepad />} placeholder="أُضيفت مادة في الإشراف، وعُدّلت المادة 19." rows={3} value={note} onChange={(e) => setNote(e.target.value)} required />
        <Textarea label="ملاحظة الإقرار" icon={<SealCheck />} innerIcon={<SealCheck />} placeholder="عُرض على المجلس الإداري في 20 أكتوبر 2026." rows={2} value={appr} onChange={(e) => setAppr(e.target.value)} optional />
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
                  <span>تُصحَّح أرقام الإحالات في {f.articles} {f.articles === 1 ? "مادة" : f.articles === 2 ? "مادتين" : f.articles <= 10 ? "مواد" : "مادة"}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}
