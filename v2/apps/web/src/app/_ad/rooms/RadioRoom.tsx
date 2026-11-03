"use client";

/**
 * غرفةُ برامج الإذاعة على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٢) — السلوكُ سلوكُ `radio/RadioView.tsx` القديم:
 * البحثُ باسم البرنامج ومعرّفه ومقدّمه، والترتيبُ بالاسم وعدد الحلقات، والإنشاءُ وتعديلُ البيانات في نافذةٍ واحدة (وبعد الإنشاء
 * يُفتح المحرّر)، والنشرُ وإلغاؤه، والتمييزُ في الواجهة، والأرشفة، والحذفُ بتأكيد. والنقرُ على البرنامج يفتح محرّرَ حلقاته وشعاره.
 * و«هويّةُ الإذاعة» — كانت تبويبًا ثانيًا بجانب «البرامج» — فعلٌ هادئٌ على اللوح يفتح نموذجَها نفسَه (`radio/StationForm.tsx`)
 * في نافذة: القالبُ مواضعُه سجلّاتٌ لا نماذج.
 * والفرقُ في الشكل: مواضعُ بحال البرنامج مكانَ مرشّح الحالة وكاردَي الإحصاء، وكروتٌ بشعاراتها، وأفعالٌ ظاهرة.
 */
import type { RoomView } from "../view";
import { RADIO_ROOM } from "./radio.meta";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Select, Textarea, matchesSearch } from "@adeeb/design-system";
import {
  Archive, Broadcast, Hash, ImageBroken, LinkSimple, Megaphone, MicrophoneStage, Palette, Playlist, Radio, TextAlignLeft, User,
  UsersThree, Waveform,
} from "@phosphor-icons/react";
import { EyeSlash, PencilSimple, Plus, Star, Trash } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import type { MemberOption, ShowRow, StationData } from "@/app/dashboard/radio/data";
import { SHOW_STATUS_META, TONE_OPTIONS, formatTalkStart, parseTalkStart, slugify, type ShowTone } from "@/app/dashboard/radio/vocab";
import { createShow, deleteShow, setShowStatus, toggleShowFeatured, updateShow } from "@/app/dashboard/radio/actions";
import { StationForm } from "@/app/dashboard/radio/StationForm";
import { AdActs, AdBadge, AdButton, AdCard, AdConfirm, AdRow, type AdFigure, type AdMeta, type AdOp, type AdTone } from "../primitives";
import { CollectionRoom, type Position } from "../collection";
import { fmtNum } from "../format";
import { arCounted, type ArForms } from "@/lib/arabicCount";

const AR_SHOW: ArForms = ["برنامجٌ واحد", "برنامجان", "برامج", "برنامجًا"];
/** المعدودُ تحت رقم الكعب: «1 حلقة»، «2 حلقتان»، «5 حلقات»، «12 حلقةً». */
const AR_EPISODE: ArForms = ["حلقة", "حلقتان", "حلقات", "حلقةً"];

const TONE: Record<string, AdTone> = { success: "ok", info: "info", neutral: "neutral" };

type FormState = {
  title: string; slug: string; tagline: string; description: string;
  tone: ShowTone; hostId: string; committeeId: string; talkStart: string;
};
const EMPTY_FORM: FormState = {
  title: "", slug: "", tagline: "", description: "", tone: "brand", hostId: "", committeeId: "", talkStart: "",
};

/**
 * **مواضعُ الإذاعة بحال البرنامج** (على قاعدة المكتبة ورسائل التواصل): كان فوق القائمة القديمة كاردا إحصاء («إجمالي البرامج»،
 * «برامج منشورة») ومرشّحُ حالٍ بخياراته الثلاثة — فصارت مواضعَ بأعدادها. و«إجمالي الحلقات» مجموعٌ لا حال: مكانُه صفحةُ الإحصاء.
 */
const POSITIONS: Position<ShowRow>[] = [
  { key: "all", label: "الكلّ", match: () => true, empty: "لا برامج بعد." },
  { key: "published", label: "منشور", match: (s) => s.status === "published", empty: "لم يُنشَر برنامجٌ بعد." },
  { key: "draft", label: "مسودّة", match: (s) => s.status === "draft", empty: "لا مسودّات.", canCreate: true },
  { key: "archived", label: "مؤرشف", match: (s) => s.status === "archived", empty: "الأرشيف فارغ.", rare: true },
];

export function RadioRoom({
  shows, members, committees, station, view,
}: { shows: ShowRow[]; members: MemberOption[]; committees: MemberOption[]; station: StationData | null; serverNow: number; view?: RoomView }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  // نافذة البيانات: null مغلقة، كائن مفتوحة (edit=null للإنشاء)
  const [form, setForm] = useState<{ edit: ShowRow | null; state: FormState; slugTouched: boolean } | null>(null);
  const [formErr, setFormErr] = useState<Partial<Record<keyof FormState, string>>>({});
  const [kill, setKill] = useState<ShowRow | null>(null);
  const [stationOpen, setStationOpen] = useState(false);

  const editorOf = (s: ShowRow) => `/dashboard/radio/${s.id}`;

  const openCreate = () => { setForm({ edit: null, state: EMPTY_FORM, slugTouched: false }); setFormErr({}); };
  const openEditMeta = (s: ShowRow) => {
    setForm({
      edit: s, slugTouched: true,
      state: {
        title: s.title, slug: s.slug, tagline: s.tagline ?? "", description: s.description ?? "",
        tone: s.tone, hostId: s.hostId, committeeId: s.committeeId ? String(s.committeeId) : "",
        talkStart: formatTalkStart(s.talkStartsAt),
      },
    });
    setFormErr({});
  };

  const patchForm = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, state: { ...f.state, ...patch } } : f));
  const onTitle = (v: string) => setForm((f) => {
    if (!f) return f;
    const next = { ...f.state, title: v };
    if (!f.slugTouched) next.slug = slugify(v); // اقتراح السلاگ ما لم يُحرَّر يدويًّا
    return { ...f, state: next };
  });
  const onSlug = (v: string) => setForm((f) => (f ? { ...f, slugTouched: true, state: { ...f.state, slug: v } } : f));

  const submit = () => {
    if (!form) return;
    const s = form.state;
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!s.title.trim()) errs.title = "اسم البرنامج مطلوب.";
    if (!slugify(s.slug)) errs.slug = "المعرّف مطلوب: أحرف لاتينيّة وأرقام.";
    if (!s.hostId) errs.hostId = "اختر مقدّم البرنامج.";
    const talkStart = parseTalkStart(s.talkStart);
    if (talkStart === null || Number.isNaN(talkStart)) {
      errs.talkStart = "مطلوبة: ثوانٍ مثل 10.633 أو توقيتُ المحرّر مثل 0:00:10:19.";
    }
    setFormErr(errs);
    if (Object.keys(errs).length || talkStart === null || Number.isNaN(talkStart)) return;

    const input = {
      title: s.title, slug: s.slug, tagline: s.tagline || null, description: s.description || null,
      tone: s.tone, hostId: s.hostId, committeeId: s.committeeId ? Number(s.committeeId) : null,
      talkStartsAt: talkStart,
    };
    start(async () => {
      const r = form.edit ? await updateShow(form.edit.id, input) : await createShow(input);
      if (r.ok) {
        toast.success(r.message);
        setForm(null);
        router.refresh();
        if (!form.edit && r.id) router.push(`/dashboard/radio/${r.id}`); // بعد الإنشاء: افتح المحرّر مباشرةً
      } else toast.error(r.message);
    });
  };

  const run = (fn: () => Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    });

  /** أفعالُ الحال بترتيب القائمة القديمة: النشرُ أو إلغاؤه، والتمييزُ في الواجهة، والأرشفةُ لغير المؤرشف، والحذفُ آخرُها. */
  const stateOps = (s: ShowRow): AdOp[] => [
    s.status === "published"
      ? { key: "pub", label: "إلغاء النشر", icon: <EyeSlash />, onClick: () => run(() => setShowStatus(s.id, "unpublish")) }
      : { key: "pub", label: "نشر", icon: <Megaphone />, onClick: () => run(() => setShowStatus(s.id, "publish")) },
    { key: "star", label: s.isFeatured ? "إلغاء التمييز" : "تمييز في الواجهة", icon: <Star />, onClick: () => run(() => toggleShowFeatured(s.id, !s.isFeatured)) },
    ...(s.status === "archived" ? [] : [{ key: "arc", label: "أرشفة", icon: <Archive />, onClick: () => run(() => setShowStatus(s.id, "archive")) }]),
    { key: "del", label: "حذف", icon: <Trash />, onClick: () => setKill(s), danger: true },
  ];

  /** الأساسيُّ محرّرُ الحلقات والشعار (وجهةُ النقر على الصفّ والكرت في القديمة)، ثمّ تعديلُ البيانات، ثمّ أفعالُ الحال. */
  const acts = (s: ShowRow, inRow?: boolean) => (
    <AdActs
      inRow={inRow}
      primary={{ label: "الحلقات والشعار", icon: <Playlist />, href: editorOf(s) }}
      ops={[{ key: "meta", label: "تعديل البيانات", icon: <PencilSimple />, onClick: () => openEditMeta(s) }, ...stateOps(s).map((o) => ({ ...o, disabled: pending }))]}
    />
  );

  /**
   * **مصدرٌ واحدٌ للكرت والسطر**: «مميّز» بنجمته (كانت نجمةً بجانب الاسم) والحالُ رقاقتان، ثمّ المعرّفُ والمقدّمُ سطران (كانا
   * تحت الاسم في الكرت القديم، والمقدّمُ عمودًا في الجدول)، و«الشعار ناقص» سطرًا بلونه (كان شارةً في الكرت وعمودًا في الجدول —
   * والكعبُ الخالي لا يقوله وحده). والكعبُ عددُ الحلقات ومعدودُه على شعار البرنامج (وبلا شعارٍ قماشُ اللوح)، والمنشورُ منها رقمٌ
   * بشريطه في الكرت وعمودٌ في السطر.
   */
  const chips = (s: ShowRow) => (
    <>
      {s.isFeatured && <AdBadge icon={<Star />}>مميّز</AdBadge>}
      <AdBadge tone={TONE[SHOW_STATUS_META[s.status].tone]}>{SHOW_STATUS_META[s.status].label}</AdBadge>
    </>
  );
  // المعرّفُ لاتينيٌّ بين عازلَي الاتّجاه: بلا عزلٍ تُلحق الخوارزميّةُ الشرطةَ بطرفه الآخر
  const info = (s: ShowRow): AdMeta[] => [
    { icon: <LinkSimple />, text: `/${s.slug}`, ltr: true },
    { icon: <User />, text: s.hostName },
    ...(!s.logoUrl ? [{ icon: <ImageBroken />, text: "الشعار ناقص", tone: "warn" as const }] : []),
  ];
  const stubOf = (s: ShowRow) => ({ big: fmtNum(s.episodeCount), small: arCounted(s.episodeCount, AR_EPISODE) });
  const look = (s: ShowRow) => (s.logoUrl ? { cover: s.logoUrl } : { seed: s.id });
  const figures = (s: ShowRow): AdFigure[] => [
    { icon: <Broadcast />, value: fmtNum(s.publishedCount), label: "المنشورة", of: { now: s.publishedCount, max: s.episodeCount } },
  ];

  const memberOptions = useMemo(() => members.map((m) => ({ value: m.value, label: m.label })), [members]);
  const committeeOptions = useMemo(
    () => [{ value: "", label: "بلا لجنة" }, ...committees.map((c) => ({ value: c.value, label: c.label }))],
    [committees],
  );

  const create = <AdButton variant="fill" icon={<Plus />} onClick={openCreate}>برنامج جديد</AdButton>;

  return (
    <>
      <CollectionRoom<ShowRow>
        navPath={RADIO_ROOM.navPath}
        title={RADIO_ROOM.title}
        action={{ label: "برنامج جديد", icon: <Plus />, onClick: openCreate }}
        // «هويّة الإذاعة» كانت التبويبَ الثاني بجانب «البرامج»: فعلٌ ثانٍ للغرفة كلّها على اللوح، يفتح نموذجَها كما كان
        extra={{ label: "هويّة الإذاعة", icon: <Radio />, onClick: () => setStationOpen(true) }}
        noun={AR_SHOW}
        items={shows}
        positions={POSITIONS}
        defaultPosition="all"
        searchPlaceholder="ابحث باسم البرنامج أو معرّفه أو مقدّمه…"
        matchSearch={(s, q) => matchesSearch(q, s.title, s.slug, s.hostName)}
        viewKey={RADIO_ROOM.viewKey}
        initialView={view}
        idOf={(s) => s.id}
        table={{
          // الترتيبُ من رأس العمود كما كان في الجدول القديم: الاسم، والحلقات (الكعب)
          head: "البرنامج",
          headSortBy: (s) => s.title.toLowerCase(),
          stub: { key: "episodes", label: "الحلقات", icon: <Playlist />, sortBy: (s) => s.episodeCount },
          columns: [{ key: "published", label: "المنشورة", icon: <Broadcast />, wide: true }],
        }}
        emptyAll={{ title: "لا برامج بعد", desc: "أنشئ أوّل برنامج: يُحفظ مسودّةً، ثمّ تفتحه لترفع شعاره وتضيف حلقاته." }}
        createAction={create}
        renderCard={(s) => (
          <AdCard
            key={s.id}
            {...look(s)}
            stub={stubOf(s)}
            chips={chips(s)}
            title={s.title}
            href={editorOf(s)}
            meta={info(s)}
            figures={figures(s)}
            foot={acts(s)}
          />
        )}
        renderRow={(s) => (
          <AdRow
            key={s.id}
            title={s.title}
            href={editorOf(s)}
            stub={{ ...stubOf(s), ...look(s) }}
            badge={chips(s)}
            sub={info(s)}
            cells={figures(s).map((f) => ({ label: f.label, value: f.value, of: f.of }))}
            acts={acts(s, true)}
          />
        )}
      />

      {/* هويّةُ الإذاعة — نموذجُ التبويب القديم نفسُه (`StationForm`)، بحفظه في ذيله ورفعِ شعاره */}
      <Modal open={stationOpen} onClose={() => setStationOpen(false)} title="هويّة الإذاعة" size="md">
        <StationForm station={station} />
      </Modal>

      <Modal
        open={form !== null}
        onClose={() => setForm(null)}
        title={form?.edit ? "تعديل بيانات البرنامج" : "برنامج جديد"}
        description={form?.edit ? undefined : "يُحفظ مسودّةً، ثمّ يُفتح المحرّر لرفع الشعار وإضافة الحلقات."}
        busy={pending}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submit} loading={pending}>{form?.edit ? "حفظ التغييرات" : "إنشاء البرنامج"}</Button>
          </>
        }
      >
        {form ? (
          <div className="form-grid">
            <Field className="form-full" label="اسم البرنامج" icon={<MicrophoneStage />} innerIcon={<PencilSimple />} placeholder="على هامش الكلمة"
              value={form.state.title} onChange={(e) => onTitle(e.target.value)} error={formErr.title} required />
            <Field className="form-full" label="المعرّف (رابط البرنامج)" icon={<LinkSimple />} innerIcon={<Hash />} placeholder="hamesh" charset="latin"
              value={form.state.slug} onChange={(e) => onSlug(e.target.value)} error={formErr.slug}
              helper="يظهر في رابط البرنامج العامّ، ولا يُغيَّر بعد النشر." required />
            <Select className="form-full" label="المقدّم" icon={<User />} options={memberOptions} value={form.state.hostId}
              onValueChange={(v) => patchForm({ hostId: v })} error={formErr.hostId}
              helper="عضوٌ نشطٌ واحد، يُختم مقدّمًا لكلّ حلقةٍ جديدة." required />
            <Select label="النغمة" icon={<Palette />} options={TONE_OPTIONS} value={form.state.tone}
              onValueChange={(v) => patchForm({ tone: v as ShowTone })} required />
            <Select label="اللجنة المنتجة" icon={<UsersThree />} options={committeeOptions} value={form.state.committeeId}
              onValueChange={(v) => patchForm({ committeeId: v })} optional />
            {/**
              * بدايةُ الحديث: **إلزاميّةٌ عند إنشاء البرنامج** لا موروثةٌ من المحطّة.
              * ويقبل الحقلُ توقيتَ المحرّر كما يُقرأ منه، فلا يُطالَب صاحبُه بحسابٍ ذهنيّ.
              */}
            <Field className="form-full" label="بداية الحديث" icon={<Waveform />} innerIcon={<Hash />}
              placeholder="10:19" charset="latin"
              value={form.state.talkStart} onChange={(e) => patchForm({ talkStart: e.target.value })}
              error={formErr.talkStart}
              helper={(() => {
                const v = parseTalkStart(form.state.talkStart);
                const read = v !== null && !Number.isNaN(v) ? ` تُقرأ ${formatTalkStart(v)}ث.` : "";
                return `نهايةُ المقدّمة الموسيقيّة. اكتبها ثانيةً:إطارًا كما تقرؤها من المحرّر (10:19)، أو توقيتًا كاملًا (0:00:10:19)، أو ثوانيَ (10.633).${read}`;
              })()}
              required />

            <Field className="form-full" label="الجملة التعريفيّة" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              placeholder="حوارٌ أسبوعيّ عن الكتابة وأهلها"
              value={form.state.tagline} onChange={(e) => patchForm({ tagline: e.target.value })} optional />
            <Textarea className="form-full" label="الوصف" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              placeholder="وصفٌ يظهر في صفحة البرنامج…" rows={3}
              value={form.state.description} onChange={(e) => patchForm({ description: e.target.value })}
              helper="مطلوبٌ قبل النشر: لا تُنشَر صفحةُ برنامجٍ بلا وصف." optional />
          </div>
        ) : null}
      </Modal>

      <AdConfirm
        open={kill !== null}
        onClose={() => setKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف البرنامج؟"
        text={kill ? `سيُحذف «${kill.title}» وكلّ حلقاته وملفّاته نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!kill) return;
          start(async () => {
            const r = await deleteShow(kill.id);
            if (r.ok) { toast.success(r.message); setKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
