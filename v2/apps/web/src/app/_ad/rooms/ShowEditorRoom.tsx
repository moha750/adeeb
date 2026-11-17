"use client";

/**
 * **محرّرُ البرنامج على «المنضدة»** (قالبُ «مساحة العمل»، ٢٠٢٦-١١-١٦ — لم يُعتمد بعد، مختبرُه `/dashboard/ad/show-editor`).
 * كان `ShowEditorView`: رأسٌ قديم، ومبدّلٌ بين «الحلقات» و«الهويّة والمنصّات»، وجدولٌ أو كروتٌ بقائمة «⋯» لكلّ حلقة فيها أحدَ عشرَ فعلًا،
 * ونافذةٌ للحلقة ونافذةٌ لمساريها ونافذةٌ لجدولتها. فصار:
 * - **حالُ البرنامج `AdNote` فوق التحرير** بفعل مرحلته (كالكتيّب): «انشر البرنامج»، أو «افتحه» و«أوقف النشر».
 * - **الحلقاتُ قطع** (`WorkBlock`) برقمها، وسطرُها حالُها ومدّتُها. تُفتح فيُكتب فيها ما كان في نافذتها، وتحته **مسارا الحلقة** بحقل الرفع
 *   المعتمد، وحالُها تنبيهٌ بفعله (انشرها، جدولها، أوقف نشرها)، وفي ذيلها «احفظ الحلقة» و«أرشفة» و«حذف».
 * - **الهويّةُ والمنصّات قسمٌ ثانٍ** تحت الحلقات: الشعارُ بحقل الرفع، والروابطُ الأربعة.
 * - **والمنضدةُ صفحةُ البرنامج العامّةُ نفسُها** (`/frame/radio`)، والحلقةُ المفتوحةُ في التحرير تُرى صفحتُها وهي تُكتب.
 *
 * **السلوكُ سلوكُ القديم**: الأفعالُ نفسُها من `dashboard/radio/actions` بمدخلاتها، والتحقّقُ نفسُه، والرفعُ المتتابعُ للمسارين ثمّ حسابُ
 * الموجتين، وما يُحفظ يُحفظ في لحظته. والجديد: ما كُتب في الحلقة ولم يُحفظ يُحرس — تبديلُ القطعة يسأل، ومغادرةُ الصفحة تسأل.
 */
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Modal, Select, Textarea } from "@adeeb/design-system";
import {
  Archive, CalendarBlank, Clock, FileText, Hash, Image as ImageIcon, LinkSimple, Megaphone, MicrophoneStage, MusicNotes, Playlist,
  SpeakerSimpleNone, TextAlignLeft, User, Waveform, YoutubeLogo,
} from "@phosphor-icons/react";
import { ArrowSquareOut, EyeSlash, PencilSimple, Plus, Trash, UploadSimple } from "@/app/_components/glyphs";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { putWithProgress } from "@/lib/radio/upload";
import { computeMixedPeaks, computePeaks } from "@/lib/radio/peaks";
import { UPLOAD_RULES, checkFile } from "@/lib/upload";
import { fmtDate, fmtStamp } from "@/lib/dates";
import { arCount, type ArForms } from "@/lib/arabicCount";
import type { EpisodeRow, MemberOption, PlatformRow, ShowRow } from "@/app/dashboard/radio/data";
import {
  EPISODE_STATUS_META, PLATFORM_META, PLATFORM_VALUES, VARIANT_META, formatBytes, formatDuration, formatTalkStart, parseTalkStart, slugify,
  takesAligned, type AudioVariant, type Platform,
} from "@/app/dashboard/radio/vocab";
import {
  clearEpisodeAudio, createAudioUploadUrl, createEpisode, createLogoUploadUrl, deleteEpisode, loadEpisode, saveShowPlatforms, setEpisodeAudio,
  setEpisodePeaks, setEpisodeStatus, setShowLogo, setShowStatus, updateEpisode,
} from "@/app/dashboard/radio/actions";
import type { PublicEpisode, PublicShow } from "@/app/radio/model";
import { AdButton, AdConfirm, AdNote } from "../primitives";
import { FormSection, FormWith } from "../form";
import { AdUpload } from "../upload";
import { StageFrame, WorkBlock, WorkRoom, useLeaveGuard } from "../workspace";

const LOGO_RULE = UPLOAD_RULES.radioLogo;
const AUDIO_RULE = UPLOAD_RULES.radioAudio;
const AR_EPISODE: ArForms = ["حلقةٌ واحدة", "حلقتان", "حلقات", "حلقةً"];
const AR_PLAY: ArForms = ["استماعةٌ واحدة", "استماعتان", "استماعات", "استماعةً"];
const AR_LISTENER: ArForms = ["مستمعٌ واحد", "مستمعان", "مستمعين", "مستمعًا"];
const AR_LIKE: ArForms = ["إعجابٌ واحد", "إعجابان", "إعجابات", "إعجابًا"];

/** ما يصل المنضدةَ: البرنامجُ كما يراه المستمع الآن، والحلقةُ المفتوحةُ في التحرير بما يُكتب فيها */
export type RadioStageDraft = {
  show: PublicShow;
  /** الحلقاتُ التي يراها المستمع: المنشورةُ وفيها ما يُسمَع (حدُّ `radio_episodes_publish_guard`) */
  listed: PublicEpisode[];
  platforms: { platform: Platform; url: string }[];
  /** الحلقةُ المفتوحة: تُرى صفحتُها بدل صفحة البرنامج */
  episode: PublicEpisode | null;
};

type EpForm = {
  number: string; title: string; slug: string;
  summary: string; notes: string; transcript: string; hostId: string;
  youtubeUrl: string; talkStart: string;
};
const emptyEp = (nextNumber: number, hostId: string): EpForm => ({
  number: String(nextNumber), title: "", slug: "", summary: "", notes: "", transcript: "", hostId, youtubeUrl: "", talkStart: "",
});
const same = (a: EpForm | null, b: EpForm | null) => !!a && !!b && (Object.keys(a) as (keyof EpForm)[]).every((k) => a[k] === b[k]);

/** أفيها ما يُسمَع؟ المساران معًا، أو المكسُ القديم وحدَه — حدُّ النشر نفسُه الذي يحرسه `radio_episodes_publish_guard` */
const playable = (e: EpisodeRow) => Boolean(e.music) || Boolean(e.plain && e.stem);

/** مدّةُ الملفّ الصوتيّ بالثواني تُقرأ من الملفّ نفسه في المتصفّح (كما كانت) */
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

/** الزمنُ المتبقّي من سرعةٍ مقيسةٍ حتّى اللحظة، ويُكتم قبل أن يمضي ما يُقاس عليه (كما كان) */
function etaSeconds(loaded: number, total: number, startedAt: number): number | null {
  const elapsed = (Date.now() - startedAt) / 1000;
  if (elapsed < 1.5 || loaded <= 0) return null;
  const rate = loaded / elapsed;
  if (!(rate > 0)) return null;
  return Math.max(0, Math.round((total - loaded) / rate));
}

type Uploading = { epId: string; label: string; step: number; steps: number; pct: number; loaded: number; total: number; startedAt: number };

export function ShowEditorRoom({ show, episodes: initial, platforms, members, showTalkStart, dry }: {
  show: ShowRow; episodes: EpisodeRow[]; platforms: PlatformRow[]; members: MemberOption[]; showTalkStart: number;
  /** مختبر: كلُّ فعلٍ يُجرى على الصفحة وحدها ولا يُحفظ (والقراءةُ حقيقيّة) */
  dry?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  // في المختبر تُحمل الحلقاتُ وحالُ البرنامج محلّيًّا، وفي الحقيقة من الخادم بعد كلّ فعل (`router.refresh`) كما كان
  const [local, setLocal] = useState(initial);
  const episodes = dry ? local : initial;
  const [labStatus, setLabStatus] = useState(show.status);
  const showStatus = dry ? labStatus : show.status;
  const warned = useRef(false);
  const labNote = () => { if (!warned.current) { warned.current = true; toast.info("مختبر: ما تفعله هنا لا يُحفظ."); } };
  const patchLocal = (id: string, p: Partial<EpisodeRow>) => setLocal((l) => l.map((e) => (e.id === id ? { ...e, ...p } : e)));

  /** القطعةُ المفتوحة: حلقةٌ بمعرّفها، أو «new» حلقةٌ جديدة */
  const [open, setOpen] = useState<string | null>(null);
  const [form, setForm] = useState<EpForm | null>(null);
  const [base, setBase] = useState<EpForm | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [errs, setErrs] = useState<Partial<Record<keyof EpForm, string>>>({});
  const [loading, setLoading] = useState<string | null>(null);
  /** الحلقةُ التي يُنتظر جلبُها: جوابٌ يصل بعد أن فُتح غيرُها أو طُويت يُرمى (كان يكتب نصوصَها فوق «حلقةٍ جديدة»، المراجع ٢٠٢٦-١١-١٦) */
  const awaiting = useRef<string | null>(null);
  /** تبديلُ القطعة وفي المفتوحة ما لم يُحفظ */
  const [ask, setAsk] = useState<{ next: () => void } | null>(null);
  const [pane, setPane] = useState<"edit" | "stage">("edit");

  /** المساران المختاران للحلقة المفتوحة قبل رفعهما (كانا في نافذة الصوت) */
  const [picks, setPicks] = useState<{ plain: File | null; stem: File | null }>({ plain: null, stem: null });
  const [uploading, setUploading] = useState<Uploading | null>(null);
  const [computingWave, setComputingWave] = useState<string | null>(null);
  const [confirmDrop, setConfirmDrop] = useState<{ ep: EpisodeRow; variant: AudioVariant } | null>(null);
  const [confirmKill, setConfirmKill] = useState<EpisodeRow | null>(null);
  const [schedule, setSchedule] = useState<{ ep: EpisodeRow; at: string } | null>(null);

  const [links, setLinks] = useState<Record<string, string>>(() => Object.fromEntries(platforms.map((p) => [p.platform, p.url])));
  const savedLinks = useMemo(() => Object.fromEntries(platforms.map((p) => [p.platform, p.url])), [platforms]);
  const [labLinks, setLabLinks] = useState(savedLinks);
  const linkBase = dry ? labLinks : savedLinks;
  const linksDirty = PLATFORM_VALUES.some((p) => (links[p] ?? "").trim() !== (linkBase[p] ?? "").trim());
  const [uploadingLogo, setUploadingLogo] = useState<number | null>(null);
  const [labLogo, setLabLogo] = useState(show.logoUrl);
  const logoUrl = dry ? labLogo : show.logoUrl;

  const memberOptions = useMemo(() => members.map((m) => ({ value: m.value, label: m.label })), [members]);
  const nextNumber = useMemo(() => (episodes.length ? Math.max(...episodes.map((e) => e.number)) + 1 : 1), [episodes]);

  const dirty = !!form && !same(form, base);
  const hasPicks = !!(picks.plain || picks.stem);
  const leave = useLeaveGuard(dirty || hasPicks || linksDirty || uploading !== null || uploadingLogo !== null);

  /** فعلٌ واحدٌ على الخادم (كما كان: نجاحُه رسالتُه ثمّ تحديث)، وفي المختبر يُجرى محلّيًّا وحده */
  /** أيُّ فعلٍ يجري: يدور زرُّه وحده (كانت أزرارُ الغرفة كلُّها تدور مع كلّ فعل، المراجع ٢٠٢٦-١١-١٦) */
  const [acting, setActing] = useState<string | null>(null);
  const spin = (key: string) => pending && acting === key;
  const run = (key: string, call: () => Promise<{ ok: boolean; message: string }>, apply: () => void, after?: () => void) => {
    if (dry) { labNote(); apply(); after?.(); return; }
    setActing(key);
    startPending(async () => {
      const r = await call();
      if (r.ok) { toast.success(r.message); after?.(); router.refresh(); } else toast.error(r.message);
    });
  };

  /* ── فتحُ القطع: المحاورُ والتفريغُ نصوصٌ قد تطول فتُجلب عند الفتح وحده (كما كانت) ── */
  const close = () => { awaiting.current = null; setLoading(null); setOpen(null); setForm(null); setBase(null); setErrs({}); setPicks({ plain: null, stem: null }); };
  const guard = (next: () => void) => {
    // **الرفعُ لا يُترك في منتصفه**: كانت نافذتُه تقفل الغرفة، فصار تبديلُ القطعة يُردّ حتى يكتمل
    if (uploading) { toast.info("يُرفع مسارٌ الآن: انتظر حتى يكتمل."); return; }
    if (dirty || hasPicks) setAsk({ next }); else next();
  };
  const openNew = () => guard(() => {
    const f = emptyEp(nextNumber, show.hostId);
    awaiting.current = null; setLoading(null);
    setOpen("new"); setForm(f); setBase(f); setSlugTouched(false); setErrs({}); setPicks({ plain: null, stem: null });
  });
  const openEp = (e: EpisodeRow) => guard(() => {
    if (open === e.id) { close(); return; }
    setOpen(e.id); setForm(null); setBase(null); setErrs({}); setPicks({ plain: null, stem: null }); setLoading(e.id);
    awaiting.current = e.id;
    void loadEpisode(e.id).then((full) => {
      if (awaiting.current !== e.id) return;
      awaiting.current = null;
      setLoading(null);
      if (!full.ok || !full.episode) { toast.error(full.message ?? "تعذّر جلب الحلقة."); setOpen((o) => (o === e.id ? null : o)); return; }
      const x = full.episode;
      const f: EpForm = {
        number: String(x.number), title: x.title, slug: x.slug, summary: x.summary ?? "", notes: x.notes ?? "", transcript: x.transcript ?? "",
        hostId: x.hostId, youtubeUrl: x.youtubeUrl ?? "", talkStart: x.talkStartsAt === null ? "" : formatTalkStart(x.talkStartsAt),
      };
      setForm(f); setBase(f); setSlugTouched(true);
    });
  });
  const patch = (p: Partial<EpForm>) => setForm((f) => (f ? { ...f, ...p } : f));
  const onTitle = (v: string) => setForm((f) => {
    if (!f) return f;
    const next = { ...f, title: v };
    if (!slugTouched) next.slug = slugify(v) || `ep-${next.number}`;
    return next;
  });

  /* ── حفظُ الحلقة: التحقّقُ نفسُه والمدخلاتُ نفسُها ── */
  const submit = () => {
    if (!form) return;
    const s = form;
    const e: Partial<Record<keyof EpForm, string>> = {};
    if (!s.title.trim()) e.title = "عنوان الحلقة مطلوب.";
    if (!slugify(s.slug)) e.slug = "المعرّف مطلوب: أحرف لاتينيّة وأرقام.";
    if (!/^\d+$/.test(s.number) || Number(s.number) < 1) e.number = "رقم الحلقة يبدأ من 1.";
    if (s.youtubeUrl.trim() && !/^https:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(s.youtubeUrl.trim())) e.youtubeUrl = "يبدأ بـ https://youtube.com أو https://youtu.be.";
    const talkStart = parseTalkStart(s.talkStart);
    if (talkStart !== null && Number.isNaN(talkStart)) e.talkStart = "ثوانٍ ورقمٌ عشريٌّ اختياريّ، مثل 10.633.";
    setErrs(e);
    if (Object.keys(e).length) return;
    const input = {
      showId: show.id, number: Number(s.number), title: s.title, slug: s.slug, summary: s.summary || null, notes: s.notes || null,
      transcript: s.transcript || null, hostId: s.hostId || null, youtubeUrl: s.youtubeUrl.trim() || null, talkStartsAt: talkStart,
    };
    const editing = open && open !== "new" ? episodes.find((x) => x.id === open) ?? null : null;
    const host = members.find((m) => m.value === s.hostId)?.label ?? "—";
    run("save",
      () => (editing ? updateEpisode(editing.id, input) : createEpisode(input)),
      () => {
        if (editing) patchLocal(editing.id, { number: input.number, title: s.title.trim(), slug: slugify(s.slug), summary: input.summary, youtubeUrl: input.youtubeUrl, hostName: host,
          talkStartsAt: talkStart ?? showTalkStart, talkStartOverridden: talkStart !== null });
        else setLocal((l) => [{
          id: `lab-${l.length + 1}`, number: input.number, title: s.title.trim(), slug: slugify(s.slug), summary: input.summary, status: "draft" as const, music: null, plain: null, stem: null,
          hasVoiceWave: false, hasMixedWave: false, musicUrl: null, plainUrl: null, stemUrl: null, talkStartsAt: talkStart ?? showTalkStart, talkStartOverridden: talkStart !== null,
          youtubeUrl: input.youtubeUrl, hostName: host, publishAt: null, publishedAt: null, plays: 0, playsPlain: 0, listeners: 0, likes: 0,
        }, ...l].sort((a, b) => b.number - a.number));
      },
      // الجديدةُ تُطوى بعد إنشائها (كانت النافذةُ تُغلق): تُفتح من سطرها لرفع مساريها. والمعدّلةُ تبقى مفتوحةً بما حُفظ
      () => { if (editing) setBase(form); else close(); },
    );
  };

  /* ── حالُ البرنامج والحلقة ── */
  const runShowStatus = (op: "publish" | "unpublish") => run(`show:${op}`, () => setShowStatus(show.id, op), () => setLabStatus(op === "publish" ? "published" : "draft"));
  const runEpStatus = (e: EpisodeRow, op: "publish" | "unpublish" | "archive") => run(`ep:${op}`, () => setEpisodeStatus(e.id, op),
    () => patchLocal(e.id, { status: op === "publish" ? "published" : op === "archive" ? "archived" : "draft", publishedAt: op === "publish" ? e.publishedAt ?? new Date().toISOString() : e.publishedAt }));
  const runSchedule = () => {
    const sc = schedule;
    if (!sc) return;
    run("schedule", () => setEpisodeStatus(sc.ep.id, "schedule", new Date(sc.at).toISOString()),
      () => patchLocal(sc.ep.id, { status: "scheduled", publishAt: new Date(sc.at).toISOString() }), () => setSchedule(null));
  };
  const doDelete = () => {
    const t = confirmKill;
    if (!t) return;
    run("delete", () => deleteEpisode(t.id), () => setLocal((l) => l.filter((e) => e.id !== t.id)), () => { setConfirmKill(null); if (open === t.id) close(); });
  };
  const doDrop = () => {
    const d = confirmDrop;
    if (!d) return;
    run("drop", () => clearEpisodeAudio(d.ep.id, d.variant), () => patchLocal(d.ep.id, d.variant === "plain" ? { plain: null, plainUrl: null } : { stem: null, stemUrl: null }),
      () => setConfirmDrop(null));
  };

  /* ── الشعار ── */
  const onLogo = async (file: File) => {
    const why = checkFile(file, LOGO_RULE);
    if (why) { toast.error(why); return; }
    if (dry) { labNote(); setLabLogo(URL.createObjectURL(file)); return; }
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

  /* ── المنصّات ── */
  const saveLinks = () => {
    const payload = PLATFORM_VALUES.map((p) => ({ platform: p as Platform, url: (links[p] ?? "").trim() })).filter((l) => l.url);
    run("links", () => saveShowPlatforms(show.id, payload), () => setLabLinks(Object.fromEntries(payload.map((l) => [l.platform, l.url]))));
  };

  /* ── المساران: يُرفعان بالتتابع لا معًا، والموجتان بعد الرفع لا أثناءه (كما كان حرفًا) ── */
  const durationOf = async (file: File): Promise<number> => (await readDuration(file)) || (await computePeaks(file))?.duration || 0;
  const saveWaves = async (e: EpisodeRow, plainFile?: File | null, stemFile?: File | null) => {
    const voice = plainFile ?? e.plainUrl ?? null;
    const music = stemFile ?? e.stemUrl ?? null;
    let done = 0;
    if (voice) {
      const w = await computePeaks(voice);
      if (w && (await setEpisodePeaks(e.id, "plain", w.peaks)).ok) done++;
    }
    if (voice && music) {
      const w = await computeMixedPeaks(voice, music);
      if (w && (await setEpisodePeaks(e.id, "mixed", w.peaks)).ok) done++;
    } else if (e.musicUrl) {
      const w = await computePeaks(e.musicUrl);
      if (w && (await setEpisodePeaks(e.id, "mixed", w.peaks)).ok) done++;
    }
    return done;
  };
  const runUpload = async (ep: EpisodeRow) => {
    if (uploading) return;
    const jobs = ([["plain", picks.plain], ["stem", picks.stem]] as [AudioVariant, File | null][]).filter((j): j is [AudioVariant, File] => Boolean(j[1]));
    if (!jobs.length) { toast.error("اختر ملفًّا واحدًا على الأقلّ."); return; }
    if (dry) {
      labNote();
      for (const [variant, file] of jobs) {
        const seconds = Math.round(await durationOf(file));
        if (!seconds) { toast.error(`تعذّرت قراءة مدّة ${VARIANT_META[variant].verb}. تأكّد أنّه ملفّ صوتٍ سليم.`); return; }
        patchLocal(ep.id, variant === "plain" ? { plain: { seconds, bytes: file.size } } : { stem: { seconds, bytes: file.size } });
      }
      setPicks({ plain: null, stem: null });
      return;
    }
    let warnedMsg: string | undefined;
    for (const [i, [variant, file]] of jobs.entries()) {
      // eslint-disable-next-line react-hooks/purity -- يدُ زرٍّ لا رسمة: ساعةُ بدء الرفعة (كما كانت في `ShowEditorView`)
      setUploading({ epId: ep.id, label: VARIANT_META[variant].verb, step: i + 1, steps: jobs.length + 1, pct: 0, loaded: 0, total: file.size, startedAt: Date.now() });
      const duration = await durationOf(file);
      if (!duration) { toast.error(`تعذّرت قراءة مدّة ${VARIANT_META[variant].verb}. تأكّد أنّه ملفّ صوتٍ سليم.`); setUploading(null); return; }
      const ticket = await createAudioUploadUrl(show.id, ep.id, variant, file.type, file.size);
      if (!ticket.ok || !ticket.url || !ticket.path) { toast.error(ticket.message ?? "تعذّر الرفع."); setUploading(null); return; }
      const put = await putWithProgress(ticket.url, file, (f) => setUploading((u) => (u ? { ...u, pct: f, loaded: Math.round(f * u.total) } : u)));
      if (!put.ok) { toast.error(put.message, { duration: 12000 }); setUploading(null); return; }
      const r = await setEpisodeAudio(ep.id, variant, ticket.path, file.size, duration, file.type);
      if (!r.ok) { toast.error(r.message); setUploading(null); return; }
      if (r.warning) warnedMsg = r.warning;
    }
    // eslint-disable-next-line react-hooks/purity -- يدُ الزرّ نفسُها
    setUploading({ epId: ep.id, label: "حساب الموجة", step: jobs.length + 1, steps: jobs.length + 1, pct: 0, loaded: 0, total: 0, startedAt: Date.now() });
    await saveWaves(ep, picks.plain, picks.stem);
    setUploading(null);
    setPicks({ plain: null, stem: null });
    toast.success(jobs.length === 2 ? "رُفع المساران." : VARIANT_META[jobs[0][0]].uploaded + ".");
    if (warnedMsg) toast.warning(warnedMsg, { duration: 12000 });
    router.refresh();
  };
  const computeWave = async (e: EpisodeRow) => {
    if (computingWave) return;
    if (dry) { labNote(); return; }
    setComputingWave(e.id);
    try {
      const done = await saveWaves(e);
      if (done) { toast.success(done === 2 ? "حُسبت موجتا الحلقة." : "حُسبت موجةٌ واحدة."); router.refresh(); }
      else toast.error("تعذّر فكّ ملفّات الحلقة.");
    } finally {
      setComputingWave(null);
    }
  };
  const pick = (variant: "plain" | "stem", f: File) => {
    // الصوتُ يمرّ على البوّابة كغيره: ساعةٌ من MP3 تُردّ قبل أن تُرفَع
    const bad = checkFile(f, AUDIO_RULE);
    if (bad) { toast.error(bad); return; }
    setPicks((p) => ({ ...p, [variant]: f }));
  };

  /* ── سطرُ الحلقة مطويّةً: حالُها، ثمّ ما يُسمَع منها أو ما ينقصها ── */
  const subOf = (e: EpisodeRow) => {
    const st = EPISODE_STATUS_META[e.status].label;
    const len = e.plain?.seconds ?? e.music?.seconds ?? e.stem?.seconds;
    const miss = !e.plain && !e.stem && !e.music ? "بلا مسارين" : !playable(e) ? (e.plain ? "بلا مسار موسيقى" : "بلا مسار صوت") : null;
    const when = e.status === "scheduled" && e.publishAt ? fmtStamp(e.publishAt) : null;
    return [st, when, miss ?? (len ? formatDuration(len) : null), e.status === "published" && e.plays ? arCount(e.plays, AR_PLAY) : null].filter(Boolean).join("، ");
  };

  const fields = (f: EpForm) => (
    <div className="form-grid">
      <Field className="form-full" label="عنوان الحلقة" icon={<MicrophoneStage />} innerIcon={<PencilSimple />} placeholder="حين تكتب الكلمة نفسها"
        value={f.title} onChange={(e) => onTitle(e.target.value)} error={errs.title} required />
      <Field label="رقم الحلقة" icon={<Playlist />} innerIcon={<Hash />} placeholder="1" charset="digits"
        value={f.number} onChange={(e) => patch({ number: e.target.value })} error={errs.number} required />
      <Field label="بداية الحديث (ثانية)" icon={<Waveform />} innerIcon={<Hash />} placeholder="10:19" charset="latin"
        value={f.talkStart} onChange={(e) => patch({ talkStart: e.target.value })} error={errs.talkStart}
        helper={(() => {
          const v = parseTalkStart(f.talkStart);
          const read = v !== null && !Number.isNaN(v) ? ` تُقرأ ${formatTalkStart(v)}ث.` : "";
          return `اتركه فارغًا فيرث ${formatTalkStart(showTalkStart)}ث من البرنامج. ولا تملأه إلّا إن اختلفت مقدّمةُ هذه الحلقة.${read}`;
        })()}
        optional />
      <Field className="form-full" label="المعرّف (رابط الحلقة)" icon={<LinkSimple />} innerIcon={<Hash />} placeholder="ep-1" charset="latin"
        value={f.slug} onChange={(e) => { setSlugTouched(true); patch({ slug: e.target.value }); }} error={errs.slug} required />
      <Select className="form-full" label="مقدّم هذه الحلقة" icon={<User />} options={memberOptions} value={f.hostId} onValueChange={(v) => patch({ hostId: v })}
        helper="يُختم من مقدّم البرنامج، وغيِّره إن ناب عنه أحدٌ في هذه الحلقة." searchable required />
      <Field className="form-full" label="الفيديو على يوتيوب" icon={<YoutubeLogo />} innerIcon={<LinkSimple />} placeholder="https://youtu.be/…" charset="latin"
        value={f.youtubeUrl} onChange={(e) => patch({ youtubeUrl: e.target.value })} error={errs.youtubeUrl}
        helper="رابطٌ يحيل من صفحة الحلقة. التجربةُ عندنا صوتيّة، فلا يُضمَّن المشغّل." optional />
      <Textarea className="form-full" label="الملخّص" icon={<TextAlignLeft />} innerIcon={<PencilSimple />} placeholder="سطرٌ أو سطران يظهران في بطاقة الحلقة وصفحتها…" rows={2}
        value={f.summary} onChange={(e) => patch({ summary: e.target.value })} optional />
      <Textarea className="form-full" label="المحاور والروابط" icon={<FileText />} innerIcon={<PencilSimple />} placeholder="محاور الحلقة وما ذُكر فيها من كتبٍ وروابط…" rows={4}
        value={f.notes} onChange={(e) => patch({ notes: e.target.value })} optional />
      <Textarea className="form-full" label="التفريغ النصّيّ" icon={<MusicNotes />} innerIcon={<PencilSimple />} placeholder="نصّ الحلقة مفرَّغًا، وصوليّةٌ وبحثٌ وأرشيف…" rows={4}
        value={f.transcript} onChange={(e) => patch({ transcript: e.target.value })} optional />
    </div>
  );

  /** حالُ الحلقة وفعلُ مرحلتها في رأس القطعة المفتوحة (كانت في «⋯»: نشر الآن، جدولة، إلغاء النشر) */
  const statusNote = (e: EpisodeRow) => {
    const can = playable(e);
    const go = (
      <>
        <AdButton variant="fill" size="sm" icon={<Megaphone />} held={!can} busy={spin("ep:publish")} onClick={() => runEpStatus(e, "publish")}>انشرها الآن</AdButton>
        <AdButton variant="line" size="sm" icon={<Clock />} held={!can} onClick={() => setSchedule({ ep: e, at: "" })}>{e.status === "scheduled" ? "غيّر موعدها" : "جدولها"}</AdButton>
      </>
    );
    if (e.status === "published") {
      // **البرنامجُ المسوّدةُ يُخفي حلقاتِه المنشورة** (المراجع ٢٠٢٦-١١-١٦): فلا «يسمعها الناس» ولا رابطٌ يقع على صفحةٍ غائبة
      const heard = showStatus === "published";
      return (
        <AdNote tone="ok" title={heard ? "منشورة: يسمعها الناس" : "منشورة: تُسمع حين يُنشر البرنامج"}
          action={(
            <>
              {heard ? <AdButton variant="line" size="sm" icon={<ArrowSquareOut />} href={`/radio/${show.slug}/${e.slug}`} external>افتحها</AdButton> : null}
              <AdButton variant="line" size="sm" icon={<EyeSlash />} busy={spin("ep:unpublish")} onClick={() => runEpStatus(e, "unpublish")}>أوقف النشر</AdButton>
            </>
          )}>
          {e.plays ? `${arCount(e.plays, AR_PLAY)}${e.playsPlain > 0 ? ` (منها ${e.playsPlain} بلا موسيقى)` : ""}، من ${arCount(e.listeners, AR_LISTENER)}، و${arCount(e.likes, AR_LIKE)}.` : "لم يسمعها أحدٌ بعد."}
        </AdNote>
      );
    }
    const why = can ? null : "ارفع مساريها لتُنشر.";
    if (e.status === "scheduled") {
      return <AdNote tone="info" title={`مجدولة: تُنشر ${e.publishAt ? fmtStamp(e.publishAt) : "في موعدها"}`} action={go}>تظهر في الإذاعة وحدها في موعدها.</AdNote>;
    }
    return (
      <AdNote tone="info" title={e.status === "archived" ? "مؤرشفة: لا تظهر في الإذاعة" : "مسوّدة: لا يسمعها أحد"} action={go}>
        {why ?? "انشرها الآن، أو جدولها لموعد."}
      </AdNote>
    );
  };

  /** مسارا الحلقة بحقل الرفع: المرفوعُ بمدّته وحجمه، والمختارُ باسمه، و«إزالة» تنزع المرفوعَ بتأكيد أو تترك المختار */
  const tracks = (e: EpisodeRow) => (
    <div className="ad-rshow-tracks">
      <p className="ad-rshow-k">مسارا الحلقة: تصديرتان من تايم لاينٍ واحد، هذا بكتم الموسيقى وذاك بكتم الصوت</p>
      {(["plain", "stem"] as const).map((variant) => {
        const file = picks[variant];
        const has = variant === "plain" ? e.plain : e.stem;
        return (
          <AdUpload key={variant} label={VARIANT_META[variant].verb} icon={variant === "plain" ? <SpeakerSimpleNone /> : <MusicNotes />} noun="file" value={null} required
            accept={AUDIO_RULE.accept} alt="" busy={uploading !== null}
            help={variant === "plain" ? "الحلقةُ بكتم مسار الموسيقى" : "الحلقةُ بكتم مسار الصوت"}
            file={file ? { name: file.name, meta: `${formatBytes(file.size)}، يُرفع حين تضغط «ارفع»`, icon: <UploadSimple /> }
              : has ? { name: `مرفوعٌ، ${formatDuration(has.seconds)}`, meta: formatBytes(has.bytes), icon: variant === "plain" ? <SpeakerSimpleNone /> : <MusicNotes /> } : null}
            onFile={(f) => pick(variant, f)}
            onClear={file ? () => setPicks((p) => ({ ...p, [variant]: null })) : has ? () => setConfirmDrop({ ep: e, variant }) : undefined} />
        );
      })}
      {!takesAligned(e.plain, e.stem) ? <AdNote tone="bad" title="مدّتا المسارين مختلفتان">حقُّهما التساوي: تصديرٌ مقصوصٌ أو ملفٌّ رُفع في غير موضعه، فتسبق الموسيقى الكلامَ أو تتخلّف.</AdNote> : null}
      {e.music && !(e.plain && e.stem) ? <p className="ad-rshow-k">تعمل الآن بمكسها القديم ({formatDuration(e.music.seconds)})، ويخلفه المساران حين يُرفعان.</p> : null}
      {uploading && uploading.epId === e.id ? (
        <div className="ad-rshow-prog">
          <span className="ad-figure-v">
            <span role="status">{uploading.label}{uploading.steps > 1 ? `، ${uploading.step} من ${uploading.steps}` : ""}</span>
            {uploading.pct > 0 ? <span className="ad-meter-pct">{Math.round(uploading.pct * 100)}%</span> : null}
          </span>
          <meter className="ad-meter" min={0} max={1} value={uploading.pct} aria-label={uploading.label} />
          {uploading.total ? (
            <span className="ad-rshow-k">
              {formatBytes(uploading.loaded)} من {formatBytes(uploading.total)}
              {(() => { const eta = etaSeconds(uploading.loaded, uploading.total, uploading.startedAt); return eta === null ? null : <>، بقي <bdi dir="ltr">{formatDuration(eta) || "0:01"}</bdi></>; })()}
            </span>
          ) : null}
        </div>
      ) : null}
      <span className="ad-rshow-acts">
        <AdButton variant="fill" size="sm" icon={<UploadSimple />} busy={uploading?.epId === e.id} held={!hasPicks || uploading !== null} onClick={() => void runUpload(e)}>
          {picks.plain && !picks.stem ? "ارفع مسار الصوت" : picks.stem && !picks.plain ? "ارفع مسار الموسيقى" : "ارفع المسارين"}
        </AdButton>
        {e.music || e.plain || e.stem ? (
          <AdButton variant="line" size="sm" icon={<Waveform />} busy={computingWave === e.id} held={computingWave !== null || uploading !== null} onClick={() => void computeWave(e)}>احسب الموجة</AdButton>
        ) : null}
      </span>
    </div>
  );

  const block = (e: EpisodeRow) => {
    const isOpen = open === e.id;
    return (
      <div key={e.id} className="ad-wblk-slot">
        <WorkBlock n={e.number} title={e.title} sub={subOf(e)} warn={takesAligned(e.plain, e.stem) ? undefined : "مدّتا المسارين مختلفتان"}
          open={isOpen} onToggle={() => openEp(e)}
          acts={isOpen && form ? (
            <>
              <span className="ad-wblk-foot-g">
                <AdButton variant="fill" size="sm" icon={<PencilSimple />} held={!dirty} busy={spin("save")} onClick={submit}>احفظ الحلقة</AdButton>
                {e.status === "archived" ? null : <AdButton variant="line" size="sm" icon={<Archive />} busy={spin("ep:archive")} onClick={() => runEpStatus(e, "archive")}>أرشفة</AdButton>}
              </span>
              {/* المنشورةُ لا تُحذف (رابطُها قد يكون مبثوثًا): تُؤرشف أوّلًا، والخادمُ يردّها كما كان */}
              <AdButton variant="danger" size="sm" icon={<Trash />} held={e.status === "published"} onClick={() => setConfirmKill(e)}>حذف</AdButton>
            </>
          ) : undefined}>
          {loading === e.id || !form ? (
            <span className="ad-wb-wait ad-rshow-wait" role="status" aria-label="تُجلب الحلقة"><span className="ad-spin" aria-hidden /></span>
          ) : (
            <div className="ad-rshow-body">
              {statusNote(e)}
              {fields(form)}
              {tracks(e)}
            </div>
          )}
        </WorkBlock>
      </div>
    );
  };

  const fresh = open === "new" && form ? (
    <div key="new" className="ad-wblk-slot">
      <WorkBlock n={Number(form.number) || nextNumber} title={form.title.trim() || "حلقةٌ جديدة"} untitled={!form.title.trim()} sub="تُحفظ مسوّدةً، ثمّ ترفع مساريها من سطرها"
        open onToggle={() => guard(close)}
        acts={(
          <span className="ad-wblk-foot-g">
            <AdButton variant="fill" size="sm" icon={<Plus />} busy={spin("save")} onClick={submit}>أنشئ الحلقة</AdButton>
            <AdButton plain variant="line" size="sm" onClick={() => guard(close)}>إلغاء</AdButton>
          </span>
        )}>
        {fields(form)}
      </WorkBlock>
    </div>
  ) : null;

  const published = showStatus === "published";
  // **حالُ البرنامج وفعلُ مرحلته فوق التحرير** (كالكتيّب والخبر). و«إلغاء النشر» كانت في «⋯» الرأس، فصارت فعلًا ظاهرًا بجانب «افتحه»
  const lead = published ? (
    <AdNote tone="ok" title="منشورٌ في الإذاعة"
      action={(
        <>
          <AdButton variant="line" size="sm" icon={<ArrowSquareOut />} href={`/radio/${show.slug}`} external>افتحه</AdButton>
          <AdButton variant="line" size="sm" icon={<EyeSlash />} busy={spin("show:unpublish")} onClick={() => runShowStatus("unpublish")}>أوقف النشر</AdButton>
        </>
      )}>
      يراه المستمعون بحلقاته المنشورة، وما تحفظه هنا يرونه في لحظته.
    </AdNote>
  ) : (
    <AdNote tone="info" title="مسوّدة: لا يراه المستمعون"
      action={<AdButton variant="fill" size="sm" icon={<Megaphone />} busy={spin("show:publish")} onClick={() => runShowStatus("publish")}>انشر البرنامج</AdButton>}>
      اكتب حلقاته وارفع مساريها، ثمّ انشره.
    </AdNote>
  );

  const editing = (
    <>
      <FormSection id="episodes" icon={<Playlist />} title="الحلقات"
        sub={episodes.length ? `${arCount(episodes.length, AR_EPISODE)}، الأحدثُ أوّلًا` : "أنشئ الحلقة الأولى: تُحفظ مسوّدةً، ثمّ ترفع مساريها فتُقرأ مدّتاهما وحدهما، ثمّ تنشرها"}
        act={open === "new" ? undefined : <AdButton variant="line" size="sm" icon={<Plus />} onClick={openNew}>حلقةٌ جديدة</AdButton>}>
        {episodes.length || fresh ? <div className="ad-wblks">{fresh}{episodes.map(block)}</div> : null}
      </FormSection>
      <FormSection id="identity" icon={<ImageIcon />} title="الهويّة والمنصّات" sub="شعارُ البرنامج، وروابطُه على المنصّات">
        {/* الشعارُ بجانب الروابط لا قسمٌ لمربّعٍ وحده (قاعدةُ شعار الراعي، `FormWith`)، وفي الضيّق فوقها */}
        <FormWith aside={(
          <AdUpload label="الشعار" icon={<ImageIcon />} shape="square" value={logoUrl} accept={LOGO_RULE.accept} alt={`شعار ${show.title}`}
            busy={uploadingLogo !== null} help="مربّعٌ لا يقلّ عن 1400×1400." onFile={(f) => void onLogo(f)} />
        )}>
          <div className="form-grid">
            {PLATFORM_VALUES.map((p) => (
              <Field key={p} className="form-full" label={PLATFORM_META[p].label} icon={<LinkSimple />} innerIcon={<Hash />} placeholder="https://…" charset="latin"
                value={links[p] ?? ""} onChange={(ev) => setLinks((prev) => ({ ...prev, [p]: ev.target.value }))} optional />
            ))}
          </div>
        </FormWith>
        <span className="ad-rgx-title-acts ad-rgx-foot">
          <AdButton variant="fill" icon={<LinkSimple />} held={!linksDirty} busy={spin("links")} onClick={saveLinks}>احفظ الروابط</AdButton>
        </span>
      </FormSection>
    </>
  );

  /* ── المنضدة: البرنامجُ كما يراه المستمع، والحلقةُ المفتوحةُ بما يُكتب فيها ── */
  const host = (id: string) => members.find((m) => m.value === id)?.label ?? null;
  const toPublic = (e: EpisodeRow): PublicEpisode => ({
    id: e.id, slug: e.slug, number: e.number, title: e.title, summary: e.summary, notes: null, transcript: null, hostName: e.hostName === "—" ? null : e.hostName,
    musicUrl: e.musicUrl, plainUrl: e.plainUrl, stemUrl: e.stemUrl, musicSeconds: e.music?.seconds ?? null, plainSeconds: e.plain?.seconds ?? null,
    musicPeaks: null, plainPeaks: null, talkStartsAt: e.talkStartsAt, youtubeUrl: e.youtubeUrl, publishedAt: e.publishedAt, dateLabel: fmtDate(e.publishedAt),
    likes: e.likes, plays: e.plays,
  });
  const listed = episodes.filter((e) => e.status === "published" && playable(e)).map(toPublic);
  const openRow = open && open !== "new" ? episodes.find((e) => e.id === open) ?? null : null;
  const talk = form ? parseTalkStart(form.talkStart) : null;
  const live: PublicEpisode | null = form && (openRow || open === "new") ? {
    ...(openRow ? toPublic(openRow) : {
      id: "new", slug: "", plays: 0, likes: 0, musicUrl: null, plainUrl: null, stemUrl: null, musicSeconds: null, plainSeconds: null,
      musicPeaks: null, plainPeaks: null, publishedAt: null, dateLabel: "", talkStartsAt: showTalkStart,
    } as PublicEpisode),
    title: form.title.trim() || "حلقةٌ جديدة", number: Number(form.number) || nextNumber, slug: slugify(form.slug), summary: form.summary.trim() || null,
    notes: form.notes.trim() || null, transcript: form.transcript.trim() || null, hostName: host(form.hostId), youtubeUrl: form.youtubeUrl.trim() || null,
    talkStartsAt: talk !== null && !Number.isNaN(talk) ? talk : showTalkStart,
  } : null;
  const draft: RadioStageDraft = {
    show: {
      id: show.id, slug: show.slug, title: show.title, tagline: show.tagline, description: show.description, logoUrl, tone: show.tone, talkStartsAt: show.talkStartsAt,
      hostName: show.hostName, isFeatured: show.isFeatured, episodeCount: listed.length,
    },
    listed,
    platforms: PLATFORM_VALUES.map((p) => ({ platform: p as Platform, url: (links[p] ?? "").trim() })).filter((l) => l.url),
    episode: live,
  };
  const stage = <StageFrame src="/frame/radio" kind="radio" payload={draft} title="البرنامج كما يراه المستمع في الإذاعة" />;

  return (
    <>
      <WorkRoom look="b" path="/dashboard/radio" title={show.title} switched view={pane} onView={setPane} stage={stage} stageTitle="كما يراه المستمع في الإذاعة" lead={lead}>
        {editing}
      </WorkRoom>

      <Modal open={schedule !== null} onClose={() => setSchedule(null)} title="جدولة النشر" description="تُنشر الحلقة تلقائيًّا في الموعد فتظهر في الموقع." busy={pending} size="sm"
        footer={(
          <>
            <Button variant="ghost" size="md" onClick={() => setSchedule(null)} disabled={pending}>إلغاء</Button>
            <Button variant="primary" size="md" loading={pending} disabled={!schedule?.at} onClick={runSchedule}>جدولة</Button>
          </>
        )}>
        {schedule ? (
          <Field label="موعد النشر" icon={<CalendarBlank />} innerIcon={<Clock />} placeholder="" type="datetime-local" value={schedule.at}
            onChange={(e) => setSchedule((s) => (s ? { ...s, at: e.target.value } : s))} required />
        ) : null}
      </Modal>

      <AdConfirm open={confirmKill !== null} onClose={() => setConfirmKill(null)} tone="danger" icon={<Trash />} title="حذف الحلقة؟"
        text={confirmKill ? `ستُحذف «${confirmKill.title}» وملفّاها الصوتيّان نهائيًّا. لا استرجاع بعده.` : undefined}
        confirmLabel="حذف" loading={pending} onConfirm={doDelete} />
      <AdConfirm open={confirmDrop !== null} onClose={() => setConfirmDrop(null)} tone="danger" icon={<Trash />}
        title={confirmDrop ? `نزع ${VARIANT_META[confirmDrop.variant].verb}؟` : "نزع المسار؟"}
        text={confirmDrop ? `سيُحذف ${VARIANT_META[confirmDrop.variant].verb} من حلقة «${confirmDrop.ep.title}»، فلا يبقى للحلقة مقبضُ موسيقى ولا مبدّل.` : undefined}
        confirmLabel="نزع" loading={pending} onConfirm={doDrop} />
      <AdConfirm open={ask !== null} onClose={() => setAsk(null)} tone="warning" icon={<PencilSimple />} title="تترك ما كتبتَه؟"
        text="ما كتبتَه في هذه الحلقة، أو اخترتَه من مساريها، ولم يُحفظ سيضيع." confirmLabel="اتركه" cancelLabel="ابقَ فيه"
        onConfirm={() => { const n = ask?.next; setAsk(null); close(); n?.(); }} />
      {leave}
    </>
  );
}
