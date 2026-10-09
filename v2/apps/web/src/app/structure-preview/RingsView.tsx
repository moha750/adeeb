"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "@adeeb/design-system";
import { X } from "@/app/_components/glyphs";
import { REDUCE_MOTION, useMediaFlag } from "@/lib/useMediaFlag";
import type { PubStructure } from "./data";
import { Face } from "./Face";
import { labelArc, layoutRings, xy, type Placed } from "./rings";

/**
 * **٣ · حلقات الوجوه** — معادةٌ للموازنة (٢٠٢٦-١٠-٠٩). المشهدُ مثبَّتٌ والتمريرُ يفتح الختم: يبدأ
 * بوجه الرئيس ثمّ تتّسع الحلقات. المرورُ على وجهٍ يُطفئ من ليس من لجنته، والنقرُ يفتح بطاقته
 * (ويقرّب أوّلًا على الجوّال).
 */
const TOUCH_MIN = 30;
const ZOOM = 2.8;
const RING_AT = [-1, 0.08, 0.24, 0.38, 0.5];
const LABELS_AT = 0.72;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => t * t * (3 - 2 * t);

export function RingsView({ s }: { s: PubStructure }) {
  const L = useMemo(() => layoutRings(s), [s]);
  const reduce = useMediaFlag(REDUCE_MOTION);
  const stageRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const fitRef = useRef(1);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [sel, setSel] = useState<Placed | null>(null);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const pin = pinRef.current;
    const scene = sceneRef.current;
    if (!stage || !pin || !scene) return;
    let raf = 0;
    const draw = () => {
      raf = 0;
      const vw = pin.clientWidth;
      const vh = pin.clientHeight;
      const fit = Math.min(vw * 0.96, (vh - 120) * 0.94) / L.size;
      fitRef.current = fit;
      const start = (Math.min(vw, vh) * 0.5) / 132;
      const rect = stage.getBoundingClientRect();
      const p = reduce ? 1 : clamp(-rect.top / Math.max(rect.height - vh, 1));
      const e = ease(p);
      scene.style.setProperty("--k", String(reduce ? fit : start * Math.pow(fit / start, e)));
      RING_AT.forEach((t, i) => scene.style.setProperty(`--fr-o${i}`, String(reduce ? 1 : clamp((e - t) / 0.12))));
      scene.style.setProperty("--fr-ol", String(reduce ? 1 : clamp((e - LABELS_AT) / 0.15)));
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(draw); };
    draw();
    setReady(true);
    window.addEventListener("scroll", ask, { passive: true });
    window.addEventListener("resize", ask);
    return () => { window.removeEventListener("scroll", ask); window.removeEventListener("resize", ask); if (raf) cancelAnimationFrame(raf); };
  }, [L.size, reduce]);

  const onFace = (f: Placed) => {
    const k = Number(sceneRef.current?.style.getPropertyValue("--k") || fitRef.current);
    if (!zoom && f.size * k < TOUCH_MIN) { setZoom({ x: f.x, y: f.y }); return; }
    setSel(f);
  };

  const C = L.center;
  return (
    <>
      <div ref={stageRef} className={"fr-stage" + (reduce ? " fr-static" : "")}>
        <div ref={pinRef} className="fr-pin" onClick={() => { setZoom(null); setSel(null); }}>
          <div ref={sceneRef} className={"fr-scene" + (ready ? " is-ready" : "")} style={{ width: L.size, height: L.size }}>
            <div className="fr-zoom" style={{ transform: zoom ? `scale(${ZOOM}) translate(${C - zoom.x}px, ${C - zoom.y}px)` : "none", transformOrigin: `${C}px ${C}px` }}>
              <img className="fr-halo" src="/brand/pattern-circular.svg" alt="" aria-hidden style={{ width: 360, height: 360, left: C - 180, top: C - 180 }} />
              <svg className="fr-lines" width={L.size} height={L.size} viewBox={`0 0 ${L.size} ${L.size}`} aria-hidden>
                <g style={{ opacity: "var(--fr-o1)" }}>{L.guides.map((r) => <circle key={r} className="fr-guide" cx={C} cy={C} r={r} />)}</g>
                <g style={{ opacity: "var(--fr-ol)" }}>
                  <circle className="fr-seal" cx={C} cy={C} r={L.sealR} />
                  <circle className="fr-seal-in" cx={C} cy={C} r={L.labelR - 30} />
                  {L.sectors.map((sec) => { const p0 = xy(C, 232, sec.a0 - 0.0375); const p1 = xy(C, L.labelR - 30, sec.a0 - 0.0375); return <line key={`sep-${sec.key}`} className="fr-sep" x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} />; })}
                  {L.sectors.map((sec) => (
                    <g key={sec.key}>
                      <path id={`fr-arc-${sec.key}`} d={labelArc(C, L.labelR, sec.a0, sec.a1, 20)} fill="none" />
                      <text className="fr-label"><textPath href={`#fr-arc-${sec.key}`} startOffset="50%" textAnchor="middle">{sec.name}</textPath></text>
                    </g>
                  ))}
                </g>
              </svg>
              {[0, 1, 2, 3, 4].map((ring) => (
                <div key={ring} className="fr-ring" style={{ opacity: `var(--fr-o${ring})` }}>
                  {L.faces.filter((f) => Math.min(f.ring, 4) === ring).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={"fr-face" + (hover && f.unit !== hover ? " is-dim" : "") + (sel?.key === f.key ? " is-sel" : "")}
                      style={{ left: f.x - f.size / 2, top: f.y - f.size / 2 }}
                      aria-label={`${f.p.name}، ${f.line}`}
                      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(f.unit); }}
                      onPointerLeave={() => setHover(null)}
                      onClick={(e) => { e.stopPropagation(); onFace(f); }}
                    >
                      <Face p={f.p} size={`${f.size}px`} lit={sel?.key === f.key || (!!hover && f.unit === hover)} />
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {sel ? (
        <div className="fr-card" role="dialog" aria-label={sel.p.name}>
          <Face p={sel.p} size="64px" lit />
          <div className="fr-card-tx">
            {sel.p.slug ? <a className="fr-card-nm" href={`/m/${encodeURIComponent(sel.p.slug)}`}>{sel.p.name}</a> : <b className="fr-card-nm">{sel.p.name}</b>}
            <span className="fr-card-rl">{sel.line}</span>
          </div>
          <IconButton size="sm" aria-label="إغلاق" onClick={() => setSel(null)}><X /></IconButton>
        </div>
      ) : null}
    </>
  );
}
