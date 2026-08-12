"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Button, Field, Select, Textarea, Segmented, Modal } from "@adeeb/design-system";
import {
  Megaphone, Playlist, MicrophoneStage, Hash, LinkSimple, TextAlignLeft, CalendarBlank, Clock,
  Archive, MusicNotes, User, FileText, YoutubeLogo, Waveform, SpeakerSimpleNone,
} from "@phosphor-icons/react";
import { ArrowRight } from "@/app/_components/glyphs";
import { EyeSlash, UploadSimple, Trash, PencilSimple, Plus } from "@/app/_components/glyphs";
import { DataTable, type Column } from "../../_components/DataTable";
import { EmptyState } from "../../_components/EmptyState";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { useToast } from "../../_components/ToastProvider";
import type { MenuGroup } from "../../_components/DropdownMenu";
import type { EpisodeRow, MemberOption, PlatformRow, ShowRow } from "../data";
import {
  DURATION_TOLERANCE_SECONDS, EPISODE_STATUS_META, PLATFORM_META, PLATFORM_VALUES, SHOW_STATUS_META,
  VARIANT_META, episodeLabel, formatBytes, formatDuration, formatTalkStart, parseTalkStart, slugify,
  type AudioVariant, type Platform,
} from "../vocab";
import {
  clearEpisodeAudio, createAudioUploadUrl, createEpisode, createLogoUploadUrl, deleteEpisode,
  loadEpisode, saveShowPlatforms, setEpisodeAudio, setEpisodeStatus, setShowLogo, setShowStatus,
  updateEpisode,
} from "../actions";
import { Breadcrumb } from "../../_shell/Breadcrumb";

type EpForm = {
  number: string; title: string; slug: string;
  summary: string; notes: string; transcript: string; hostId: string;
  youtubeUrl: string; talkStart: string;
};

const emptyEp = (nextNumber: number, hostId: string): EpForm => ({
  number: String(nextNumber), title: "", slug: "",
  summary: "", notes: "", transcript: "", hostId, youtubeUrl: "", talkStart: "",
});

/** أمتّسقةٌ النسختان؟ هما تايم لاينٌ واحد، فحقُّ مدّتيهما التساوي. */
const takesAligned = (e: EpisodeRow): boolean =>
  !e.music || !e.plain || Math.abs(e.music.seconds - e.plain.seconds) <= DURATION_TOLERANCE_SECONDS;

/**
 * الرفعُ إلى المخزن. يردّ رسالةَ عطبٍ أو `null` عند النجاح.
 *
 * ولمَ لا يُترك `fetch` عاريًا؟ لأنّ فشلَ الشبكة **يرمي** ولا يردّ `ok: false` —
 * فيقفز فوق كلّ فحصٍ بعده، ويسقط الرفعُ صامتًا لا يرى صاحبُه شيئًا. وأشهرُ
 * أسبابه أنّ الدلوَ لا يأذن لأصلنا (CORS)، وهو إعدادُ خادمٍ لا خطأُ ملفّ،
 * فيُسمّى باسمه ويُدَلّ على دوائه.
 */
async function putToStore(url: string, file: File): Promise<string | null> {
  try {
    const res = await fetch(url, { method: "PUT", body: file, headers: { "content-type": file.type } });
    return res.ok ? null : `ردّ المخزن ${res.status}. أعِد المحاولة.`;
  } catch {
    return "تعذّر الوصول إلى المخزن. غالبًا أنّ الدلو لا يأذن لهذا الأصل: شغّل «pnpm r2:cors» بتوكن R2 إداريّ.";
  }
}

/**
 * مدّة الملفّ الصوتيّ بالثواني — تُقرأ من الملفّ نفسه في المتصفّح.
 * فلا يُدخلها إنسانٌ بيده: عليها يقوم شريطُ المشغّل وبها يُفحص تساوي النسختين.
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

export function ShowEditorView({
  show, episodes, platforms, members, stationTalkStart,
}: {
  show: ShowRow; episodes: EpisodeRow[]; platforms: PlatformRow[];
  members: MemberOption[]; stationTalkStart: number;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [tab, setTab] = useState<"episodes" | "identity">("episodes");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState<{ id: string; variant: AudioVariant } | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const audioTarget = useRef<{ id: string; variant: AudioVariant } | null>(null);
  const [confirmDropPlain, setConfirmDropPlain] = useState<EpisodeRow | null>(null);

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
    setUploadingLogo(true);
    try {
      const ticket = await createLogoUploadUrl(show.id, file.type, file.size);
      if (!ticket.ok || !ticket.url || !ticket.path) { toast.error(ticket.message ?? "تعذّر الرفع."); return; }
      const failed = await putToStore(ticket.url, file);
      if (failed) { toast.error(failed, { duration: 12000 }); return; }
      const r = await setShowLogo(show.id, ticket.path);
      if (r.ok) { toast.success(r.message); router.refresh(); } else toast.error(r.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  /* ── رفع نسخةٍ صوتيّة ── */
  const onAudio = async (file: File | undefined) => {
    const target = audioTarget.current;
    if (!file || !target) return;
    const { id: episodeId, variant } = target;
    setUploadingAudio(target);
    try {
      const duration = await readDuration(file);
      if (!duration) { toast.error("تعذّرت قراءة مدّة الملفّ. تأكّد أنّه ملفّ صوتٍ سليم."); return; }
      const ticket = await createAudioUploadUrl(show.id, episodeId, variant, file.type, file.size);
      if (!ticket.ok || !ticket.url || !ticket.path) { toast.error(ticket.message ?? "تعذّر الرفع."); return; }
      const failed = await putToStore(ticket.url, file);
      if (failed) { toast.error(failed, { duration: 12000 }); return; }
      const r = await setEpisodeAudio(episodeId, variant, ticket.path, file.size, duration, file.type);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      // الاتّساقُ يُقال بعد النجاح لا بدله: الملفّ محفوظٌ، والمراجعة على صاحبه.
      if (r.warning) toast.warning(r.warning, { duration: 12000 });
      router.refresh();
    } finally {
      setUploadingAudio(null);
      audioTarget.current = null;
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

  const pickAudio = (e: EpisodeRow, variant: AudioVariant) => {
    audioTarget.current = { id: e.id, variant };
    audioRef.current?.click();
  };

  const epMenu = (e: EpisodeRow): MenuGroup[] => [
    { header: "إجراءات", items: [
      { label: "تعديل البيانات", icon: <PencilSimple />, onSelect: () => openEditEp(e) },
    ] },
    { header: "الصوت", items: [
      { label: e.music ? "استبدال النسخة بموسيقى" : "رفع النسخة بموسيقى", icon: <MusicNotes />, onSelect: () => pickAudio(e, "music") },
      { label: e.plain ? "استبدال النسخة المجرّدة" : "رفع النسخة المجرّدة", icon: <SpeakerSimpleNone />, onSelect: () => pickAudio(e, "plain") },
      ...(e.plain ? [{ label: "نزع النسخة المجرّدة", icon: <Trash />, onSelect: () => setConfirmDropPlain(e) }] : []),
    ] },
    { header: "الحالة", items: [
      ...(e.status === "published"
        ? [{ label: "إلغاء النشر", icon: <EyeSlash />, onSelect: () => runEpStatus(e, "unpublish") }]
        : [
            { label: "نشر الآن", icon: <Megaphone />, disabled: !e.music, onSelect: () => runEpStatus(e, "publish") },
            { label: "جدولة", icon: <Clock />, disabled: !e.music, onSelect: () => setSchedule({ ep: e, at: "" }) },
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
      // النسختان في عمودٍ واحد: الحاضرةُ بمدّتها، والغائبةُ بشارةٌ تنادي.
      key: "takes", header: "النسختان", width: "minmax(190px, 1.5fr)",
      render: (e) => (
        <span className="txt" style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {e.music
            ? <span className="num" title={`${VARIANT_META.music.verb}، ${formatBytes(e.music.bytes)}`}>
                <MusicNotes size={14} style={{ verticalAlign: "-2px" }} aria-hidden />{" "}
                <bdi dir="ltr">{formatDuration(e.music.seconds)}</bdi>
              </span>
            : <Badge tone="warning" variant="outline">بلا موسيقى بعد</Badge>}
          {e.plain
            ? <span className="num text-content-muted" title={`${VARIANT_META.plain.verb}، ${formatBytes(e.plain.bytes)}`}>
                <SpeakerSimpleNone size={14} style={{ verticalAlign: "-2px" }} aria-hidden />{" "}
                <bdi dir="ltr">{formatDuration(e.plain.seconds)}</bdi>
              </span>
            : <span className="text-content-muted text-sm">بلا مجرّدة</span>}
          {takesAligned(e) ? null : <Badge tone="danger" variant="outline">مدّتان مختلفتان</Badge>}
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
    { key: "plays", header: "الاستماع", width: "0.8fr", align: "center", render: (e) => <span className="txt num">{e.plays}</span> },
  ], []);

  const tabs = [
    { value: "episodes", label: `الحلقات (${episodes.length})` },
    { value: "identity", label: "الهويّة والمنصّات" },
  ];

  return (
    <>
      <div className="ash-phead">
        <div>
          <Breadcrumb leaf={show.title} />
          <h1>{show.title}</h1>
        </div>
        <div className="form-head-actions">
          <Badge tone={SHOW_STATUS_META[show.status].tone} dot>{SHOW_STATUS_META[show.status].label}</Badge>
          <Link href="/dashboard/radio" className="abtn abtn-ghost abtn-md"><ArrowRight size={18} />رجوع</Link>
          {show.status === "published" ? (
            <Button variant="ghost" size="md" loading={pending} onClick={() => runShowStatus("unpublish")}><EyeSlash size={18} />إلغاء النشر</Button>
          ) : (
            <Button variant="primary" size="md" loading={pending} onClick={() => runShowStatus("publish")}><Megaphone size={18} />نشر البرنامج</Button>
          )}
        </div>
      </div>

      <Segmented items={tabs} value={tab} onValueChange={(v) => setTab(v as typeof tab)} aria-label="أقسام البرنامج" className="mb-4" />

      {tab === "episodes" ? (
        <>
          <div className="form-head-actions" style={{ marginBottom: 12, justifyContent: "flex-end" }}>
            <Button variant="primary" size="md" onClick={openCreateEp}><Plus size={18} />حلقة جديدة</Button>
          </div>

          <DataTable
            columns={columns}
            rows={episodes}
            getRowId={(e) => e.id}
            rowActions={epMenu}
            emptyState={
              <EmptyState variant="aurora" icon={<Playlist />} title="لا حلقات بعد"
                description="أنشئ الحلقة الأولى: تُحفظ مسودّةً، ثمّ ترفع نسختيها فتُقرأ مدّتاهما آليًّا، ثمّ تنشرها."
                action={<Button variant="primary" size="md" onClick={openCreateEp}><Plus size={18} />حلقة جديدة</Button>} />
            }
          />
          {uploadingAudio ? (
            <div className="mt-3 text-content-muted text-sm">
              تُرفع {VARIANT_META[uploadingAudio.variant].verb}… لا تُغلق الصفحة.
            </div>
          ) : null}
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
              <Button variant="ghost" size="md" onClick={() => logoRef.current?.click()} loading={uploadingLogo}>
                <UploadSimple size={18} />{show.logoUrl ? "استبدال الشعار" : "اختر الشعار"}
              </Button>
              <input ref={logoRef} type="file" accept="image/webp,image/jpeg,image/png" hidden
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

      {/* مُدخَل الصوت — واحدٌ للجدول كلّه، والهدف يُحدَّد قبل فتحه */}
      <input ref={audioRef} type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/x-m4a" hidden
        onChange={(ev) => { void onAudio(ev.target.files?.[0]); ev.target.value = ""; }} />

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
              placeholder={formatTalkStart(stationTalkStart)} charset="latin"
              value={epForm.state.talkStart} onChange={(e) => patchEp({ talkStart: e.target.value })}
              error={epErr.talkStart}
              helper={`اتركه فارغًا فيرث ${formatTalkStart(stationTalkStart)}ث من المحطّة. لا تملأه إلّا إن اختلفت مقدّمة هذه الحلقة.`}
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
        open={confirmDropPlain !== null}
        onClose={() => setConfirmDropPlain(null)}
        tone="danger"
        icon={<Trash />}
        title="نزع النسخة المجرّدة؟"
        text={confirmDropPlain
          ? `سيُحذف ملفّ «${confirmDropPlain.title}» بلا موسيقى، فيختفي المبدّل من صفحتها ولا يبقى إلّا الاستماع بموسيقى.`
          : undefined}
        confirmLabel="نزع"
        loading={pending}
        onConfirm={() => {
          if (!confirmDropPlain) return;
          startPending(async () => {
            const r = await clearEpisodeAudio(confirmDropPlain.id, "plain");
            if (r.ok) { toast.success(r.message); setConfirmDropPlain(null); router.refresh(); } else toast.error(r.message);
          });
        }}
      />
    </>
  );
}
