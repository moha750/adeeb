"use client";

import { useEffect, useRef, useState } from "react";
import { XLogo, LinkedinLogo } from "@phosphor-icons/react";
import { toLatinDigits } from "@adeeb/core";

export type Member = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_name: string | null;
  twitter_account: string | null;
  linkedin_account: string | null;
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + " " + (p[1]?.[0] ?? "")).trim() || "؟";
}
function socialUrl(v: string | null, kind: "tw" | "in"): string | null {
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const h = v.replace(/^@/, "").trim();
  return kind === "tw" ? `https://x.com/${h}` : `https://www.linkedin.com/in/${h}`;
}

// نمط بطاقة حسب بعدها الدائريّ عن المركز (كسريّ أثناء السحب، صحيح عند الاستقرار)
function slideStyle(rel: number, spacing: number, visible: number) {
  const a = Math.abs(rel);
  const scale = Math.max(0.5, 1.06 - a * 0.16);
  const opacity = Math.max(0, Math.min(1, visible + 1 - a));
  return {
    transform: `translateX(calc(-50% + ${rel * spacing}px)) scale(${scale.toFixed(3)})`,
    opacity,
    zIndex: 100 - Math.round(a),
    dim: Number(Math.min(0.42, a * 0.2).toFixed(2)),
  };
}

/** أهل الدفّة — كاروسيل تركيز المركز، سحب حيّ سلس، ودوران لا نهائيّ. */
export function BoardCarousel({ members }: { members: Member[] }) {
  const n = members.length;
  const [current, setCurrent] = useState(0);
  const [hover, setHover] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [motion, setMotion] = useState(true);
  const [vw, setVw] = useState(1200);

  const trackRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startCur = useRef(0);
  const lastCur = useRef(0);
  const moved = useRef(false);
  const dragRef = useRef(false);
  const resumeT = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMobile = vw < 640;
  const CARD = isMobile ? Math.max(180, Math.min(240, vw - 96)) : 290;
  const SPACING = isMobile ? Math.round(CARD * 0.64) : 228;
  const VISIBLE = isMobile ? 1 : 2;
  const stageH = Math.round((CARD * 4) / 3 + 22);
  const monoSize = Math.round(CARD * 0.36);

  const spRef = useRef(SPACING); spRef.current = SPACING;
  const nRef = useRef(n); nRef.current = n;
  const visRef = useRef(VISIBLE); visRef.current = VISIBLE;
  const curRef = useRef(current); curRef.current = current;

  useEffect(() => {
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (hover || cooldown || dragging || !motion || n <= 1) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % n), 3200);
    return () => clearInterval(id);
  }, [hover, cooldown, dragging, motion, n]);

  const bump = () => {
    setCooldown(true);
    if (resumeT.current) clearTimeout(resumeT.current);
    resumeT.current = setTimeout(() => setCooldown(false), 4000);
  };

  // تحديث مباشر لكل بطاقة أثناء السحب (بلا إعادة رسم React) → سلاسة تامّة
  const paint = (cur: number) => {
    const track = trackRef.current;
    if (!track) return;
    const N = nRef.current, SP = spRef.current, V = visRef.current;
    const kids = track.children;
    for (let i = 0; i < kids.length; i++) {
      let rel = i - cur;
      if (rel > N / 2) rel -= N;
      else if (rel < -N / 2) rel += N;
      const st = slideStyle(rel, SP, V);
      const el = kids[i] as HTMLElement;
      el.style.transform = st.transform;
      el.style.opacity = String(st.opacity);
      el.style.zIndex = String(st.zIndex);
      el.style.pointerEvents = st.opacity > 0.05 ? "auto" : "none";
      const dim = el.querySelector<HTMLElement>(".bc-dim");
      if (dim) dim.style.opacity = String(st.dim);
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - startX.current;
      if (Math.abs(dx) > 5) moved.current = true;
      lastCur.current = startCur.current - dx / spRef.current;
      paint(lastCur.current);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = false;
      trackRef.current?.classList.remove("bc-dragging");
      const N = nRef.current;
      const nc = (((Math.round(lastCur.current) % N) + N) % N);
      paint(nc); // يستقرّ بسلاسة (الانتقال مُفعّل الآن)
      if (moved.current) setCurrent(nc);
      setDragging(false);
      bump();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (resumeT.current) clearTimeout(resumeT.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startCur.current = curRef.current;
    lastCur.current = curRef.current;
    moved.current = false;
    dragRef.current = true;
    setDragging(true);
    trackRef.current?.classList.add("bc-dragging");
  };

  const go = (delta: number) => {
    setCurrent((c) => (c + delta + n) % n);
    bump();
  };
  const centerOn = (i: number) => {
    if (moved.current) { moved.current = false; return; }
    setCurrent(i);
    bump();
  };

  return (
    <div>
      <div
        className="bc-stage"
        style={{ height: stageH }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onPointerDown={onDown}
      >
        <div className="bc-track" ref={trackRef}>
          {members.map((m, i) => {
            let rel = i - current;
            if (rel > n / 2) rel -= n;
            else if (rel < -n / 2) rel += n;
            const a = Math.abs(rel);
            const st = slideStyle(rel, SPACING, VISIBLE);
            const tw = socialUrl(m.twitter_account, "tw");
            const li = socialUrl(m.linkedin_account, "in");
            return (
              <div
                key={m.id}
                className="bc-slide"
                onClick={() => centerOn(i)}
                style={{
                  transform: st.transform,
                  opacity: st.opacity,
                  zIndex: st.zIndex,
                  pointerEvents: st.opacity > 0.05 ? "auto" : "none",
                }}
                aria-hidden={st.opacity < 0.5}
              >
                <div className="bc-card" style={{ width: CARD }}>
                  {m.avatar_url ? (
                    <div className="bc-bg" style={{ backgroundImage: `url(${m.avatar_url})` }} />
                  ) : (
                    <div className="bc-mono" style={{ fontSize: monoSize }}>{initials(m.full_name)}</div>
                  )}
                  <div className="bc-grad" />
                  <div className="bc-info">
                    <div>
                      <div className="bc-nm">{toLatinDigits(m.full_name)}</div>
                      {m.role_name ? <div className="bc-rl">{m.role_name}</div> : null}
                    </div>
                    {(tw || li) && (
                      <div className="bc-socs" style={{ pointerEvents: a === 0 ? "auto" : "none" }}>
                        {tw && (
                          <a href={tw} target="_blank" rel="noopener noreferrer" aria-label={`${m.full_name} على X`} onClick={(e) => e.stopPropagation()}>
                            <XLogo size={16} aria-hidden />
                          </a>
                        )}
                        {li && (
                          <a href={li} target="_blank" rel="noopener noreferrer" aria-label={`${m.full_name} على LinkedIn`} onClick={(e) => e.stopPropagation()}>
                            <LinkedinLogo size={16} aria-hidden />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="bc-dim" style={{ opacity: st.dim }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bc-arrows">
        <button type="button" onClick={() => go(-1)} aria-label="السابق">‹</button>
        <button type="button" onClick={() => go(1)} aria-label="التالي">›</button>
      </div>
    </div>
  );
}
