"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Button } from "@adeeb/design-system";
import { Play, Pause, MicrophoneStage, Waveform, Heart, ShareNetwork,
  ApplePodcastsLogo, SpotifyLogo, YoutubeLogo, Rss, ArrowsDownUp } from "@phosphor-icons/react";
import { MagnifyingGlass, ArrowCounterClockwise, ArrowClockwise } from "@/app/_components/glyphs";
import { DEMO_CHAPTERS, demoPeaks, fmt, type DemoEpisode } from "./data";
import type { PlayerApi } from "./usePlayer";

const SKIP = 10;
const BARS = 56;

/* ══ صفُّ الحلقة ═══════════════════════════════════════════════════════
   ثلاثةُ أوجهٍ لصفٍّ واحد: في الفهرس يحمل الغلافَ واسمَ البرنامج، وفي صفحة
   البرنامج يحمل رقمَ الحلقة، وفي «التالي» يحملهما بلا شارةِ «يُذاع الآن». */
export function EpisodeRow({
  ep, mode, p,
}: { ep: DemoEpisode; mode: "index" | "show" | "next"; p: PlayerApi }) {
  const t = p.posOf(ep.id);
  const d = p.durOf(ep.id);
  const pct = d > 0 ? (t / d) * 100 : 0;
  const live = ep.id === p.ep;
  const on = live && p.playing;
  const busy = live && p.busy;

  return (
    <div className={"radn-row" + (live && (p.playing || p.busy) && mode !== "next" ? " is-playing" : "")}>
      <span className="radn-art">
        {mode === "index" ? <Waveform size={24} aria-hidden /> : <span className="radn-art-num">{ep.id}</span>}
        {t > 0 ? (
          <span className="radn-art-prog" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </span>
        ) : null}
      </span>

      <span className="radn-txt">
        <a className="radn-t" href="#demo">{ep.title}</a>
        <span className="radn-m">
          {mode === "index" ? <span className="radn-show">منعطف</span> : null}
          <span className="radn-date">{ep.dateLabel}</span>
          <span className="radn-chip"><bdi className="radn-n" dir="ltr">{ep.lengthLabel}</bdi></span>
          {t > 0 ? (
            <span className={"radn-chip " + (t >= d ? "radn-chip-done" : "radn-chip-left")}>
              {t >= d ? "سُمعت" : `بقي ${fmt(d - t)}`}
            </span>
          ) : null}
        </span>
        <span className="radn-s">{ep.summary}</span>
      </span>

      {/* الاسمُ يحمل عنوانَ الحلقة: تسعةُ أزرارٍ تُنطَق «تشغيل» ليست تسعةَ أزرار */}
      <button
        type="button"
        className={"radn-play" + (on || busy ? " is-on" : "")}
        aria-label={`${on ? "إيقاف" : "تشغيل"} ${ep.title}`}
        onClick={() => p.toggleEpisode(ep.id)}
      >
        {on ? <Pause size={16} weight="fill" aria-hidden /> : <Play size={16} weight="fill" aria-hidden />}
      </button>
    </div>
  );
}

/* ══ المشغّل ══════════════════════════════════════════════════════════ */
export function Player({ p, episodeId }: { p: PlayerApi; episodeId: number }) {
  const peaks = useMemo(() => demoPeaks(BARS), []);
  const waveRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const d = p.durOf(episodeId);
  const t = p.posOf(episodeId);
  const pct = d > 0 ? (t / d) * 100 : 0;
  const pageLive = p.ep === episodeId;
  const on = pageLive && p.playing;
  const busy = pageLive && p.busy;
  const played = Math.round(BARS * (pct / 100));

  /* السحبُ في RTL: الأقصى يمينًا. ولا يُمسَك المؤشّرُ إلّا بعد إزاحةٍ أفقيّةٍ
     حقيقيّة، وإلّا ابتلعت الموجةُ كلَّ سحبةِ تمريرٍ تبدأ عليها. */
  const from = useCallback((clientX: number) => {
    const r = waveRef.current?.getBoundingClientRect();
    if (!r) return 0;
    return Math.max(0, Math.min(1, (r.right - clientX) / r.width)) * d;
  }, [d]);

  const startX = useRef(0);
  const held = useRef(false);

  return (
    <div className="radn-player" role="region" aria-label="مشغّل الحلقة">
      {/* من عاد إلى حلقةٍ سمع نصفَها يُسأل ولا يُخمَّن عنه */}
      {!p.firstVisit && t > 0 && !on && !busy ? (
        <div className="btn-row" style={{ marginBottom: 11 }}>
          <Button variant="primary" onClick={() => { p.switchTo(episodeId); p.play(); }}>
            <Play size={18} weight="fill" aria-hidden />
            تكمل من <bdi dir="ltr" className="font-latin">{fmt(t)}</bdi>
          </Button>
          <Button variant="ghost" onClick={() => { p.switchTo(episodeId, 0); p.play(); }}>من أوّلها</Button>
        </div>
      ) : null}

      <div className="radn-wave-wrap">
        <div className="radn-marks" aria-hidden>
          {DEMO_CHAPTERS.map((c) => (
            <b key={c.at} style={{ insetInlineStart: `${(c.at / d) * 100}%` }} />
          ))}
        </div>
        <div className={"radn-bubble" + (dragging ? " is-on" : "")} aria-hidden
          style={{ insetInlineStart: `${Math.max(7, Math.min(93, pct))}%` }}>
          {fmt(t)}
        </div>
        <div
          ref={waveRef}
          className="radn-wave"
          role="slider"
          tabIndex={0}
          aria-label="موضع الاستماع"
          aria-valuemin={0}
          aria-valuemax={d}
          aria-valuenow={Math.round(t)}
          aria-valuetext={`${fmt(t)} من ${fmt(d)}`}
          onPointerDown={(e) => { startX.current = e.clientX; held.current = false; setDragging(false); (e.currentTarget as HTMLElement).dataset.down = "1"; }}
          onPointerMove={(e) => {
            if ((e.currentTarget as HTMLElement).dataset.down !== "1") return;
            if (!held.current) {
              if (Math.abs(e.clientX - startX.current) < 8) return;
              held.current = true; setDragging(true);
              e.currentTarget.setPointerCapture(e.pointerId);
            }
            p.switchTo(episodeId, from(e.clientX));
          }}
          onPointerUp={(e) => {
            const el = e.currentTarget as HTMLElement;
            if (el.dataset.down === "1" && !held.current) p.switchTo(episodeId, from(e.clientX));
            el.dataset.down = ""; held.current = false; setDragging(false);
          }}
          onPointerCancel={(e) => { (e.currentTarget as HTMLElement).dataset.down = ""; held.current = false; setDragging(false); }}
          onLostPointerCapture={() => { held.current = false; setDragging(false); }}
          /* المِزلاقُ يتحرّك ولا يشغّل: المسافةُ ملكُ زرِّ التشغيل، وإلّا وقعت سهوًا */
          onKeyDown={(e) => {
            const map: Record<string, number> = {
              ArrowRight: t - SKIP, ArrowLeft: t + SKIP,
              PageDown: t - 60, PageUp: t + 60, Home: 0, End: d,
            };
            if (!(e.key in map)) return;
            e.preventDefault();
            p.switchTo(episodeId, map[e.key]);
          }}
        >
          {peaks.map((v, i) => (
            <i key={i} className={i < played ? "is-played" : undefined} style={{ height: `${Math.round(v * 100)}%` }} />
          ))}
          <span className="radn-head" style={{ insetInlineStart: `${pct}%` }} aria-hidden />
        </div>
      </div>

      {/* الثلاثةُ بثواني المادّة فلا يتناقض سطرٌ واحد، وزمنُك أنت في سطرٍ مسمًّى */}
      <div className="radn-times">
        <span><bdi dir="ltr">{fmt(t)}</bdi></span>
        <span className="radn-left">بقي {fmt(d - t)}</span>
        <span><bdi dir="ltr">{fmt(d)}</bdi></span>
      </div>
      {p.rate !== 1 ? (
        <p className="radn-rate-note">
          بسرعة <bdi dir="ltr" className="font-latin">{p.rate}×</bdi>، ينتهي بعد {fmt((d - t) / p.rate)} من وقتك
        </p>
      ) : null}

      <div className="radn-transport">
        <button type="button" className="radn-skip" aria-label={`الرجوع ${SKIP} ثوانٍ`}
          onClick={() => { p.switchTo(episodeId); p.seek(episodeId, t - SKIP); }}>
          <span className="radn-skip-g">
            <ArrowCounterClockwise size={26} aria-hidden />
            <b>{SKIP}</b>
          </span>
        </button>
        <button type="button" className={"radn-big" + (busy ? " is-busy" : "")}
          aria-label={busy ? "جارٍ التحميل" : on ? "إيقاف الحلقة" : "تشغيل الحلقة"}
          onClick={() => p.toggleEpisode(episodeId)}>
          <span className="radn-spin" aria-hidden />
          {on ? <Pause size={22} weight="fill" aria-hidden /> : <Play size={22} weight="fill" aria-hidden />}
        </button>
        <button type="button" className="radn-skip" aria-label={`التقدّم ${SKIP} ثوانٍ`}
          onClick={() => { p.switchTo(episodeId); p.seek(episodeId, t + SKIP); }}>
          <span className="radn-skip-g">
            <ArrowClockwise size={26} aria-hidden />
            <b>{SKIP}</b>
          </span>
        </button>
      </div>

      <div className="radn-aux">
        <MusicStops />
        <button type="button" className="radn-dir" onClick={p.cycleRate}
          aria-label={`سرعة التشغيل ${p.rate}، اضغط لتغييرها`}>
          <bdi dir="ltr" className="font-latin">{p.rate}×</bdi>
        </button>
      </div>

      {/* المحاورُ داخل المشغّل لا في قسمٍ بعيدٍ أسفلَ الصفحة، فيُقرأ الحاليُّ وأنت تسمع */}
      <div className="radn-chaps">
        {DEMO_CHAPTERS.map((c, i) => {
          const next = DEMO_CHAPTERS[i + 1];
          const active = pageLive && t >= c.at && (!next || t < next.at);
          return (
            <button key={c.at} type="button" className="radn-chap"
              aria-current={active ? "true" : undefined}
              aria-label={`المحور ${c.title}، من الدقيقة ${fmt(c.at)}`}
              onClick={() => { p.switchTo(episodeId, c.at); if (!p.playing) p.play(); }}>
              <span className="radn-chap-at" dir="ltr">{fmt(c.at)}</span>
              <span>{c.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** مراتبُ الموسيقى — اختيارٌ واحدٌ من ثلاث، فهي إذاعةُ راديو لا أزرارُ تبديل. */
function MusicStops() {
  const items = ["كاملة", "خافتة", "بلا"];
  const [i, setI] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div className="seg" role="radiogroup" aria-label="مقدار الموسيقى">
      {items.map((label, j) => (
        <button
          key={label}
          ref={(el) => { refs.current[j] = el; }}
          type="button"
          role="radio"
          aria-checked={i === j}
          tabIndex={i === j ? 0 : -1}
          className="seg-item"
          onClick={() => setI(j)}
          onKeyDown={(e) => {
            const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? 1
              : e.key === "ArrowRight" || e.key === "ArrowUp" ? -1 : 0;
            if (!step) return;
            e.preventDefault();
            const n = (j + step + items.length) % items.length;
            setI(n);
            refs.current[n]?.focus();
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ══ الشريط الملازم ═══════════════════════════════════════════════════
   تذكيرٌ يقول «ما زلتَ تسمع هذا» ويعيدك إليه، لا لوحةَ قيادةٍ تكرّر ما في الصفحة.
   ولا زرَّ إغلاقٍ فيه: أبل وسبوتيفاي لا يعطيانه، ومن أراد الصمتَ أوقفَ. */
export function MiniBar({ p, hidden }: { p: PlayerApi; hidden: boolean }) {
  const cur = p.current;
  const t = p.posOf(cur.id);
  const d = p.durOf(cur.id);
  const pct = d > 0 ? (t / d) * 100 : 0;
  if (!p.barVisible) return null;
  return (
    <div className={"radn-bar" + (hidden ? " is-out" : "")} role="region" aria-label="ما يُذاع الآن">
      <span className="radn-bar-line" aria-hidden><i style={{ width: `${pct}%` }} /></span>
      <span className="radn-bar-art" aria-hidden><MicrophoneStage size={20} /></span>
      <span className="radn-bar-txt">
        <span className="radn-bar-t">{cur.title}</span>
        <span className="radn-bar-s">منعطف</span>
      </span>
      <span className="radn-bar-time"><bdi dir="ltr">{fmt(t)} / {fmt(d)}</bdi></span>
      <button type="button" className="radn-bar-b"
        aria-label={`${p.playing ? "إيقاف" : "تشغيل"} ${cur.title}`}
        onClick={() => (p.playing ? p.pause() : p.play())}>
        {p.playing ? <Pause size={16} weight="fill" aria-hidden /> : <Play size={16} weight="fill" aria-hidden />}
      </button>
    </div>
  );
}

/** وجهاتُ الاستماع: المسموعُ أوّلًا لأنّ زائرَ صفحةِ بودكاستٍ يبحث عن بيتِه هو. */
export function ListenOn() {
  return (
    <div>
      <div className="radn-subs-h">استمع على</div>
      <div className="radn-subs">
        <a className="radn-dir" href="#demo"><ApplePodcastsLogo size={15} aria-hidden />أبل بودكاست</a>
        <a className="radn-dir" href="#demo"><SpotifyLogo size={15} aria-hidden />سبوتيفاي</a>
        <a className="radn-dir" href="#demo"><YoutubeLogo size={15} aria-hidden />يوتيوب</a>
        <a className="radn-dir" href="#demo"><Rss size={15} aria-hidden />RSS</a>
      </div>
    </div>
  );
}

export { MagnifyingGlass, ArrowsDownUp, Heart, ShareNetwork, MicrophoneStage, Waveform };
