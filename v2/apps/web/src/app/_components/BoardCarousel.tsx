"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { XLogo, LinkedinLogo } from "@phosphor-icons/react";
import { CarouselNav, useInView } from "@adeeb/design-system";
import { toLatinDigits } from "@adeeb/core";
import { positionLine } from "@/lib/positionLabel";

/**
 * القطعتان كما تُخرجهما `get_board_members` خامًا — والجملةُ تُركَّب هنا بالقاعدة الواحدة
 * (`lib/positionLabel`) لا بوصلٍ في JSX.
 */
export type Member = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  gender: "male" | "female" | string | null;
  /** الرتبة مجرّدةً كما في `roles.role_name_ar` — «قائد» · «نائب» · «منسّق». */
  role_ar: string | null;
  /** وحدةُ إسناده (لجنة/قسم) — منها وحدها يُعرف موضعه. */
  unit_name: string | null;
  twitter_account: string | null;
  linkedin_account: string | null;
  /** عنوانُ صفحته العلنيّة `/m/<slug>` — فارغٌ لمن لم يبلغ حدَّ النشر. */
  public_slug: string | null;
};

const FIG: Record<string, string> = {
  male: "/brand/avatar/avatar-male.svg",
  female: "/brand/avatar/avatar-female.svg",
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

/* ══ ما يقوله المتصفّح عن نفسه: يُقرأ بـ`useSyncExternalStore` لا بحالةٍ في أثر ══
   عرضُ النافذة وتفضيلُ تقليل الحركة مصدران خارجيّان لا يعرفهما الخادم. وكانا يُنسَخان
   في حالتين داخل أثرٍ بعد التركيب، فتُرسَم البطاقاتُ بعرضٍ مفترَضٍ ثمّ يُعاد رسمُها بالعرض
   الحقيقيّ (قفزةُ مقاسٍ تُرى على الجوّال). ولقطةُ الخادم هنا افتراضٌ صريحٌ لا كذب: عرضٌ
   عريضٌ وحركةٌ مسموحة، وهما ما عليه أكثرُ الزوّار. */
const REDUCE_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(REDUCE_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const subscribeWidth = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

// محور الشريط. `translateX` لا يعرف `dir`: الموجب يمينٌ مهما كانت لغة الصفحة.
// والصفحة عربيّة (`dir="rtl"`)، فالتالي إلى اليسار والسابق إلى اليمين — أي سالب.
// موضعٌ واحد يحكم الاتّجاه كلّه: التموضع هنا، والسحب في onMove.
const AXIS = -1;

// نمط بطاقة حسب بعدها الدائريّ عن المركز (كسريّ أثناء السحب، صحيح عند الاستقرار)
function slideStyle(rel: number, spacing: number, visible: number) {
  const a = Math.abs(rel);
  const scale = Math.max(0.5, 1.06 - a * 0.16);
  const opacity = Math.max(0, Math.min(1, visible + 1 - a));
  return {
    transform: `translateX(calc(-50% + ${AXIS * rel * spacing}px)) scale(${scale.toFixed(3)})`,
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
  const motion = useSyncExternalStore(subscribeMotion, () => !window.matchMedia(REDUCE_MOTION).matches, () => true);
  const vw = useSyncExternalStore(subscribeWidth, () => window.innerWidth, () => 1200);

  const stageRef = useRef<HTMLDivElement>(null);
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

  // مرايا لمستمعي المؤشّر: هم مربوطون مرّةً واحدةً عند التركيب، فلا يرون قيمَ الرسمة
  // الجارية إلّا من هنا. **وتُحدَّث بعد الرسم لا فيه**: الكتابةُ في مرجعٍ أثناء الرسم
  // تكسر نقاءه (قاعدةُ المصرّف `refs`)، وما بعد التثبيت يسبق أوّلَ لمسةٍ دائمًا.
  const spRef = useRef(SPACING);
  const nRef = useRef(n);
  const visRef = useRef(VISIBLE);
  const curRef = useRef(current);
  useEffect(() => {
    spRef.current = SPACING;
    nRef.current = n;
    visRef.current = VISIBLE;
    curRef.current = current;
  });

  // الدوران لا يبدأ قبل أن يصل الزائرُ إلى القسم: كان يمشي منذ تحميل الصفحة فيجد
  // الزائرُ بطاقةً في وسط الدورة لا أوّلَ المجلس. وعودةُ القسم تُعيد المؤقّت من أوّله،
  // فتُمهَل البطاقةُ الحاضرةُ مدّتَها كاملة.
  const inView = useInView(stageRef);
  useEffect(() => {
    if (!inView || hover || cooldown || dragging || !motion || n <= 1) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % n), 3200);
    return () => clearInterval(id);
  }, [inView, hover, cooldown, dragging, motion, n]);

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
      // السحب يقسَم على المحور نفسه، وإلا سارت البطاقات عكس الإصبع.
      // ولأن المحور معرَّب (التالي يسارًا)، فالسحب يمينًا يتقدّم — لازمُ التتبّع لا خيارٌ فيه.
      lastCur.current = startCur.current - (AXIS * dx) / spRef.current;
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
        ref={stageRef}
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
            const roleLine = positionLine(m.role_ar, m.unit_name);
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
                  ) : m.gender && FIG[m.gender] ? (
                    <div className="bc-fig" style={{ backgroundImage: `url(${FIG[m.gender]})` }} />
                  ) : (
                    <div className="bc-mono" style={{ fontSize: monoSize }}>{initials(m.full_name)}</div>
                  )}
                  <div className="bc-grad" />
                  <div className="bc-info">
                    <div>
                      {/* الاسمُ يقود إلى صفحته العلنيّة — اسمٌ بلا مقصدٍ لا يُنقَر.
                          والنقرُ يُوقَف عن الشريط فلا يُحسَب سحبًا للبطاقة. */}
                      {m.public_slug ? (
                        <a
                          className="bc-nm"
                          href={`/m/${encodeURIComponent(m.public_slug)}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{ pointerEvents: a === 0 ? "auto" : "none" }}
                        >
                          {toLatinDigits(m.full_name)}
                        </a>
                      ) : (
                        <div className="bc-nm">{toLatinDigits(m.full_name)}</div>
                      )}
                      {roleLine ? <div className="bc-rl">{roleLine}</div> : null}
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
      <CarouselNav className="mt-2" onPrev={() => go(-1)} onNext={() => go(1)} />
    </div>
  );
}
