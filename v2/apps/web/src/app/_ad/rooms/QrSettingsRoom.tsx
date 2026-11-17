"use client";

/**
 * **إعداداتُ الباركود على قالب «حسابي»** (٢٠٢٦-١١-١٦ — لم تُعتمد بعد، مختبرُها `/dashboard/ad/qr-settings`). كانت `QrSettingsView`: رأسٌ قديم
 * ومبدّلٌ «الإحصاء / الإعدادات»، وكرتٌ فيه الباركودُ وتنزيلُه وثلاثةُ صفوف، ثمّ كرتا الشركاء والجدول، ثمّ كرتُ الحذف. وقد انتقل الباركودُ
 * وتنزيلُه إلى **بيته** (صفحتُه، `QrHomeSection`)، فبقي هنا ما يُدار به وحده، أقسامًا بسطور «حسابي»:
 * - **الباركود**: اسمُه، ووجهتُه (يُعدَّلان معًا في نافذة الوجهة نفسِها، والنوعُ «رابط / ملف» مبدّلُها والملفُّ حقلُ الرفع المعتمد)، وحالُه، وشكلُه.
 * - **وجهةٌ بجدول**: نوافذُ المواعيد سطورًا، والساريةُ الآن تقول ذلك، وما بعدها جملةُ الوجهة الأصليّة.
 * - **الشركاء** للمالك وحده: سطرٌ لكلّ شريكٍ بإذنه، يُفتح فيُبدَّل إذنُه أو يُخرج.
 * - **حذفُ الباركود** قسمٌ بنغمة الخطر، وفيه الحذفُ وحده (الإيقافُ يرجع فسكن مع أفعاله).
 *
 * **والسلوكُ سلوكُ القديم**: الأفعالُ نفسُها بمدخلاتها، ورفعُ الملف قبل الكتابة، والحذفُ يذهب إلى قائمة الباركودات بلا رجوع، و`?share=1`
 * يفتح نافذةَ الشريك. والجديدُ: إخراجُ الشريك وحذفُ النافذة يسألان قبل أن يمضيا (كانا يمضيان بنقرة).
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Select, overBy } from "@adeeb/design-system";
import { CalendarBlank, File as FileIcon, FilePdf, Globe, ImageSquare, LinkSimple, Palette, Pause, Play, QrCode, ShieldCheck, TextAa, UserCircle, UsersThree } from "@phosphor-icons/react";
import { ArrowRight, PencilSimple, Plus, Trash, Warning } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { fmtDate } from "@/lib/dates";
import { QR_TITLE_MAX, checkTarget, qrFileType, targetHost, type QrKind } from "@/lib/qrLinks";
import { UPLOAD_RULES, attachHint, fileMeta } from "@/lib/upload";
import { checkQrFile, isPdf } from "@/lib/qrFile";
import {
  addQrSchedule, deleteQrLink, deleteQrSchedule, setQrLinkActive, setQrShareAccess, shareQrLink, unshareQrLink, updateQrLink,
} from "@/app/dashboard/tools/qr/actions";
import { uploadQrFile } from "@/app/dashboard/tools/qr/uploadFile";
import { qrFileLabel } from "@/app/dashboard/tools/qr/QrTarget";
import { killText } from "@/app/dashboard/tools/qr/copy";
import type { QrLinkRow, QrSchedule, QrShare } from "@/app/dashboard/tools/qr/data";
import type { QrOwnerBrief } from "@/app/dashboard/tools/qr/oversight/data";
import { AdButton, AdConfirm, AdNote, AdRoom } from "../primitives";
import { AdLine, AdSection } from "../account";
import { FormChoice } from "../form";
import { AdUpload } from "../upload";
import { RecordTicket } from "../record";
import { qrState, qrStub, qrTarget } from "./QrLinksRoom";

const PICK_RULE = UPLOAD_RULES.qrFile;
const HINT = attachHint(UPLOAD_RULES.qrFileStored);
const KINDS: { value: QrKind; label: string }[] = [{ value: "link", label: "رابط" }, { value: "file", label: "ملف" }];
const ACCESS = [{ value: "read", label: "يقرأ الإحصاء" }, { value: "edit", label: "يحرّر الباركود" }];
const ACCESS_LINE = { read: "يفتح صفحة الباركود ويقرأ إحصاءه وأرقامه", edit: "يبدّل الوجهة والتصميم والحالة والجدولة" };
const ACCESS_HELP = { read: "يفتح صفحة الباركود ويقرأ إحصاءه وأرقامه. لا يبدّل شيئًا.", edit: "يبدّل الوجهة والتصميم والحالة والجدولة. لا يحذف ولا يشارك." };
type Res = { ok: boolean; message: string };

export function QrSettingsRoom({ link, schedules, shares = [], candidates = [], canManage = false, openShare = false, dry, homeHref, designHref }: {
  link: QrLinkRow; schedules: QrSchedule[]; shares?: QrShare[]; candidates?: QrOwnerBrief[]; canManage?: boolean; openShare?: boolean;
  /** مختبر: كلُّ فعلٍ يُقال ولا يُكتب */
  dry?: boolean;
  /** بيتُ الباركود (في المختبر صفحتُه في المختبر) */
  homeHref?: string;
  designHref?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [acting, setActing] = useState<string | null>(null);
  const spin = (k: string) => pending && acting === k;
  const home = homeHref ?? `/dashboard/tools/qr/${link.id}`;

  /** فعلٌ واحد: رسالتُه ثمّ تحديث (كما كان)، وفي المختبر يُقال ولا يُكتب */
  const run = (key: string, call: () => Promise<Res>, after?: () => void) => {
    if (dry) { toast.info("مختبر: لم يُحفظ شيء."); after?.(); return; }
    // فعلٌ واحدٌ في كلّ مرّة: تأكيدٌ مفتوحٌ لا يبدأ ثانيًا وآخرُ يجري (المراجع ٢٠٢٦-١١-١٧)
    if (pending) return;
    setActing(key);
    start(async () => {
      const r = await call();
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      after?.();
      router.refresh();
    });
  };

  /* ── نافذةُ الاسم والوجهة ── */
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(link.title);
  const [kind, setKind] = useState<QrKind>(link.kind);
  const [target, setTarget] = useState(link.kind === "link" ? link.targetUrl : "");
  const [picked, setPicked] = useState<File | null>(null);
  const openEdit = () => { setTitle(link.title); setKind(link.kind); setTarget(link.kind === "link" ? link.targetUrl : ""); setPicked(null); setEditing(true); };
  const current = link.kind === "file" && link.filePath && link.fileUrl ? { path: link.filePath, url: link.fileUrl } : null;
  const isFile = kind === "file";
  const trimmed = target.trim();
  const checked = !isFile && trimmed ? checkTarget(trimmed) : null;
  const bad = checked && !checked.ok ? checked.message : null;
  const ready = title.trim().length > 0 && !overBy(title, QR_TITLE_MAX) && (isFile ? !!picked || !!current : !!checked?.ok);
  const pickedUrl = useMemo(() => (picked && !isPdf(picked) ? URL.createObjectURL(picked) : null), [picked]);
  useEffect(() => () => { if (pickedUrl) URL.revokeObjectURL(pickedUrl); }, [pickedUrl]);
  const shownImage = picked ? pickedUrl : current && qrFileType(current.path) !== "pdf" ? current.url : null;
  const acceptFile = (file: File) => {
    const why = checkQrFile(file);
    if (why) { toast.error(`لم يُقبل «${file.name}» : ${why}`); return; }
    setPicked(file);
  };
  // الملفُّ يُرفع أوّلًا ثمّ يُكتب الصفُّ بنداءٍ واحد (كما كان): لو تعثّر الرفعُ لم يُكتب شيء وبقي المختار ليعيد المحاولة
  const saveEdit = () => run("edit", async () => {
    let filePath: string | undefined;
    if (isFile && picked) {
      const up = await uploadQrFile(picked);
      if (!up.ok) return { ok: false, message: up.message };
      filePath = up.path;
    }
    return updateQrLink(link.id, { title, kind, target: kind === "link" ? target : undefined, filePath });
  }, () => { setPicked(null); setEditing(false); });

  /* ── الحال والحذف ── */
  const toggle = () => run("toggle", () => setQrLinkActive(link.id, !link.active));
  const [kill, setKill] = useState(false);
  const doKill = () => {
    if (dry) { toast.info("مختبر: لم يُحذف شيء."); setKill(false); return; }
    setActing("kill");
    start(async () => {
      const r = await deleteQrLink(link.id);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      setKill(false);
      // لا صفحةَ يُرجَع إليها بعد الحذف، و`replace` تمنع العودةَ بالسهم إلى باركودٍ لم يعُد موجودًا
      router.replace("/dashboard/tools/qr/links");
    });
  };

  /* ── وجهةٌ بجدول ── */
  const [winOpen, setWinOpen] = useState(false);
  const [wTarget, setWTarget] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");
  const wTrim = wTarget.trim();
  const wLink = wTrim ? checkTarget(wTrim) : null;
  const wBad = wLink && !wLink.ok ? wLink.message : null;
  const wReady = !!wLink?.ok && (!!startsAt || !!endsAt);
  const [now] = useState(Date.now);
  const liveId = schedules.find((r) => (!r.startsAt || Date.parse(r.startsAt) <= now) && (!r.endsAt || Date.parse(r.endsAt) > now))?.id;
  const addWindow = () => run("win", () => addQrSchedule(link.id, { target: wTrim, startsAt: startsAt || null, endsAt: endsAt || null, note: note || null }),
    () => { setWinOpen(false); setWTarget(""); setStartsAt(""); setEndsAt(""); setNote(""); });
  const [dropWin, setDropWin] = useState<QrSchedule | null>(null);

  /* ── الشركاء ── */
  const [shareOpen, setShareOpen] = useState(openShare && canManage);
  useEffect(() => {
    // `?share=1` يُفتح مرّةً ثمّ يُمحى من العنوان (كما كان)، فلا تُفتح النافذةُ مع كلّ تحديث
    if (openShare && canManage) window.history.replaceState(null, "", window.location.pathname);
  }, [openShare, canManage]);
  const [who, setWho] = useState("");
  const [access, setAccess] = useState<"read" | "edit">("read");
  const free = candidates.filter((c) => !shares.some((r) => r.userId === c.id));
  const [partner, setPartner] = useState<QrShare | null>(null);
  const [partnerAccess, setPartnerAccess] = useState<"read" | "edit">("read");
  const [dropPartner, setDropPartner] = useState<QrShare | null>(null);

  const fileLabel = qrFileLabel(link.filePath);
  const isPdfNow = !!link.filePath && qrFileType(link.filePath) === "pdf";

  return (
    <AdRoom label={link.title}>
      <RecordTicket title={link.title} seed={link.id} stub={qrStub(link)} chips={qrState(link)} info={[qrTarget(link)]}
        acts={<AdButton variant="line" size="sm" icon={<ArrowRight />} href={home}>إلى الباركود</AdButton>} />

      <AdSection icon={<QrCode />} title="الباركود" sub="اسمُه ووجهتُه وحالُه وشكلُه">
        <AdLine icon={<TextAa />} k="الاسم" v={link.title} sub="تعرفه به بين باركوداتك، ولا يراه من يمسحه"
          act={{ text: "عدّل", label: "عدّل الاسم والوجهة", icon: <PencilSimple /> }} onClick={openEdit} />
        {link.kind === "file" ? (
          <AdLine icon={isPdfNow ? <FilePdf /> : <ImageSquare />} k="الوجهة" v={fileLabel} sub="الملفّ الذي يراه من يمسحه"
            act={{ text: "عدّل", label: "عدّل الاسم والوجهة", icon: <PencilSimple /> }} onClick={openEdit} />
        ) : (
          <AdLine icon={<Globe />} k="الوجهة" v={targetHost(link.targetUrl)} ltr sub="حيثما يصل من يمسحه"
            act={{ text: "عدّل", label: "عدّل الاسم والوجهة", icon: <PencilSimple /> }} onClick={openEdit} />
        )}
        <AdLine icon={link.active ? <Play /> : <Pause />} k="الحال" v={link.active ? "يعمل الآن" : "موقوفٌ الآن"} tone={link.active ? "ok" : "warn"}
          sub={link.active ? "من يمسحه يصل إلى وجهته" : "من يمسحه يرى صفحةً تقول إنّه غير متاح"}
          act={{ text: spin("toggle") ? "لحظة…" : link.active ? "أوقفه" : "شغّله", label: link.active ? "أوقف الباركود" : "شغّل الباركود", icon: link.active ? <Pause /> : <Play /> }}
          onClick={toggle} disabled={pending} />
        <AdLine icon={<Palette />} k="الشكل" v="اللون والشعار والإطار" act={{ text: "عدّل الشكل", label: "عدّل شكل الباركود", icon: <Palette /> }} href={designHref ?? `/dashboard/tools/qr/${link.id}/design`} />
      </AdSection>

      <AdSection icon={<CalendarBlank />} title="وجهةٌ بجدول" sub="الملصقُ نفسُه يوصل إلى وجهةٍ في وقتها، ثمّ يعود إلى وجهته"
        act={<AdButton variant="line" size="sm" icon={<Plus />} onClick={() => setWinOpen(true)}>أضف نافذة</AdButton>}
        foot={schedules.length ? (
          <p className="ad-qrs-k">
            وخارجَ هذه النوافذ {link.kind === "file" ? "يرى الماسحُ الملف." : <>يذهب الماسحُ إلى <bdi dir="ltr" className="lat">{targetHost(link.targetUrl)}</bdi>.</>}
          </p>
        ) : undefined}>
        {schedules.length ? schedules.map((r) => (
          <AdLine key={r.id} icon={<CalendarBlank />} k={`${r.startsAt ? `من ${fmtDate(r.startsAt)}` : "من الآن"}${r.endsAt ? ` إلى ${fmtDate(r.endsAt)}` : " بلا نهاية"}`}
            v={targetHost(r.targetUrl)} ltr sub={[r.id === liveId ? "ساريةٌ الآن" : null, r.note].filter(Boolean).join("، ") || undefined}
            tone={r.id === liveId ? "ok" : undefined} toneAt="sub"
            act={{ text: "حذف", label: "حذف النافذة", icon: <Trash />, danger: true }} onClick={() => setDropWin(r)} disabled={pending} />
        )) : (
          <AdLine icon={<CalendarBlank />} v="لا نوافذ بعد" sub="أضِف نافذةً فيوصّل الملصقُ نفسُه إلى وجهةٍ في وقتها ثمّ يعود إلى وجهته الأصليّة." />
        )}
      </AdSection>

      {/* **الشركاءُ للمالك وحده**: الشريكُ لا يرى إلّا صفَّه هو، وقسمٌ يعرض عليه اسمَه شريكًا لنفسه لغو (كما كان) */}
      {canManage ? (
        <AdSection icon={<UsersThree />} title="الشركاء" sub="الملكيّةُ تبقى لك، والشريكُ يقرأ أو يحرّر بإذنك"
          act={<AdButton variant="line" size="sm" icon={<Plus />} onClick={() => { setWho(""); setAccess("read"); setShareOpen(true); }}>أضِف شريكًا</AdButton>}>
          {shares.length ? shares.map((r) => (
            <AdLine key={r.userId} icon={<UserCircle />} v={r.name} sub={ACCESS_LINE[r.access]}
              act={{ text: r.access === "edit" ? "يحرّر" : "يقرأ", label: `ما يستطيعه ${r.name}`, icon: <ShieldCheck /> }}
              onClick={() => { setPartner(r); setPartnerAccess(r.access); }} />
          )) : (
            <AdLine icon={<UsersThree />} v="لا شركاء بعد" sub="شارِك الباركود مع عضوٍ ليقرأ إحصاءه أو يبدّل وجهته معك، والملكيّةُ تبقى لك." />
          )}
        </AdSection>
      ) : null}

      {/* **الحذفُ وحده في قسم الخطر** (اختارها المالك ٢٠٢٦-٠٨-٣١): الإيقافُ يرجع فسكن مع أفعاله، وبقي هنا ما لا رجعةَ فيه — وللمالك وحده */}
      {canManage ? (
        <AdSection icon={<Warning />} title="حذفُ الباركود" tone="bad">
          <AdLine icon={<Trash />} v="يُحذف الباركود ومسحاتُه كلُّها بلا رجعة" sub="وكلُّ ملصقٍ مطبوعٍ يصير باركودًا ميّتًا. والإيقافُ يكفي إن أردتَ تعطيلَه فحسب."
            danger act={{ text: "حذف الباركود", label: "حذف الباركود", icon: <Trash />, danger: true }} onClick={() => setKill(true)} disabled={pending} />
        </AdSection>
      ) : null}

      {/* نافذةُ الاسم والوجهة: «رابط / ملف» مبدّلُ النافذة، والملفُّ حقلُ الرفع المعتمد (كانا بطاقتي راديو وزرَّ مرفقٍ من الهويّة القديمة) */}
      <Modal open={editing} onClose={() => setEditing(false)} size="md" busy={spin("edit")} title="تعديل وجهة الباركود"
        description={isFile ? "الملفُّ يتبدّل والباركود المطبوعُ لا يتغيّر، فمن يمسحه بعد الحفظ يرى الملف الجديد."
          : "الوجهةُ تتبدّل والباركود المطبوعُ لا يتغيّر، فمن يمسحه بعد الحفظ يصل إلى الوجهة الجديدة."}
        footer={(
          <>
            <Button variant="primary" size="md" loading={spin("edit")} disabled={!ready} onClick={saveEdit}>حفظ</Button>
            <Button variant="ghost" size="md" disabled={spin("edit")} onClick={() => setEditing(false)}>إلغاء</Button>
          </>
        )}>
        <div className="form-grid">
          <Field className="form-full" label="اسم الباركود" icon={<TextAa />} innerIcon={<QrCode />} placeholder="اكتب اسم الباركود" value={title}
            onChange={(e) => setTitle(e.target.value)} helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه." count={{ max: QR_TITLE_MAX }} required />
          <div className="form-full ad-qrs-kind">
            <span className="ad-qrs-k">نوع الوجهة</span>
            <FormChoice label="نوع الوجهة" items={KINDS} value={kind} onChange={(v) => setKind(v as QrKind)} disabled={spin("edit")} />
          </div>
          {isFile ? (
            <AdUpload label="الملف" noun="file" whole icon={<FileIcon />} required accept={PICK_RULE.accept} alt="الصورة التي يراها من يمسح الباركود"
              value={shownImage} busy={spin("edit") && !!picked} help={current && !picked ? `الملفّ الحاليّ باقٍ ما لم تختر غيره : ${HINT}` : HINT}
              onFile={acceptFile} onClear={picked && !spin("edit") ? () => setPicked(null) : undefined}
              file={picked ? { name: picked.name, meta: fileMeta(picked.type, picked.size), icon: isPdf(picked) ? <FilePdf /> : <ImageSquare /> }
                : current && qrFileType(current.path) === "pdf" ? { name: "الملف الحاليّ", meta: "ملف PDF", icon: <FilePdf /> } : null} />
          ) : (
            <Field className="form-full" label="الوجهة" icon={<LinkSimple />} innerIcon={<Globe />} placeholder="https://adeeb.club" dir="ltr" value={target}
              onChange={(e) => setTarget(e.target.value)} helper="حيثما يصل من يمسح الباركود." error={bad ?? undefined} required />
          )}
        </div>
      </Modal>

      <Modal open={winOpen} onClose={() => setWinOpen(false)} size="md" busy={spin("win")} title="نافذةُ وجهة"
        description="وجهةٌ تسري بين وقتين ثمّ تنتهي، والملصقُ المطبوعُ لا يتغيّر. والأوقاتُ بتوقيت الرياض."
        footer={(
          <>
            <Button variant="primary" size="md" loading={spin("win")} disabled={!wReady} onClick={addWindow}>أضف النافذة</Button>
            <Button variant="ghost" size="md" disabled={spin("win")} onClick={() => setWinOpen(false)}>إلغاء</Button>
          </>
        )}>
        <div className="form-grid">
          <Field className="form-full" label="الوجهة في هذه النافذة" icon={<LinkSimple />} innerIcon={<Globe />} placeholder="https://adeeb.club/register" dir="ltr"
            value={wTarget} onChange={(e) => setWTarget(e.target.value)} error={wBad ?? undefined} helper="حيثما يصل من يمسح الباركود أثناء هذه المدّة." required />
          <Field className="form-full" label="تبدأ" type="datetime-local" icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder="" dir="ltr"
            value={startsAt} onChange={(e) => setStartsAt(e.target.value)} helper="اتركها فارغةً لتسري من الآن." optional />
          <Field className="form-full" label="تنتهي" type="datetime-local" icon={<CalendarBlank />} innerIcon={<CalendarBlank />} placeholder="" dir="ltr"
            value={endsAt} onChange={(e) => setEndsAt(e.target.value)} helper="اتركها فارغةً فتبقى إلى أن تحذفها." optional />
          <Field className="form-full" label="ملاحظة" icon={<TextAa />} innerIcon={<TextAa />} placeholder="مثال: نافذة التسجيل" value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 120))} helper="تكتبها لنفسك لتعرف لماذا أنشأتها." optional />
          {!startsAt && !endsAt ? (
            <div className="form-full">
              <AdNote tone="info" title="نافذةٌ بلا وقتين">نافذةٌ بلا بدايةٍ ولا نهايةٍ تعني تبديلَ الوجهة إلى الأبد، وذلك يُفعَل من «الوجهة» في أعلى الصفحة لا من هنا.</AdNote>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} size="sm" busy={spin("share")} title="مشاركةُ الباركود"
        description="الملكيّةُ تبقى لك، والشريكُ يقرأ أو يحرّر بحسب إذنك. وكلُّ تغييرٍ يُقيَّد في السجلّ باسم فاعله."
        footer={(
          <>
            <Button variant="primary" size="md" loading={spin("share")} disabled={!who}
              onClick={() => run("share", () => shareQrLink(link.id, who, access), () => { setShareOpen(false); setWho(""); setAccess("read"); })}>شارِك</Button>
            <Button variant="ghost" size="md" disabled={spin("share")} onClick={() => setShareOpen(false)}>إلغاء</Button>
          </>
        )}>
        <div className="form-grid">
          <Select className="form-full" label="العضو" icon={<UsersThree />} value={who} onValueChange={setWho} searchable
            options={free.map((c) => ({ value: c.id, label: c.name }))}
            helper={free.length ? "من يملك صلاحيّة مولّد الباركود وحدَهم." : "لا أحد متاحٌ للمشاركة الآن."} />
          <div className="form-full ad-qrs-kind">
            <span className="ad-qrs-k">ما الذي يستطيعه؟</span>
            <FormChoice label="ما الذي يستطيعه الشريك" items={ACCESS} value={access} onChange={(v) => setAccess(v as "read" | "edit")} />
            <p className="ad-qrs-k">{ACCESS_HELP[access]}</p>
          </div>
        </div>
      </Modal>

      <Modal open={partner !== null} onClose={() => setPartner(null)} size="sm" busy={spin("access")} title={partner ? `ما يستطيعه ${partner.name}` : "إذنُ الشريك"}
        footer={(
          <>
            <Button variant="primary" size="md" loading={spin("access")} disabled={!partner || partnerAccess === partner.access}
              onClick={() => partner && run("access", () => setQrShareAccess(link.id, partner.userId, partnerAccess), () => setPartner(null))}>احفظ</Button>
            <Button variant="ghost" size="md" disabled={spin("access")} onClick={() => setPartner(null)}>إلغاء</Button>
          </>
        )}>
        <div className="form-grid">
          <div className="form-full ad-qrs-kind">
            <FormChoice label="ما الذي يستطيعه الشريك" items={ACCESS} value={partnerAccess} onChange={(v) => setPartnerAccess(v as "read" | "edit")} />
            <p className="ad-qrs-k">{ACCESS_HELP[partnerAccess]}</p>
          </div>
          <div className="form-full">
            <AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => { setDropPartner(partner); setPartner(null); }}>أخرِجه من الشركاء</AdButton>
          </div>
        </div>
      </Modal>

      <AdConfirm open={dropWin !== null} onClose={() => setDropWin(null)} tone="danger" icon={<Trash />} title="حذف النافذة؟"
        text={dropWin ? `تُحذف نافذةُ ${targetHost(dropWin.targetUrl)}، فيعود الملصقُ في وقتها إلى وجهته الأصليّة.` : undefined}
        confirmLabel="حذف" loading={spin("dropwin")}
        onConfirm={() => { const w = dropWin; if (w) run("dropwin", () => deleteQrSchedule(w.id, link.id), () => setDropWin(null)); }} />
      <AdConfirm open={dropPartner !== null} onClose={() => setDropPartner(null)} tone="danger" icon={<Trash />} title="إخراجُ الشريك؟"
        text={dropPartner ? `لن يرى ${dropPartner.name} هذا الباركود بعد الآن، ولا يبدّل فيه شيئًا.` : undefined}
        confirmLabel="أخرِجه" loading={spin("dropshare")}
        onConfirm={() => { const p = dropPartner; if (p) run("dropshare", () => unshareQrLink(link.id, p.userId), () => setDropPartner(null)); }} />
      <AdConfirm open={kill} onClose={() => setKill(false)} tone="danger" icon={<Trash />} title="حذف الباركود؟" text={killText(link.title)}
        confirmLabel="حذف" loading={spin("kill")} onConfirm={doKill} />
    </AdRoom>
  );
}
