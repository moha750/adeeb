"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Select, Textarea, Segmented, Modal } from "@adeeb/design-system";
import {
  Megaphone, Playlist, MicrophoneStage, Hash, LinkSimple, TextAlignLeft, CalendarBlank, Clock,
  Archive, MusicNotes, User, FileText, YoutubeLogo, Waveform, SpeakerSimpleNone,
} from "@phosphor-icons/react";
import { EyeSlash, UploadSimple, Trash, PencilSimple, Plus } from "@/app/_components/glyphs";
import { putWithProgress } from "@/lib/radio/upload";
import { computeMixedPeaks, computePeaks } from "@/lib/radio/peaks";
import { DataTable, type Column } from "../../_components/DataTable";
import { Toolbar } from "../../_components/Toolbar";
import { usePersistentView } from "../../_components/usePersistentView";
import { EpisodeCard } from "./EpisodeCard";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import type { EpisodeRow, MemberOption, PlatformRow, ShowRow } from "../data";
import {
  EPISODE_STATUS_META, PLATFORM_META, PLATFORM_VALUES, SHOW_STATUS_META,
  VARIANT_META, episodeLabel, formatBytes, formatDuration, formatTalkStart, parseTalkStart, slugify,
  takesAligned, type AudioVariant, type Platform,
} from "../vocab";
import {
  clearEpisodeAudio, createAudioUploadUrl, createEpisode, createLogoUploadUrl, deleteEpisode,
  loadEpisode, saveShowPlatforms, setEpisodeAudio, setEpisodePeaks, setEpisodeStatus, setShowLogo,
  setShowStatus, updateEpisode,
} from "../actions";
import { PageHeader } from "../../_components/PageHeader";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";

// وصفتا الشعار والصوت من قانون المرفقات (`lib/upload`)
const LOGO_RULE = UPLOAD_RULES.radioLogo;
const AUDIO_RULE = UPLOAD_RULES.radioAudio;

type EpForm = {
  number: string; title: string; slug: string;
  summary: string; notes: string; transcript: string; hostId: string;
  youtubeUrl: string; talkStart: string;
};

const emptyEp = (nextNumber: number, hostId: string): EpForm => ({
  number: String(nextNumber), title: "", slug: "",
  summary: "", notes: "", transcript: "", hostId, youtubeUrl: "", talkStart: "",
});


/**
 * أفيها ما يُسمَع؟ المساران معًا، أو المكسُ القديم وحدَه.
 * وهو حدُّ النشر نفسُه الذي يحرسه `radio_episodes_publish_guard`، فلا يعرض
 * الزرُّ فعلًا سترفضه القاعدة.
 */
const playable = (e: EpisodeRow) => Boolean(e.music) || Boolean(e.plain && e.stem);

/**
 * مدّة الملفّ الصوتيّ بالثواني — تُقرأ من الملفّ نفسه في المتصفّح.
 * فلا يُدخلها إنسانٌ بيده: عليها يقوم شريطُ المشغّل وبها يُفحص تساوي المسارين.
 */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (v: number) => { URL.revokeObjectURL(url); resolve(v); };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => done(0);
    audio.src = url;
  });
}

/**
 * الزمنُ المتبقّي من سرعةٍ **مقيسةٍ حتّى اللحظة** لا مقدَّرة: ما مضى من بايتات
 * على ما مضى من ثوانٍ. ويُكتَم قبل أن يمضي شيءٌ يُقاس عليه، فرقمٌ يقفز من ساعةٍ
 * إلى ثانيةٍ أسوأُ من لا رقم.
 */
function etaSeconds(loaded: number, total: number, startedAt: number): number | null {
  const elapsed = (Date.now() - startedAt) / 1000;
  if (elapsed < 1.5 || loaded <= 0) return null;
  const rate = loaded / elapsed;
  if (!(rate > 0)) return null;
  return Math.max(0, Math.round((total - loaded) / rate));
}

export function ShowEditorView({
  show, episodes, platforms, members, showTalkStart,
}: {
  show: ShowRow; episodes: EpisodeRow[]; platforms: PlatformRow[];
  members: MemberOption[]; showTalkStart: number;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [tab, setTab] = useState<"episodes" | "identity">("episodes");
  const [epView, changeEpView] = usePersistentView("radio-episodes-view");

  const [uploadingLogo, setUploadingLogo] = useState<number | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const plainRef = useRef<HTMLInputElement>(null);
  const stemRef = useRef<HTMLInputElement>(null);

  /** نافذةُ الصوت: المساران في مكانٍ واحد، وأيُّهما يجوز أن يبقى فارغًا. */
  const [audioModal, setAudioModal] = useState<{ ep: EpisodeRow; plain: File | null; stem: File | null } | null>(null);
  /**
   * حالةُ الرفع الجارية — **واحدةٌ لا غير**، فلا تلتبس رفعتان.
   * وكان مصدرُ الحالة يتّسع لواحدة ويُسمح ببدء ثانية، فيأخذ الشريطُ اسمَ
   * الثانية ونسبةَ الأولى ويكذب على صاحبه.
   */
  const [uploading, setUploading] = useState<{
    label: string; step: number; steps: number;
    pct: number; loaded: number; total: number; startedAt: number;
  } | null>(null);
  const [confirmDrop, setConfirmDrop] = useState<{ ep: EpisodeRow; variant: AudioVariant } | null>(null);

  const [links, setLinks] = useState<Record<string, string>>(
    () => Object.fromEntries(platforms.map((p) => [p.platform, p.url])),
  );

  const [epForm, setEpForm] = useState<{ edit: EpisodeRow | null; state: EpForm; slugTouched: boolean } | null>(null);
  const [epErr, setEpErr] = useState<Partial<Record<keyof EpForm, string>>>({});
  const [confirmKill, setConfirmKill] = useState<EpisodeRow | null>(null);
  const [schedule, setSchedule] = useState<{ ep: EpisodeRow; at: string } | null>(null);

  const memberOptions = useMemo(() => members.map((m) => ({ value: m.value, label: m.label })), [members]);

  /* ── حالة البرنامج ── */
  const runShowStatus = (op: "publish" | "unpublish") => startPending(async () => {
    const r = await setShowStatus(show.id, op);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });

  /* ── رفع الشعار ── */
  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    const why = checkFile(file, LOGO_RULE);
    if (why) { toast.error(why); return; }
    setUploadingLogo(0);
    try {
      const ticket = await createLogoUploadUrl(show.id, file.type, file.size);
      if (!ticket.ok || !ticket.url || !ticket.path) { toast.error(ticket.message ?? "تعذّر الرفع."); return; }
      const put = await putWithProgress(ticket.url, file, (f) => setUploadingLogo(f));
      if (!put.ok) { toast.error(put.message, { duration: 12000 }); return; }
      const r = await setShowLogo(show.id, ticket.path);
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    } finally {
      setUploadingLogo(null);
    }
  };

  /* ── رفع المسارين: فعلٌ واحدٌ ورفعٌ متتابع ── */

  /** المدّةُ من الوسائط، وإن أبت فمن الفكّ (وهو أبطأ وأصدق). */
  const durationOf = async (file: File): Promise<number> =>
    (await readDuration(file)) || (await computePeaks(file))?.duration || 0;

  /**
   * يُرفعان **بالتتابع لا معًا**: يتقاسمان الخطَّ نفسَه فلا يكسب التوازي وقتًا،
   * ويضاعف احتمالَ الفشل ويجعل شريطًا واحدًا يحكي عن رفعتين.
   *
   * **والموجتان تُحسبان بعد الرفع لا أثناءه**: فكُّ عشرين دقيقةً يستغرق، وحسابُه
   * قبل كلّ رفعةٍ يؤخّر بدءَ الشبكة بلا سبب. ثمّ إنّ موجةَ «بموسيقى» **مجموعُ
   * المسارين**، فلا تُعرَف إلّا وقد اجتمعا.
   */
  const runUpload = async () => {
    if (!audioModal || uploading) return;
    const jobs = ([["plain", audioModal.plain], ["stem", audioModal.stem]] as [AudioVariant, File | null][])
      .filter((j): j is [AudioVariant, File] => Boolean(j[1]));
    if (!jobs.length) { toast.error("اختر ملفًّا واحدًا على الأقلّ."); return; }

    const ep = audioModal.ep;
    let warned: string | undefined;
    for (const [i, [variant, file]] of jobs.entries()) {
      setUploading({
        label: VARIANT_META[variant].verb, step: i + 1, steps: jobs.length + 1,
        // ساعةُ بدء هذه الرفعة. و`runUpload` **يدُ زرٍّ لا رسمة**: لا تُنادى إلّا من
        // `onClick`، فقراءةُ الساعة فيها لا تقع في رسمٍ ولا تتبدّل بإعادته. والقاعدة
        // لا تُميّز يدَ الحدث من الرسم في دوالّ المكوّن، فتُستثنى هنا وحدها.
        // eslint-disable-next-line react-hooks/purity
        pct: 0, loaded: 0, total: file.size, startedAt: Date.now(),
      });
      const duration = await durationOf(file);
      if (!duration) { toast.error(`تعذّرت قراءة مدّة ${VARIANT_META[variant].verb}. تأكّد أنّه ملفّ صوتٍ سليم.`); setUploading(null); return; }

      const ticket = await createAudioUploadUrl(show.id, ep.id, variant, file.type, file.size);
      if (!ticket.ok || !ticket.url || !ticket.path) { toast.error(ticket.message ?? "تعذّر الرفع."); setUploading(null); return; }

      const put = await putWithProgress(ticket.url, file, (f) =>
        setUploading((u) => (u ? { ...u, pct: f, loaded: Math.round(f * u.total) } : u)));
      if (!put.ok) { toast.error(put.message, { duration: 12000 }); setUploading(null); return; }

      const r = await setEpisodeAudio(ep.id, variant, ticket.path, file.size, duration, file.type);
      if (!r.ok) { toast.error(r.message); setUploading(null); return; }
      if (r.warning) warned = r.warning;
    }

    // الموجتان: المرفوعُ الآن من الملفّ الذي بين يدينا، وما لم يُرفَع من المخزن.
    setUploading({
      label: "حساب الموجة", step: jobs.length + 1, steps: jobs.length + 1,
      // ساعةُ محطّة الموجة — يدُ الزرّ نفسُها، والعلّةُ أعلاه
      // eslint-disable-next-line react-hooks/purity
      pct: 0, loaded: 0, total: 0, startedAt: Date.now(),
    });
    await saveWaves(ep, audioModal.plain, audioModal.stem);

    setUploading(null);
    setAudioModal(null);
    toast.success(jobs.length === 2 ? "رُفع المساران." : VARIANT_META[jobs[0][0]].uploaded + ".");
    if (warned) toast.warning(warned, { duration: 12000 });
    router.refresh();
  };

  /**
   * الموجتان المعروضتان: موجةُ الصوت وحدَه، وموجةُ ما يُسمَع بالموسيقى.
   *
   * وتُقبَل مصادرُ مختلطة: ملفٌّ من يد صاحبه أو رابطٌ من المخزن — فمن رفع مسارًا
   * واحدًا يُحسَب مجموعُه مع أخيه المرفوع من قبل بلا أن يُطالَب برفعه ثانيةً.
   * (وقراءةُ المخزن تلزمها سياسةُ CORS، وهي مضبوطةٌ بـ`pnpm r2:cors`.)
   */
  const saveWaves = async (e: EpisodeRow, plainFile?: File | null, stemFile?: File | null) => {
    const voice = plainFile ?? e.plainUrl ?? null;
    const music = stemFile ?? e.stemUrl ?? null;
    let done = 0;

    if (voice) {
      const w = await computePeaks(voice);
      if (w && (await setEpisodePeaks(e.id, "plain", w.peaks)).ok) done++;
    }
    // بالمسارين: المجموع. وبالمكس القديم: ملفُّ المكس نفسُه، فالمعنى واحد.
    if (voice && music) {
      const w = await computeMixedPeaks(voice, music);
      if (w && (await setEpisodePeaks(e.id, "mixed", w.peaks)).ok) done++;
    } else if (e.musicUrl) {
      const w = await computePeaks(e.musicUrl);
      if (w && (await setEpisodePeaks(e.id, "mixed", w.peaks)).ok) done++;
    }
    return done;
  };

  /** حسابُ الموجة لحلقةٍ رُفعت قبل هذه الميزة — المصادرُ كلُّها من المخزن. */
  const [computingWave, setComputingWave] = useState<string | null>(null);
  const computeWave = async (e: EpisodeRow) => {
    if (computingWave) return;
    setComputingWave(e.id);
    try {
      const done = await saveWaves(e);
      if (done) { toast.success(done === 2 ? "حُسبت موجتا الحلقة." : "حُسبت موجةٌ واحدة."); router.refresh(); }
      else toast.error("تعذّر فكّ ملفّات الحلقة.");
    } finally {
      setComputingWave(null);
    }
  };

  /* ── المنصّات ── */
  const saveLinks = () => startPending(async () => {
    const payload = PLATFORM_VALUES
      .map((p) => ({ platform: p as Platform, url: (links[p] ?? "").trim() }))
      .filter((l) => l.url);
    const r = await saveShowPlatforms(show.id, payload);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });

  /* ── الحلقات ── */
  const nextNumber = useMemo(
    () => (episodes.length ? Math.max(...episodes.map((e) => e.number)) + 1 : 1),
    [episodes],
  );

  const openCreateEp = () => {
    setEpForm({ edit: null, slugTouched: false, state: emptyEp(nextNumber, show.hostId) });
    setEpErr({});
  };
  // المحاور والتفريغ نصوصٌ قد تطول، فلا تُحمَّل مع كلّ صفوف الجدول — تُجلب عند فتح التحرير وحده.
  const openEditEp = (e: EpisodeRow) => {
    startPending(async () => {
      const full = await loadEpisode(e.id);
      if (!full.ok || !full.episode) { toast.error(full.message ?? "تعذّر جلب الحلقة."); return; }
      setEpForm({
        edit: e, slugTouched: true,
        state: {
          number: String(full.episode.number),
          title: full.episode.title, slug: full.episode.slug,
          summary: full.episode.summary ?? "", notes: full.episode.notes ?? "",
          transcript: full.episode.transcript ?? "", hostId: full.episode.hostId,
          youtubeUrl: full.episode.youtubeUrl ?? "",
          talkStart: full.episode.talkStartsAt === null ? "" : formatTalkStart(full.episode.talkStartsAt),
        },
      });
      setEpErr({});
    });
  };

  const patchEp = (patch: Partial<EpForm>) => setEpForm((f) => (f ? { ...f, state: { ...f.state, ...patch } } : f));
  const onEpTitle = (v: string) => setEpForm((f) => {
    if (!f) return f;
    const next = { ...f.state, title: v };
    if (!f.slugTouched) next.slug = slugify(v) || `ep-${next.number}`;
    return { ...f, state: next };
  });

  const submitEp = () => {
    if (!epForm) return;
    const s = epForm.state;
    const errs: Partial<Record<keyof EpForm, string>> = {};
    if (!s.title.trim()) errs.title = "عنوان الحلقة مطلوب.";
    if (!slugify(s.slug)) errs.slug = "المعرّف مطلوب: أحرف لاتينيّة وأرقام.";
    if (!/^\d+$/.test(s.number) || Number(s.number) < 1) errs.number = "رقم الحلقة يبدأ من ١.";
    if (s.youtubeUrl.trim() && !/^https:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(s.youtubeUrl.trim())) {
      errs.youtubeUrl = "يبدأ بـ https://youtube.com أو https://youtu.be.";
    }
    const talkStart = parseTalkStart(s.talkStart);
    if (talkStart !== null && Number.isNaN(talkStart)) errs.talkStart = "ثوانٍ ورقمٌ عشريٌّ اختياريّ، مثل 10.633.";
    setEpErr(errs);
    if (Object.keys(errs).length) return;

    const input = {
      showId: show.id, number: Number(s.number),
      title: s.title, slug: s.slug, summary: s.summary || null,
      notes: s.notes || null, transcript: s.transcript || null,
      hostId: s.hostId || null,
      youtubeUrl: s.youtubeUrl.trim() || null,
      talkStartsAt: talkStart,
    };
    startPending(async () => {
      const r = epForm.edit ? await updateEpisode(epForm.edit.id, input) : await createEpisode(input);
      if (r.ok) { toast.success(r.message); setEpForm(null); router.refresh(); } else toast.error(r.message);
    });
  };

  const runEpStatus = (e: EpisodeRow, op: "publish" | "unpublish" | "archive") => startPending(async () => {
    const r = await setEpisodeStatus(e.id, op);
    if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
  });

  const epMenu = (e: EpisodeRow): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "تعديل البيانات", icon: <PencilSimple />, onSelect: () => openEditEp(e) },
    ] },
    { header: "الصوت", items: [
      { label: e.plain || e.stem ? "رفع أو استبدال المسارين" : "رفع المسارين", icon: <MusicNotes />,
        onSelect: () => setAudioModal({ ep: e, plain: null, stem: null }) },
      ...(e.music || e.plain || e.stem
        ? [{ label: "حساب الموجة", icon: <Waveform />, disabled: computingWave !== null, onSelect: () => void computeWave(e) }]
        : []),
      ...(e.plain ? [{ label: "نزع مسار الصوت", icon: <Trash />, onSelect: () => setConfirmDrop({ ep: e, variant: "plain" }) }] : []),
      ...(e.stem ? [{ label: "نزع مسار الموسيقى", icon: <Trash />, onSelect: () => setConfirmDrop({ ep: e, variant: "stem" }) }] : []),
    ] },
    { header: "الحالة", items: [
      ...(e.status === "published"
        ? [{ label: "إلغاء النشر", icon: <EyeSlash />, onSelect: () => runEpStatus(e, "unpublish") }]
        : [
            { label: "نشر الآن", icon: <Megaphone />, disabled: !playable(e), onSelect: () => runEpStatus(e, "publish") },
            { label: "جدولة", icon: <Clock />, disabled: !playable(e), onSelect: () => setSchedule({ ep: e, at: "" }) },
          ]),
      ...(e.status === "archived" ? [] : [{ label: "أرشفة", icon: <Archive />, onSelect: () => runEpStatus(e, "archive") }]),
    ] },
    { header: "منطقة الخطر", danger: true, items: [
      { label: "حذف", icon: <Trash />, danger: true, disabled: e.status === "published", onSelect: () => setConfirmKill(e) },
    ] },
  ];

  const columns: Column<EpisodeRow>[] = useMemo(() => [
    {
      key: "title", header: "الحلقة", width: "minmax(220px, 2.4fr)",
      render: (e) => (
        <span className="txt" title={e.summary ?? undefined}>
          <b>{e.title}</b>
          <span className="text-content-muted num" style={{ marginInlineStart: 8 }}>{episodeLabel(e.number)}</span>
        </span>
      ),
    },
    {
      // المساران في عمودٍ واحد: الحاضرُ بمدّته، والغائبُ بشارةٌ تنادي.
      // والمكسُ القديم لا يُعرَض إلّا حيث لا مسارَ يخلفه، فلا يزحم عينًا بما يزول.
      key: "takes", header: "المساران", width: "minmax(190px, 1.5fr)",
      render: (e) => (
        <span className="txt" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {e.plain
            ? <span className="num" title={`${VARIANT_META.plain.verb}، ${formatBytes(e.plain.bytes)}`}>
                <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden />{" "}
                <bdi dir="ltr">{formatDuration(e.plain.seconds)}</bdi>
              </span>
            : <Badge tone="warning" variant="outline">بلا مسار صوت</Badge>}
          {e.stem
            ? <span className="num text-content-muted" title={`${VARIANT_META.stem.verb}، ${formatBytes(e.stem.bytes)}`}>
                <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden />{" "}
                <bdi dir="ltr">{formatDuration(e.stem.seconds)}</bdi>
              </span>
            : <Badge tone="warning" variant="outline">بلا مسار موسيقى</Badge>}
          {e.music && !(e.plain && e.stem)
            ? <Badge tone="neutral" variant="outline">مكسٌ قديم</Badge>
            : null}
          {takesAligned(e.plain, e.stem) ? null : <Badge tone="danger" variant="outline">مدّتان مختلفتان</Badge>}
        </span>
      ),
    },
    {
      key: "youtube", header: "يوتيوب", width: "0.8fr", align: "center",
      render: (e) => (e.youtubeUrl
        ? <a href={e.youtubeUrl} target="_blank" rel="noreferrer" className="text-content-muted" aria-label="الفيديو على يوتيوب"><YoutubeLogo size={18} /></a>
        : <span className="text-content-muted">—</span>),
    },
    { key: "status", header: "الحالة", width: "0.9fr", render: (e) => <Badge tone={EPISODE_STATUS_META[e.status].tone} dot>{EPISODE_STATUS_META[e.status].label}</Badge> },
    {
      // الرقمُ الثاني هو الجواب: أتُستعمَل ميزتُنا أم بُنيت لأنفسنا؟
      // الرقمان معًا: الفرقُ بينهما يقول أيُعيدونها، وذلك ما لا يقوله أيٌّ منهما وحدَه.
      key: "plays", header: "الاستماع", width: "minmax(150px, 1.2fr)", align: "center",
      render: (e) => (
        <span className="txt">
          <span className="num">{e.plays}</span> استماعة
          <span className="text-content-muted">
            {"، "}<span className="num">{e.listeners}</span> مستمعًا
            {e.playsPlain > 0 ? <span title="منها بالنسخة المجرّدة">{"، "}<span className="num">{e.playsPlain}</span> مجرّدة</span> : null}
          </span>
        </span>
      ),
    },
    { key: "likes", header: "الإعجاب", width: "0.6fr", align: "center", render: (e) => <span className="txt num">{e.likes}</span> },
  ], []);

  const epEmpty = (
    <EmptyState variant="aurora" icon={<Playlist />} title="لا حلقات بعد"
      description="أنشئ الحلقة الأولى: تُحفظ مسودّةً، ثمّ ترفع نسختيها فتُقرأ مدّتاهما آليًّا، ثمّ تنشرها."
      action={<Button variant="primary" size="md" onClick={openCreateEp}><Plus size={18} />حلقة جديدة</Button>} />
  );

  const tabs = [
    { value: "episodes", label: `الحلقات (${episodes.length})` },
    { value: "identity", label: "الهويّة والمنصّات" },
  ];

  return (
    <>
      {/* «رجوع» سقط: يكرّر فتاتَ المسار الذي فوقه بسطر. و«إلغاء النشر» ليست غايةَ الشاشة
          فنزلت إلى `⋯`، والنشرُ وحده يبقى فعلًا أساسيًّا (حكمُ `/ui/page-header`). */}
      <PageHeader
        title={show.title}
        status={<Badge tone={SHOW_STATUS_META[show.status].tone} dot>{SHOW_STATUS_META[show.status].label}</Badge>}
        primary={show.status === "published" ? undefined : {
          label: "نشر البرنامج", icon: <Megaphone size={18} />, loading: pending,
          onClick: () => runShowStatus("publish"),
        }}
        menu={show.status === "published"
          ? [{ items: [{ label: "إلغاء النشر", icon: <EyeSlash size={18} />, onSelect: () => runShowStatus("unpublish") }] }]
          : undefined}
      />

      <Segmented items={tabs} value={tab} onValueChange={(v) => setTab(v as typeof tab)} aria-label="أقسام البرنامج" className="seg-block mb-4" />

      {tab === "episodes" ? (
        <>
          {/* شريطٌ بلا بحثٍ ولا مرشّح: مبدّلُ العرض وزرُّ الإنشاء — والشريط يملك تباعده */}
          <Toolbar
            view={epView}
            onViewChange={changeEpView}
            actions={<Button variant="primary" size="md" onClick={openCreateEp}><Plus size={18} />حلقة جديدة</Button>}
          />

          {epView === "table" ? (
            <DataTable
              columns={columns}
              rows={episodes}
              getRowId={(e) => e.id}
              rowActions={epMenu}
              emptyState={epEmpty}
            />
          ) : episodes.length === 0 ? (
            <div className="card-empty">{epEmpty}</div>
          ) : (
            <div className="card-grid">
              {episodes.map((e) => (
                <EpisodeCard key={e.id} episode={e} actions={epMenu(e)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="form-grid">
          {/* شعار البرنامج */}
          <div className="form-full">
            <div
              onDragOver={(ev) => ev.preventDefault()}
              onDrop={(ev) => { ev.preventDefault(); void onLogo(ev.dataTransfer.files?.[0]); }}
              className="rounded border-2 border-dashed border-line bg-surface-2 p-8 flex flex-col items-center gap-3 text-center"
            >
              {show.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={show.logoUrl} alt={`شعار ${show.title}`} className="h-28 w-28 rounded object-cover" />
              ) : (
                <UploadSimple size={30} className="text-content-muted" />
              )}
              <div className="text-content-muted text-sm">
                شعار البرنامج: مربّعٌ لا يقلّ عن ١٤٠٠×١٤٠٠. اسحبه هنا أو اختره من جهازك.
              </div>
              <Button variant="ghost" size="md" onClick={() => logoRef.current?.click()} loading={uploadingLogo !== null}>
                <UploadSimple size={18} />{show.logoUrl ? "استبدال الشعار" : "اختر الشعار"}
              </Button>
              {uploadingLogo !== null ? (
                <div className={"aprog w-56" + (uploadingLogo > 0 ? "" : " is-indeterminate")}>
                  <div className="aprog-head">
                    <span>يُرفع الشعار</span>
                    {uploadingLogo > 0 ? <span className="aprog-pct">{Math.round(uploadingLogo * 100)}٪</span> : null}
                  </div>
                  <div className="aprog-track">
                    <div className="aprog-fill" style={{ width: `${Math.round(uploadingLogo * 100)}%` }} />
                  </div>
                </div>
              ) : null}
              <input ref={logoRef} type="file" accept={LOGO_RULE.accept} hidden
                onChange={(ev) => { void onLogo(ev.target.files?.[0]); ev.target.value = ""; }} />
            </div>
          </div>

          {/* روابط المنصّات */}
          {PLATFORM_VALUES.map((p) => (
            <Field
              key={p}
              label={PLATFORM_META[p].label}
              icon={<LinkSimple />}
              innerIcon={<Hash />}
              placeholder="https://…"
              charset="latin"
              value={links[p] ?? ""}
              onChange={(ev) => setLinks((prev) => ({ ...prev, [p]: ev.target.value }))}
              optional
            />
          ))}
          <div className="form-full">
            <Button variant="primary" size="md" onClick={saveLinks} loading={pending}>حفظ روابط المنصّات</Button>
          </div>
        </div>
      )}


      {/* نافذة الحلقة */}
      <Modal
        open={epForm !== null}
        onClose={() => setEpForm(null)}
        title={epForm?.edit ? "تعديل الحلقة" : "حلقة جديدة"}
        description={epForm?.edit ? undefined : "تُحفظ مسودّةً، ثمّ ترفع نسختيها الصوتيّتين من قائمة الحلقة."}
        busy={pending}
        size="lg"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setEpForm(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" onClick={submitEp} loading={pending}>{epForm?.edit ? "حفظ التغييرات" : "إنشاء الحلقة"}</Button>
          </>
        }
      >
        {epForm ? (
          <div className="form-grid">
            <Field className="form-full" label="عنوان الحلقة" icon={<MicrophoneStage />} innerIcon={<PencilSimple />}
              placeholder="حين تكتب الكلمة نفسها" value={epForm.state.title}
              onChange={(e) => onEpTitle(e.target.value)} error={epErr.title} required />
            <Field label="رقم الحلقة" icon={<Playlist />} innerIcon={<Hash />} placeholder="1" charset="digits"
              value={epForm.state.number} onChange={(e) => patchEp({ number: e.target.value })} error={epErr.number} required />
            <Field label="بداية الحديث (ثانية)" icon={<Waveform />} innerIcon={<Hash />}
              placeholder="10:19" charset="latin"
              value={epForm.state.talkStart} onChange={(e) => patchEp({ talkStart: e.target.value })}
              error={epErr.talkStart}
              helper={(() => {
                const v = parseTalkStart(epForm.state.talkStart);
                const read = v !== null && !Number.isNaN(v) ? ` تُقرأ ${formatTalkStart(v)}ث.` : "";
                return `اتركه فارغًا فيرث ${formatTalkStart(showTalkStart)}ث من البرنامج. ولا تملأه إلّا إن اختلفت مقدّمةُ هذه الحلقة.${read}`;
              })()}
              optional />
            <Field className="form-full" label="المعرّف (رابط الحلقة)" icon={<LinkSimple />} innerIcon={<Hash />}
              placeholder="ep-1" charset="latin" value={epForm.state.slug}
              onChange={(e) => setEpForm((f) => (f ? { ...f, slugTouched: true, state: { ...f.state, slug: e.target.value } } : f))}
              error={epErr.slug} required />
            <Select className="form-full" label="مقدّم هذه الحلقة" icon={<User />} options={memberOptions}
              value={epForm.state.hostId} onValueChange={(v) => patchEp({ hostId: v })}
              helper="يُختم من مقدّم البرنامج، وغيِّره إن ناب عنه أحدٌ في هذه الحلقة." required />
            <Field className="form-full" label="الفيديو على يوتيوب" icon={<YoutubeLogo />} innerIcon={<LinkSimple />}
              placeholder="https://youtu.be/…" charset="latin"
              value={epForm.state.youtubeUrl} onChange={(e) => patchEp({ youtubeUrl: e.target.value })}
              error={epErr.youtubeUrl}
              helper="رابطٌ يحيل من صفحة الحلقة. التجربةُ عندنا صوتيّة، فلا يُضمَّن المشغّل." optional />
            <Textarea className="form-full" label="الملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />}
              placeholder="سطرٌ أو سطران يظهران في بطاقة الحلقة وصفحتها…" rows={2}
              value={epForm.state.summary} onChange={(e) => patchEp({ summary: e.target.value })} optional />
            <Textarea className="form-full" label="المحاور والروابط" icon={<FileText />} innerIcon={<PencilSimple />}
              placeholder="محاور الحلقة وما ذُكر فيها من كتبٍ وروابط…" rows={4}
              value={epForm.state.notes} onChange={(e) => patchEp({ notes: e.target.value })} optional />
            <Textarea className="form-full" label="التفريغ النصّيّ" icon={<MusicNotes />} innerIcon={<PencilSimple />}
              placeholder="نصّ الحلقة مفرَّغًا، وصوليّةٌ وبحثٌ وأرشيف…" rows={4}
              value={epForm.state.transcript} onChange={(e) => patchEp({ transcript: e.target.value })} optional />
          </div>
        ) : null}
      </Modal>

      {/* نافذة الصوت: المساران في فعلٍ واحد */}
      <Modal
        open={audioModal !== null}
        onClose={() => setAudioModal(null)}
        title="رفع مسارَي الحلقة"
        description={audioModal ? `حلقة «${audioModal.ep.title}». مساران من تايم لاينٍ واحد: هذا بكتم الموسيقى وذاك بكتم الصوت.` : undefined}
        busy={uploading !== null}
        size="md"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setAudioModal(null)} disabled={uploading !== null}>إلغاء</Button>
            <Button variant="primary" size="md" loading={uploading !== null} onClick={() => void runUpload()}>رفع</Button>
          </>
        }
      >
        {audioModal ? (
          <>
            {(["plain", "stem"] as const).map((variant) => {
              const file = variant === "plain" ? audioModal.plain : audioModal.stem;
              const has = variant === "plain" ? audioModal.ep.plain : audioModal.ep.stem;
              const inputRef = variant === "plain" ? plainRef : stemRef;
              return (
                <div key={variant} className="rounded border-2 border-dashed border-line bg-surface-2 p-4"
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    const f = ev.dataTransfer.files?.[0];
                    if (f) setAudioModal((m) => (m ? { ...m, [variant]: f } : m));
                  }}
                >
                  <div className="flex items-center gap-3">
                    {variant === "plain" ? <SpeakerSimpleNone size={20} aria-hidden /> : <MusicNotes size={20} aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <div className="font-bold">{VARIANT_META[variant].verb}</div>
                      <div className="text-content-muted text-sm truncate">
                        {file
                          ? `${file.name}، ${formatBytes(file.size)}`
                          : has
                            ? `مرفوعٌ الآن (${formatDuration(has.seconds)})، واختيارُ ملفٍّ يستبدله`
                            : variant === "plain" ? "الحلقةُ بكتم مسار الموسيقى" : "الحلقةُ بكتم مسار الصوت"}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" disabled={uploading !== null}
                      onClick={() => inputRef.current?.click()}>
                      <UploadSimple size={16} />{file ? "تغيير" : "اختر"}
                    </Button>
                  </div>
                  <input ref={inputRef} type="file" accept={AUDIO_RULE.accept} hidden
                    onChange={(ev) => {
                      const f = ev.target.files?.[0] ?? null;
                      ev.target.value = "";
                      if (!f) return;
                      // الصوتُ يمرّ على البوّابة كغيره: ساعةٌ من MP3 تُردّ قبل أن تُرفَع
                      const bad = checkFile(f, AUDIO_RULE);
                      if (bad) { toast.error(bad); return; }
                      setAudioModal((m) => (m ? { ...m, [variant]: f } : m));
                    }} />
                </div>
              );
            })}

            {uploading ? (
              <div className={"aprog" + (uploading.pct > 0 ? "" : " is-indeterminate")}>
                <div className="aprog-head">
                  <span>
                    {uploading.label}
                    {uploading.steps > 1 ? `، ${uploading.step} من ${uploading.steps}` : ""}
                  </span>
                  {uploading.pct > 0 ? <span className="aprog-pct">{Math.round(uploading.pct * 100)}٪</span> : null}
                </div>
                <div className="aprog-track">
                  <div className="aprog-fill" style={{ width: `${Math.round(uploading.pct * 100)}%` }} />
                </div>
                <div className="aprog-head">
                  <span>{formatBytes(uploading.loaded)} من {formatBytes(uploading.total)}</span>
                  {(() => {
                    const eta = etaSeconds(uploading.loaded, uploading.total, uploading.startedAt);
                    return eta === null ? null : <span>بقي <bdi dir="ltr">{formatDuration(eta) || "0:01"}</bdi></span>;
                  })()}
                </div>
              </div>
            ) : (
              <p className="text-content-muted text-sm">
                يُرفعان بالتتابع لا معًا: يتقاسمان الخطّ نفسه فلا يكسب التوازي وقتًا. لا تُغلق الصفحة حتّى يكتملا.
              </p>
            )}
          </>
        ) : null}
      </Modal>

      {/* نافذة الجدولة */}
      <Modal
        open={schedule !== null}
        onClose={() => setSchedule(null)}
        title="جدولة النشر"
        description="تُنشر الحلقة تلقائيًّا في الموعد فتظهر في الموقع."
        busy={pending}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setSchedule(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" loading={pending} onClick={() => {
              if (!schedule) return;
              startPending(async () => {
                const r = await setEpisodeStatus(schedule.ep.id, "schedule", new Date(schedule.at).toISOString());
                if (r.ok) { toast.success(r.message); setSchedule(null); router.refresh(); } else toast.error(r.message);
              });
            }}>جدولة</Button>
          </>
        }
      >
        {schedule ? (
          <Field label="موعد النشر" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder=""
            type="datetime-local" value={schedule.at}
            onChange={(e) => setSchedule((s) => (s ? { ...s, at: e.target.value } : s))} required />
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmKill !== null}
        onClose={() => setConfirmKill(null)}
        tone="danger"
        icon={<Trash />}
        title="حذف الحلقة؟"
        text={confirmKill ? `ستُحذف «${confirmKill.title}» وملفّاها الصوتيّان نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() => {
          if (!confirmKill) return;
          startPending(async () => {
            const r = await deleteEpisode(confirmKill.id);
            if (r.ok) { toast.success(r.message); setConfirmKill(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />

      <ConfirmDialog
        open={confirmDrop !== null}
        onClose={() => setConfirmDrop(null)}
        tone="danger"
        icon={<Trash />}
        title={confirmDrop ? `نزع ${VARIANT_META[confirmDrop.variant].verb}؟` : "نزع المسار؟"}
        text={confirmDrop
          ? `سيُحذف ${VARIANT_META[confirmDrop.variant].verb} من حلقة «${confirmDrop.ep.title}»، فلا يبقى للحلقة مقبضُ موسيقى ولا مبدّل.`
          : undefined}
        confirmLabel="نزع"
        loading={pending}
        onConfirm={() => {
          if (!confirmDrop) return;
          startPending(async () => {
            const r = await clearEpisodeAudio(confirmDrop.ep.id, confirmDrop.variant);
            if (r.ok) { toast.success(r.message); setConfirmDrop(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
