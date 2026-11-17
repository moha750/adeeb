"use client";

/**
 * **محرّرُ الخبر على قالب «مساحة العمل»** («المنضدة»، اعتُمد على منشئ الاستبيان ٢٠٢٦-١١-١٢) — مختبر ٢٠٢٦-١١-١٣، لم يُعتمد بعد.
 * السلوكُ كلُّه من `useNewsDraft` (استُخرج من `NewsEditorView` حرفًا)، وهذا الملفُّ شكلُه وحده:
 * - **المنضدة** الخبرُ كما سيُنشر (`/frame/news`، صفحةُ الخبر المعتمدة نفسُها بلا تعليقات)، وتنزل إلى الفصل المفتوح.
 * - **لوحان** («الكتابة» و«الإدارة»، قرارُ المالك ٢٠٢٦-٠٩-٢٤) مبدّلًا فوق العمود، وفي الضيّق مواضعَ بجانب «المعاينة».
 * - **حالُ الخبر وفعلُ مرحلته** تنبيهٌ (`AdNote`) فوق اللوحين، وفعلُه (`AdActs`): الفعلُ الأساسيّ باسمه، والبقيّةُ في «المزيد».
 * - **فصولُ المتن قطعٌ** (`WorkBlock`) تُرتَّب بالسحب، كأسئلة الاستبيان. والحقولُ والنوافذُ والسجلّ والفقاعاتُ معتمدةٌ كلُّها.
 * - **قطعتان جديدتان** اعتمدهما محمد ٢٠٢٦-١١-١٣ من اتّجاهين لكلٍّ منهما: منتقي الأشخاص سطورًا (`_ad/people.tsx`) ومعرضُ الصور سطورًا (`_ad/gallery.tsx`).
 */
import { useMemo, useState, type ReactNode } from "react";
import { Button, Modal, Select, Textarea, Field } from "@adeeb/design-system";
import {
  CalendarDots,
  Aperture, Archive, Article, Buildings, Camera, ChatCircleDots, ChatsCircle, ClipboardText, ClockCounterClockwise, Feather, FloppyDisk, Gear,
  Hash, Image as ImageIcon, Images, LinkSimple, Megaphone, Newspaper, PaperPlaneTilt, TextAlignLeft, TextT, UserCircle,
  UserList, Users, UsersThree,
} from "@phosphor-icons/react";
import { ArrowUUpLeft, EyeSlash, PencilSimple, Plus, Star, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { Avatar } from "@/app/dashboard/_components/Avatar";
import type { UnitOption } from "@adeeb/core/org-unit";
import type { CreditPerson } from "@/lib/people";
import { fmtDate, fmtStamp } from "@/lib/dates";
import { sectionsToText } from "@/lib/news/blocks";
import type { LogEntry, MemberOption, NewsDetail } from "@/app/dashboard/news/data";
import type { PublicNews } from "@/app/news/data";
import {
  ASSIGNMENT_META, CATEGORY_META, CATEGORY_OPTIONS, FIELD_META, FIELD_VALUES, GALLERY_MAX, SUMMARY_MAX, TITLE_MAX,
  readingMinutes, wordCount, type Category, type FieldKey,
} from "@/app/dashboard/news/vocab";
import { NEWS_IMAGE_RULE, useNewsDraft } from "@/app/dashboard/news/[id]/useNewsDraft";
import { AdLog, type AdLogEvent } from "../log";
import { AdActs, AdConfirm, AdEmpty, AdIconButton, AdNote, AdButton, type AdTone } from "../primitives";
import { AdLine } from "../account";
import { FormSection, FormToggle, AdImageField } from "../form";
import { SortArea, SortItem } from "../reorder";
import { AdTranscript, type AdTurn } from "../transcript";
import { AdPeoplePicker, type AdPerson } from "../people";
import { AdGallery } from "../gallery";
import { StageFrame, WorkBlock, WorkRoom, useLeaveGuard } from "../workspace";
import { AR_READ_MIN, arCount, type ArForms } from "@/lib/arabicCount";

const AR_EVENT: ArForms = ["حدثٌ واحد", "حدثان", "أحداث", "حدثًا"];
const AR_WORD: ArForms = ["كلمةٌ واحدة", "كلمتان", "كلمات", "كلمةً"];
const AR_PHOTO: ArForms = ["صورةٌ واحدة", "صورتان", "صور", "صورةً"];

/** أفعالُ السجلّ بالعربيّة ونوعُها على الخطّ — كما في المحرّر القديم */
const ACTION_LABEL: Record<string, string> = {
  create: "أُنشئ الخبر", assign: "كُلِّف الطاقم", submit: "رُفع إلى المراجعة", return: "أُعيد إلى الكاتب",
  publish: "نُشِر", unpublish: "أُلغي النشر", archive: "أُرشف", restore: "أُعيد من الأرشيف",
};
const ACTION_KIND: Record<string, { tone: AdTone; icon: ReactNode }> = {
  create: { tone: "ok", icon: <Newspaper /> }, assign: { tone: "info", icon: <UsersThree /> },
  submit: { tone: "info", icon: <PaperPlaneTilt /> }, return: { tone: "info", icon: <ArrowUUpLeft /> },
  publish: { tone: "warn", icon: <Megaphone /> }, unpublish: { tone: "warn", icon: <EyeSlash /> },
  archive: { tone: "warn", icon: <Archive /> }, restore: { tone: "info", icon: <ArrowUUpLeft /> },
};
const UNKNOWN_KIND = { tone: "neutral" as AdTone, icon: <ClockCounterClockwise /> };
const logEvent = (l: LogEntry): AdLogEvent => {
  const k = ACTION_KIND[l.action] ?? UNKNOWN_KIND;
  return { icon: k.icon, tone: k.tone, title: ACTION_LABEL[l.action] ?? l.action, meta: [{ icon: l.userName ? <UserCircle /> : <Gear />, text: `بيد ${l.userName ?? "النظام"}` }] };
};

/** رمزُ كلّ حقلٍ في نافذة التكليف — رمزُه نفسُه في المحرّر */
const FIELD_ICON: Record<FieldKey, ReactNode> = {
  title: <Newspaper />, summary: <TextAlignLeft />, content: <Article />, category: <ClipboardText />, authors: <Feather />,
  image_url: <ImageIcon />, gallery_images: <Images />, cover_photographer: <Camera />, gallery_photographers: <Aperture />,
};

/** رمزُ رأس المجموعة في المنتقي: الأعضاءُ والمتطوّعون */
const groupIcon = (g: string) => (g.includes("متطوّع") ? <UserList /> : <Users />);

export function NewsEditorRoom({
  detail, members, units, people, activities = [], isChief, meId, serverNow, lab,
}: {
  detail: NewsDetail; members: MemberOption[]; units: UnitOption[]; people: CreditPerson[];
  /** الفعاليّاتُ التي يُربط بها الخبر (رئيسُ التحرير) */
  activities?: { value: string; label: string }[];
  isChief: boolean; meId: string; serverNow: number;
  /** مختبر: لا يُحفظ ولا يُرفع ولا يُنفَّذ شيء */
  lab?: boolean;
}) {
  const toast = useToast();
  const d = useNewsDraft(detail, isChief, toast);
  const { row, may, f } = d;
  // الفصلُ الأوّلُ مفتوحٌ عند الفتح، كما كان المحرّرُ القديم
  const [open, setOpen] = useState<string | null>(d.keys[0] ?? null);
  const leave = useLeaveGuard(d.dirty && !d.pending);

  /* ── بِركةُ النسبة بوجوهها (الاسمُ معرّفُها: النسبةُ أسماءٌ لا حسابات) ── */
  const credit = useMemo<AdPerson[]>(() => people.map((p) => ({
    id: p.name, name: p.name, hint: p.hint, group: p.group,
    face: <Avatar name={p.name} src={p.avatarUrl ?? undefined} gender={p.gender} size="xs" />,
  })), [people]);
  const writers = useMemo<AdPerson[]>(() => members.map((m) => ({
    id: m.value, name: m.label, group: "أعضاء أدِيب", hint: m.unit ?? undefined,
    face: <Avatar name={m.label} src={m.avatarUrl ?? undefined} gender={m.gender} size="xs" />,
  })), [members]);

  /* ── المعاينة: الخبرُ كما سيُنشر من المسوّدة لا من القاعدة ── */
  const text = sectionsToText(f.sections);
  const preview: PublicNews = {
    id: row.id, slug: row.slug, title: f.title, summary: f.summary || null, content: text, sections: f.sections,
    category: f.category, cover: row.imageUrl, coverPhotographer: f.coverPhotographer[0] ?? null,
    gallery: detail.galleryImages, galleryPhotographers: detail.galleryPhotographers, authors: f.authors,
    publishedAt: row.publishedAt, dateLabel: fmtDate(row.publishedAt), views: row.views, likes: row.likes,
    featured: row.isFeatured, readMinutes: readingMinutes(text),
  };
  const openIdx = open ? d.keys.indexOf(open) : -1;
  const focus = openIdx >= 0 ? openIdx : null;
  const stage = <StageFrame src="/frame/news" kind="news" payload={{ n: preview, focus }} title="الخبر كما سيُنشر" />;

  /* ── الحفظ ── */
  const save = () => {
    if (lab) { toast.success("مختبر: لا يُحفظ شيءٌ من هنا."); return; }
    d.save();
  };
  const commit = {
    primary: { label: "حفظ التغييرات", icon: <FloppyDisk />, onClick: save, busy: d.pending, held: !d.dirty || d.tooLong || !d.mayAny },
    cancelHref: "/dashboard/news", dirty: d.dirty,
  };
  const guard = (fn: () => void) => () => (lab ? toast.success("مختبر: لا يُنفَّذ شيءٌ من هنا.") : fn());

  /* ── حالُ الخبر وفعلُ مرحلته ── */
  const stageNote = (() => {
    const wf = row.workflow;
    const ops = isChief ? [
      ...(wf === "ready_for_review" ? [{ key: "return", label: "إعادة بملاحظة", icon: <ArrowUUpLeft />, onClick: () => { d.setReturnNotes(""); d.setReturnOpen(true); } }] : []),
      ...(wf === "published" ? [{ key: "unpublish", label: "إلغاء النشر", icon: <EyeSlash />, onClick: guard(d.unpublish) }] : []),
      { key: "feature", label: row.isFeatured ? "إلغاء التمييز" : "تمييز", icon: <Star />, onClick: guard(d.feature) },
      ...(wf === "archived"
        ? [{ key: "restore", label: "إعادة من الأرشيف", icon: <ArrowUUpLeft />, onClick: guard(d.restore) }]
        : [{ key: "archive", label: "أرشفة", icon: <Archive />, onClick: guard(d.archive), danger: true }]),
    ] : [];
    const primary = d.canSubmit && !isChief
      ? { label: "رفع إلى المراجعة", icon: <PaperPlaneTilt />, onClick: guard(d.submit), busy: d.pending }
      : isChief && wf !== "published"
        ? { label: "نشر", icon: <Megaphone />, onClick: guard(d.publish), busy: d.pending }
        : null;
    // المنشورُ عند رئيس التحرير: فعلُه الأوّلُ من «المزيد» (إلغاءُ النشر)، والبقيّةُ تبقى فيه
    const first = primary ?? (ops.length ? { ...ops[0], busy: d.pending } : null);
    const rest = primary ? ops : ops.slice(1);
    // في التنبيه فعلُه صندوقٌ بختم لونه (`inRow`: الأساسيُّ ينزل درجة) — قطعةُ اللوح المصمتة تنافس ختمَ التنبيه نفسَه
    const action = first ? <AdActs inRow primary={first} ops={rest} /> : null;
    const gaps = isChief && d.gaps.length ? `ينقصه للنشر: ${d.gaps.join("، ")}.` : null;
    if (row.rejectionReason && wf === "in_progress")
      return <AdNote tone="bad" label={d.meta.label} title="أُعيد إليك مع ملاحظة" action={action}>{gaps ? `${row.rejectionReason} ${gaps}` : row.rejectionReason}</AdNote>;
    if (wf === "ready_for_review" && isChief)
      return <AdNote tone="warn" label={d.meta.label} title="ينتظر مراجعتك" action={action}>{`رفعه الكاتب في ${fmtStamp(detail.submittedAt)}. اقرأه ثمّ أعِده بملاحظة أو انشره.${gaps ? ` ${gaps}` : ""}`}</AdNote>;
    if (wf === "ready_for_review")
      return <AdNote tone="info" label={d.meta.label} title="رُفع إلى المراجعة" action={action}>عند رئيس التحرير الآن. ستُخطَر إن أُعيد إليك بملاحظة.</AdNote>;
    return <AdNote tone={wf === "published" ? "ok" : "info"} label="حال الخبر" title={d.meta.label} action={action}>{gaps ?? d.meta.hint}</AdNote>;
  })();

  /* ── اللوح الأوّل: الكتابة ── */
  const ro = (label: string, value: string, icon: ReactNode, multi?: boolean) => multi
    ? <Textarea className="form-full" label={label} icon={icon} innerIcon={null} placeholder="" value={value} rows={3} disabled helper="لم تُكلَّف به" onChange={() => {}} />
    : <Field className="form-full" label={label} icon={icon} innerIcon={null} placeholder="" value={value} disabled helper="لم تُكلَّف به" onChange={() => {}} />;

  const go = (key: string) => setOpen((o) => (o === key ? null : key));
  const words = wordCount(text);
  const blocks = (
    <div className="ad-wblks">
      <SortArea list ids={d.keys} total={d.keys.length} nameOf={(k) => f.sections[d.keys.indexOf(k)]?.heading || "فصلٌ بلا عنوان"}
        placeOf={(k) => d.keys.indexOf(k) + 1} onMove={(from, to) => d.moveSection(d.keys.indexOf(from), d.keys.indexOf(to))}>
        {d.keys.map((k, i) => {
          const s = f.sections[i];
          const n = wordCount(s.body);
          return (
            <div key={k} id={`s-${k}`} className="ad-wblk-slot">
            <SortItem id={k} label={s.heading?.trim() || "فصلٌ بلا عنوان"} n={i + 1} on prev={i > 0} next={i < d.keys.length - 1}
              onStep={(dir) => d.moveSection(i, i + dir)}>
              <WorkBlock n={i + 1} title={s.heading?.trim() || "فصلٌ بلا عنوان"} untitled={!s.heading?.trim()}
                sub={n ? arCount(n, AR_WORD) : undefined} warn={open === k || s.body.trim() ? undefined : "لم يُكتب متنُه"}
                open={open === k} onToggle={() => go(k)}
                acts={<AdButton variant="danger" size="sm" icon={<Trash />} onClick={() => { d.dropSection(i); if (open === k) setOpen(null); }}>حذف</AdButton>}>
                {/* **لا فصلَ بلا عنوان** (محمد ٢٠٢٦-١١-١٧): كان «اتركه فارغًا لفصلٍ بلا عنوان» اختياريًّا، فصار مطلوبًا — والنشرُ يقول ما ينقصه */}
                <Field className="form-full" label="عنوان الفصل" icon={<TextT />} innerIcon={<PencilSimple />} placeholder="عنوانٌ قصيرٌ للفصل"
                  value={s.heading ?? ""} onChange={(e) => d.setSection(i, { heading: e.target.value })} required />
                <Textarea className="form-full" label="المتن" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} rows={8} placeholder="نصّ الفصل…"
                  value={s.body} onChange={(e) => d.setSection(i, { body: e.target.value })}
                  helper="ابدأ السطرَ بـ• ليصير بندًا، وضع الكلامَ بين علامتَي تنصيصٍ ليصير اقتباسًا." />
              </WorkBlock>
            </SortItem>
            </div>
          );
        })}
      </SortArea>
    </div>
  );

  const writing = (
    <>
      <FormSection icon={<Newspaper />} title="الترويسة" sub="العنوانُ والملخّص كما يظهران في رأس الخبر وبطاقته">
        <div className="form-grid">
          {may("title") ? (
            <Field className="form-full" label="العنوان" icon={<Newspaper />} innerIcon={<PencilSimple />} placeholder="مشاركة أدِيب في…"
              required count={{ max: TITLE_MAX }} value={f.title} onChange={(e) => d.edit({ title: e.target.value })}
              helper="وما زاد يأخذ سطرًا رابعًا في صفحة الخبر على الجوّال." />
          ) : ro("العنوان", row.title, <Newspaper />)}
          {may("summary") ? (
            <Textarea className="form-full" label="الملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} rows={2} required
              count={{ max: SUMMARY_MAX }} placeholder="سطران يُغريان بالقراءة، يظهران في بطاقة الخبر."
              value={f.summary} onChange={(e) => d.edit({ summary: e.target.value })}
              helper="وهو عنوانٌ فرعيٌّ يظهر تحت العنوان في رأس الخبر، وفي بطاقته، وفي معاينة رابطه حين يُشارَك." />
          ) : ro("الملخّص", row.summary ?? "—", <TextAlignLeft />, true)}
        </div>
      </FormSection>

      <FormSection id="body" icon={<TextAlignLeft />} title="المتن"
        sub={words ? `${arCount(words, AR_WORD)}، ${arCount(readingMinutes(text), AR_READ_MIN)}` : "لم يُكتب شيءٌ بعد"}>
        {may("content") ? (
          <>
            {f.sections.length ? blocks : <AdEmpty icon={<TextAlignLeft />} title="لا فصول بعد" desc="أضف الفصلَ الأوّل، وعنوانُه اختياريّ: صدرُ الخبر يُفتتح كثيرًا بفقرةٍ بلا عنوان." />}
            <span className="ad-wblks-add">
              <AdButton variant="fill" icon={<Plus />} onClick={() => setOpen(d.addSection())}>إضافة فصل</AdButton>
            </span>
          </>
        ) : ro("المتن", row.content ?? "—", <TextAlignLeft />, true)}
      </FormSection>

      <FormSection icon={<ImageIcon />} title="صورة الغلاف" mark="required">
        {may("image_url") ? (
          <AdImageField bare label="صورة الغلاف" icon={<ImageIcon />} required value={row.imageUrl}
            onFile={(file) => (lab ? toast.success("مختبر: لا يُرفع شيءٌ من هنا.") : d.onCover(file))}
            onClear={() => d.setConfirmCover(true)} busy={d.uploading > 0} accept={NEWS_IMAGE_RULE.accept} alt="غلاف الخبر"
            help="يُحفظ لحظةَ رفعه." />
        ) : row.imageUrl ? (
          // يُعرض ولا يُبدَّل: صورةُ حقل الرفع نفسُها بلا فعلَيها (لم يُكلَّف بها)
          <div className="ad-up form-full" data-look="a" data-shape="wide" data-bare="" data-full="">
            <div className="ad-up-well">
              <figure className="ad-up-view">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.imageUrl} alt="غلاف الخبر" referrerPolicy="no-referrer" />
              </figure>
            </div>
            <span className="ad-up-help">لم تُكلَّف برفعه.</span>
          </div>
        ) : <AdEmpty icon={<ImageIcon />} title="لا غلاف" desc="ولم تُكلَّف برفعه." />}
        {row.imageUrl && may("cover_photographer") ? (
          <AdPeoplePicker single free required label="مصوّر الغلاف" icon={<Camera />} roleIcon={<Camera />} groupIcon={groupIcon}
            people={credit} value={f.coverPhotographer} onChange={(v) => d.edit({ coverPhotographer: v })}
            placeholder="ابحث في أهل أدِيب أو اكتب اسمًا" />
        ) : null}
      </FormSection>

      <FormSection icon={<Images />} title="معرض الصور"
        sub={detail.galleryImages.length > GALLERY_MAX
          ? `${arCount(detail.galleryImages.length, AR_PHOTO)}، والحدُّ ${GALLERY_MAX}: احذف ما زاد`
          : detail.galleryImages.length
            ? detail.galleryImages.length >= GALLERY_MAX
              ? `${arCount(detail.galleryImages.length, AR_PHOTO)} من ${GALLERY_MAX}، اكتمل المعرض`
              : `${arCount(detail.galleryImages.length, AR_PHOTO)} من ${GALLERY_MAX}، وتُنسب عند رفعها إلى مصوّر الغلاف`
            : `حتى ${GALLERY_MAX} صور، تظهر بعد المتن في صفحة الخبر`}>
        {detail.galleryImages.length || may("gallery_images") ? (
          <AdGallery images={detail.galleryImages} photographers={detail.galleryPhotographers}
            editable={may("gallery_images")} credits={may("gallery_photographers")} onCredit={d.openShoot} max={GALLERY_MAX} busy={d.uploading} accept={NEWS_IMAGE_RULE.accept} title={f.title}
            onFiles={(files) => (lab ? toast.success("مختبر: لا يُرفع شيءٌ من هنا.") : d.onGallery(files))} onRemove={(i) => d.setKillImage(i)} />
        ) : <AdEmpty icon={<Images />} title="لا صور في المعرض" desc="ولم تُكلَّف بها." />}
      </FormSection>

      <FormSection icon={<ClipboardText />} title="تفاصيل النشر" sub="الكتّاب والقسم">
        <div className="form-grid">
          {may("authors") ? (
            <AdPeoplePicker free label="الكتّاب" icon={<Users />} roleIcon={<Feather />} groupIcon={groupIcon} lead="يظهر في البطاقة"
              people={credit} value={f.authors} onChange={(v) => d.edit({ authors: v })} placeholder="ابحث في أهل أدِيب أو اكتب اسمًا"
              helper="أوّلهم هو الكاتب المعروض في البطاقة. واسمُ من ليس من أدِيب يُكتب كما هو." />
          ) : ro("الكتّاب", row.authors.join("، ") || "—", <Users />)}
          {may("category") ? (
            <Select label="القسم" icon={<ClipboardText />} options={CATEGORY_OPTIONS} value={f.category} onValueChange={(v) => d.edit({ category: v as Category })} />
          ) : ro("القسم", CATEGORY_META[row.category].label, <ClipboardText />)}
        </div>
      </FormSection>
    </>
  );

  /** **الجهةُ والرابط إدارةٌ لا كتابة** (محمد ٢٠٢٦-١١-١٣: الكاتبُ لا يعنيه رابطُ المعرّف، وقد لا يعرف معناه): كانا في «تفاصيل النشر»
   *  بين الكتّاب والقسم. ولرئيس التحرير وحده تحريرُهما كما كان؛ والكاتبُ يرى الجهةَ قراءةً */
  const unitAndLink = (
    <FormSection icon={<Buildings />} title={isChief ? "الجهة والرابط" : "الجهة"} sub={isChief ? "إلى من يُنسب الخبر، وما يظهر في رابطه" : "إلى من يُنسب الخبر"}>
      <div className="form-grid">
        {isChief ? (
          <Select className="form-full" label="الجهة" icon={<Buildings />} options={units} searchable value={f.unit} onValueChange={(v) => d.edit({ unit: v })} />
        ) : ro("الجهة", row.unitName, <Buildings />)}
        {isChief ? (
          <Select className="form-full" label="فعاليّة الخبر" icon={<CalendarDots />} options={activities} searchable value={f.activityId} onValueChange={(v) => d.edit({ activityId: v })}
            helper="خبرُ تغطيةٍ لفعاليّة؟ اربطه بها فتدلّ صفحتُها المنتهيةُ عليه." optional />
        ) : null}
        {isChief ? (
          <Field className="form-full" label="المعرّف (رابط الخبر)" icon={<LinkSimple />} innerIcon={<Hash />} placeholder="news-…"
            value={f.slug} onChange={(e) => d.edit({ slug: e.target.value })}
            helper="يظهر في رابط الخبر العامّ. لا تغيّره بعد النشر: روابطه منشورةٌ في الخارج." />
        ) : null}
      </div>
    </FormSection>
  );

  /* ── اللوح الثاني: الإدارة ── */
  const turns: AdTurn[] = detail.comments.map((c) => ({
    id: c.id, side: c.userId === meId ? "us" : "them", who: c.userName, when: fmtStamp(c.createdAt), text: c.text,
    face: <Avatar name={c.userName} src={c.avatarUrl ?? undefined} gender={c.gender} size="sm" />,
    // الحذفُ في الفقاعة رمزٌ هادئ لا ختمُ خطر: الحوارُ ليس قائمةَ حذف، والأحمرُ في كلّ فقاعةٍ يصير أعلى ما في الصفحة صوتًا (المراجع ٢٠٢٦-١١-١٣)
    act: c.userId === meId || isChief ? <AdIconButton label="حذف التعليق" icon={<Trash />} onClick={guard(() => d.dropComment(c.id))} /> : undefined,
  }));
  const publicTurns: AdTurn[] = detail.publicComments.map((c) => ({
    id: c.id, side: "them", who: c.who, when: fmtStamp(c.createdAt), text: c.content,
    face: <Avatar name={c.who} size="sm" />,
    flag: [c.isGuest ? "زائر" : null, c.isApproved ? null : "غير منشور"].filter(Boolean).join("، ") || undefined,
    act: <AdIconButton label="حذف التعليق" icon={<Trash />} onClick={() => d.setKillComment(c.id)} />,
    muted: !c.isApproved,
  }));

  const managing = (
    <>
      {isChief ? (
        <FormSection icon={<UsersThree />} title="الطاقم" sub="من يكتب هذا الخبر، وأيّ الحقول يملك تحريرها"
          act={<AdButton variant="soft" size="sm" icon={<UsersThree />} onClick={() => d.setAssignOpen(true)}>{detail.assignments.length ? "تعديل التكليف" : "تكليف كاتب"}</AdButton>}>
          {detail.assignments.length ? (
            <ul className="ad-lines">
              {detail.assignments.map((a) => {
                const m = ASSIGNMENT_META[a.status];
                return (
                  <AdLine key={a.writerId} icon={<Feather />} k={m.label} v={a.writerName}
                    tone={m.tone === "danger" ? "bad" : m.tone === "success" ? "ok" : undefined} toneAt="sub"
                    sub={[a.fields.map((x) => FIELD_META[x as FieldKey]?.label ?? x).join("، ") || "بلا حقول", a.notes].filter(Boolean).join("، ")} />
                );
              })}
            </ul>
          ) : <AdEmpty icon={<UsersThree />} title="بلا طاقم" desc="كلّف كاتبًا: يُفتح له الخبر في غرفته، ويحرّر ما أسندتَه إليه وحده." />}
        </FormSection>
      ) : null}

      {unitAndLink}

      <FormSection icon={<ChatCircleDots />} title="حديث الغرفة" sub="ملاحظاتُ الطاقم، لا يراها الجمهور">
        {turns.length ? <AdTranscript bare icon={<ChatCircleDots />} title="حديث الغرفة" turns={turns} /> : null}
        <div className="form-grid">
          <Textarea className="form-full" label="ملاحظة للطاقم" icon={<ChatCircleDots />} innerIcon={<PencilSimple />} rows={3}
            placeholder={turns.length ? "اكتب ردًّا…" : "غرفةٌ هادئة. اكتب أوّل ملاحظةٍ للطاقم."} value={d.comment} onChange={(e) => d.setComment(e.target.value)} />
        </div>
        <span className="ad-tsc-send">
          <AdButton variant="line" icon={<PaperPlaneTilt />} onClick={guard(d.sendComment)} busy={d.pending} held={!d.comment.trim()}>إرسال</AdButton>
        </span>
      </FormSection>

      {isChief ? (
        <FormSection icon={<ChatsCircle />} title="تعليقات الجمهور" sub="تُنشر لحظتَها، ويُحذف هنا ما لا يليق">
          {publicTurns.length ? <AdTranscript bare icon={<ChatsCircle />} title="تعليقات الجمهور" turns={publicTurns} />
            : <AdEmpty icon={<ChatsCircle />} title="لا تعليقات من الجمهور" desc="ما وصل تعليقٌ على هذا الخبر بعد." />}
        </FormSection>
      ) : null}

      <FormSection icon={<ClockCounterClockwise />} title="السجلّ" sub="ما جرى للخبر، الأحدثُ أوّلًا">
        {detail.log.length ? <AdLog<LogEntry> bare items={detail.log} at={(l) => l.createdAt} idOf={(l) => l.id} event={logEvent}
          same={(a, b) => a.action === b.action && a.userName === b.userName} noun={AR_EVENT} now={serverNow}
          empty={{ title: "لا سجلّ بعد", text: "يُكتب السجلّ عند كلّ تحوّلٍ في حالة الخبر." }} />
          : <AdEmpty icon={<ClockCounterClockwise />} title="لا سجلّ بعد" desc="يُكتب السجلّ عند كلّ تحوّلٍ في حالة الخبر." />}
      </FormSection>
    </>
  );

  const title = `تحرير: ${f.title.trim() || row.title}`;
  return (
    <>
      <WorkRoom look="b" path={`/dashboard/news/${row.id}`} title={title} commit={commit} stage={stage} stageTitle="الخبر كما سيُنشر"
        lead={stageNote}
        panes={[{ key: "write", label: "الكتابة", node: writing }, { key: "manage", label: "الإدارة", node: managing }]} />

      {/* ── نافذة التكليف ── */}
      <Modal open={d.assignOpen} onClose={() => d.setAssignOpen(false)} title="تكليف الطاقم" description="من يكتب هذا الخبر، وأيّ الحقول يملك تحريرها."
        busy={d.pending} size="md"
        footer={<>
          <Button variant="primary" size="md" loading={d.pending} onClick={guard(d.saveAssign)}>حفظ التكليف</Button>
          <Button variant="ghost" size="md" onClick={() => d.setAssignOpen(false)} disabled={d.pending}>إلغاء</Button>
        </>}>
        <AdPeoplePicker label="الكتّاب" icon={<Users />} roleIcon={<Feather />} groupIcon={groupIcon} people={writers} value={d.aWriters}
          onChange={d.setAWriters} placeholder="ابحث في أعضاء أدِيب" />
        {FIELD_VALUES.map((k) => (
          <FormToggle key={k} icon={FIELD_ICON[k]} label={FIELD_META[k].label}
            checked={d.aFields.includes(k)} onChange={(on) => d.setAFields((p) => (on ? [...p, k] : p.filter((x) => x !== k)))} />
        ))}
        <Textarea label="ملاحظة التكليف" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} rows={3} placeholder="ما المطلوب من الكاتب تحديدًا…"
          value={d.aNotes} onChange={(e) => d.setANotes(e.target.value)} optional />
      </Modal>

      {/* ── نافذة الإعادة ── */}
      <Modal open={d.returnOpen} onClose={() => d.setReturnOpen(false)} title="إعادة إلى الكاتب" description="الملاحظة شرطٌ لا خيار: الإعادة بلا سببٍ لا تُفيد الكاتب."
        busy={d.pending} size="md"
        footer={<>
          <Button variant="primary" size="md" loading={d.pending} disabled={!d.returnNotes.trim()} onClick={guard(d.sendReturn)}>إعادة</Button>
          <Button variant="ghost" size="md" onClick={() => d.setReturnOpen(false)} disabled={d.pending}>إلغاء</Button>
        </>}>
        <Textarea label="ما ينبغي تعديله" icon={<ArrowUUpLeft />} innerIcon={<PencilSimple />} rows={5} placeholder="اذكر ما ينقص المادّة بوضوح…"
          value={d.returnNotes} onChange={(e) => d.setReturnNotes(e.target.value)} required />
      </Modal>

      {/* ── نافذة مصوّر الصورة ── */}
      <Modal open={d.shootAt !== null} onClose={() => d.setShootAt(null)} title={`مصوّر الصورة ${(d.shootAt ?? 0) + 1}`}
        description="يُكتب على الصورة في معرض الخبر بعد «عدسة»، ويُحفظ لحظتَه." busy={d.pending} size="md"
        footer={<>
          <Button variant="primary" size="md" loading={d.pending} onClick={guard(d.saveShoot)}>حفظ</Button>
          <Button variant="ghost" size="md" onClick={() => d.setShootAt(null)} disabled={d.pending}>إلغاء</Button>
        </>}>
        <AdPeoplePicker single free label="المصوّر" icon={<Camera />} roleIcon={<Camera />} groupIcon={groupIcon}
          people={credit} value={d.shootName} onChange={d.setShootName} placeholder="ابحث في أهل أدِيب أو اكتب اسمًا" optional
          helper="اتركه فارغًا لصورةٍ بلا نسبة." />
      </Modal>

      <AdConfirm open={d.confirmCover} onClose={() => d.setConfirmCover(false)} tone="danger" icon={<Trash />} title="حذف الغلاف؟"
        text="سيُحذف الملفّ من المخزن ولا يُسترجع. ولا يُنشَر الخبر بلا غلاف." confirmLabel="حذف" loading={d.pending} onConfirm={guard(d.killCover)} />
      <AdConfirm open={d.killImage !== null} onClose={() => d.setKillImage(null)} tone="danger" icon={<Trash />} title="حذف الصورة؟"
        text="سيُحذف الملفّ من المخزن ولا يُسترجع." confirmLabel="حذف" loading={d.pending} onConfirm={guard(d.dropImage)} />
      <AdConfirm open={d.killComment !== null} onClose={() => d.setKillComment(null)} tone="danger" icon={<Trash />} title="حذف التعليق؟"
        text="يُحذف نهائيًّا ومعه إعجاباته." confirmLabel="حذف" loading={d.pending} onConfirm={guard(d.dropPublic)} />
      {leave}
    </>
  );
}
