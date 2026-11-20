"use client";

import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

/**
 * **تقويمُ الهويّة** (٢٠٢٦-١١-٢٠، بطلب محمد: «عند فتح النافذة يظهر اختيارُ الوقت والتاريخ بنظام المتصفّح»، ثمّ «هل هو مطابقٌ للهويّة؟»):
 * لوحٌ يُفتح تحت حقل التاريخ بدل تقويم المتصفّح، **مبنيٌّ من قطع الهويّة نفسِها لا من قطعٍ تشبهها**:
 * - **رأسُه اللوحُ المنقوش** وعليه **كعبُ اليوم المختار** (الرقمُ وتحته شهرُه بسنته، بصمةُ التاريخ في كلّ الغرف) ويومُه وساعتُه بجانبه.
 * - **السهمان زرُّ الأيقونة** (`.ad-ibtn`)، و**«ص / م» المبدّلُ الواحد** (`.ad-switch`)، و**الأفعالُ أزرارُ الهويّة بختمها** (`.ad-btn`).
 * - والمختارُ من الأيّام قطعةٌ من اللوح، واليومُ نقطةٌ تحت رقمه.
 * والقيمةُ نصُّ الحقل الأصليّ نفسُه (`YYYY-MM-DD` أو `THH:mm`)، فيُكتب فيه ويُطلَق حدثُ الإدخال ولا يتغيّر شيءٌ في النماذج التي تقرؤه.
 * والعناصرُ مرسومةٌ بأصنافها هنا لأنّ المكتبةَ لا تستورد من غرف التطبيق (`_ad/primitives`)، والأصنافُ واحدة فالشكلُ واحد.
 */
const MONTH = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { month: "long", year: "numeric", timeZone: "UTC" });
const MONTH_ONLY = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { month: "long", timeZone: "UTC" });
const DAY_FULL = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const WEEKDAY = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { weekday: "long", timeZone: "UTC" });
const TIME = new Intl.DateTimeFormat("ar-SA-u-nu-latn", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" });
const WEEK = ["ح", "ن", "ث", "ر", "خ", "ج", "س"];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
/** موضعُ قصّ القماش من بذرته، كما في `cutOf` (كعوبُ الغرف) */
const cutOf = (seed: string) => { let h = 0; for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0; return Math.abs(h) % 6; };

const Svg = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
);
const ToRight = () => <Svg d="M9 6l6 6-6 6" />;
const ToLeft = () => <Svg d="M15 6l-6 6 6 6" />;
const CalToday = () => <Svg d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM12 13h.01" />;
const Clock = () => <Svg d="M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />;
/** ساعةُ الرياض الآن مقرّبةً إلى خمس دقائق، كخطوة عدّاد الدقائق */
const riyadhNowHM = (): [number, number] => {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Riyadh" }).format(new Date()).split(":").map(Number);
  const r = Math.round(m / 5) * 5;
  return r === 60 ? [(h + 1) % 24, 0] : [h, r];
};
const Clear = () => <Svg d="M6 6l12 12M18 6L6 18" />;
const Check = () => <Svg d="M5 12.5l4.5 4.5L19 7" />;

export function DatePanel({ type, value, min, max, today, onPick, onDone }: {
  type: string;
  value: string;
  min?: string;
  max?: string;
  /** يومُ النادي (`YYYY-MM-DD`) لا يومُ الجهاز */
  today: string;
  onPick: (v: string) => void;
  /** `kb`: أُغلق بالمفاتيح، فيعود التركيزُ إلى الحقل (وباللمس لا يعود: تركيزُ حقل التاريخ في iOS يفتح منتقيَ الجهاز) */
  onDone: (kb: boolean) => void;
}) {
  // الأنواعُ كلّها بلوحٍ واحد (محمد: «أريد أن يغطّي كلَّ أنواع الحقول لتكون هويّةً متكاملة»): اليومُ، واليومُ بساعته، والساعةُ وحدها،
  // والشهرُ وحده. والأسبوعُ (`week`، ترقيمٌ أوروبيّ لا يُستعمل عندنا ولا حقلَ منه) يبقى للمتصفّح
  const timeOnly = type === "time";
  const monthOnly = type === "month";
  const withTime = type === "datetime-local" || timeOnly;
  const [d0raw, t0raw] = value ? value.split("T") : ["", ""];
  const d0 = timeOnly ? "" : monthOnly ? (d0raw ? `${d0raw}-01` : "") : d0raw;
  const t0 = timeOnly ? d0raw : t0raw;
  const base = d0 || today;
  const [view, setView] = useState(() => ({ y: +base.slice(0, 4), m: +base.slice(5, 7) - 1 }));
  /**
   * **الشهرُ والسنةُ يُختاران قفزًا** (محمد ٢٠٢٦-١١-٢٠: «بعض التقاويم يتيح حتى اختيار الشهر والسنة»): عنوانُ الشهر يفتح شهورَ السنة،
   * وعنوانُ السنة يفتح اثنتي عشرة سنة. فتاريخُ ميلادٍ قبل عشرين سنةً نقرتان لا مئتان وأربعون سهمًا.
   */
  const minD = min?.slice(0, 10);
  const maxD = max?.slice(0, 10);
  const [level, setLevel] = useState<"days" | "months" | "years">(monthOnly ? "months" : "days");
  /** التركيزُ ينتقل إلى اللوح حين يُفتح (المختارُ أو اليوم، أو أوّلُ زرّ)، فتعمل الأسهمُ فورًا ومن يقرأ بالقارئ الآليّ يعرف أين هو */
  const root = useRef<HTMLDivElement>(null);
  /** آخرُ ما لُمس به اللوح: لمسٌ أم فأرةٌ ومفاتيح (يقرّر ردَّ التركيز عند الإغلاق: يعود إلى الحقل إلّا باللمس) */
  const byPointer = useRef(false);
  const done = () => onDone(!byPointer.current);
  /** اليومُ الذي ينتظر التركيزَ بعد تبدّل الشهر (السهمُ عند طرف الشهر): الزرُّ القديم زال مع شهره، فيُركَّز على مثيله في الجديد */
  const [focusKey, setFocusKey] = useState<string | null>(null);
  // قبل الرسم ما أمكن، ثمّ في الإطار التالي إن لم يأخذ: اللوحُ المنبثق مخفيٌّ حتّى يقيس موضعَه، والمخفيُّ لا يقبل التركيز
  useLayoutEffect(() => {
    const go = (retry: boolean) => {
      const el = root.current;
      if (!el || (retry && el.contains(document.activeElement))) return;
      (el.querySelector<HTMLButtonElement>(".adp-day[data-on]") ?? el.querySelector<HTMLButtonElement>(".adp-day[data-today]") ?? el.querySelector<HTMLButtonElement>("button"))?.focus({ preventScroll: true });
    };
    go(false);
    const f = requestAnimationFrame(() => go(true));
    return () => cancelAnimationFrame(f);
  }, [level]);
  useLayoutEffect(() => {
    if (!focusKey) return;
    root.current?.querySelector<HTMLButtonElement>(`.adp-day[data-key="${focusKey}"]`)?.focus({ preventScroll: true });
    setFocusKey(null);
  }, [focusKey, view]);
  const yStart = view.y - (((view.y % 12) + 12) % 12);
  const hh = t0 ? +t0.slice(0, 2) : 21;
  const mm = t0 ? +t0.slice(3, 5) : 0;

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1)).getUTCDay();
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    const out: ({ d: number; key: string } | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= days; d++) out.push({ d, key: ymd(view.y, view.m, d) });
    return out;
  }, [view]);

  /** والحدّان يُحترمان في الساعة أيضًا لا في اليوم وحده: ما قبل الأدنى يُردّ إليه، وما بعد الأعلى كذلك (القيمةُ نصٌّ يُقارَن بترتيبه) */
  const clamp = (v: string) => (min && v < min ? min : max && v > max ? max : v);
  // والساعةُ وحدها تُحصر بحدّيها أيضًا («HH:MM» يُقارَن نصًّا كما يُقارَن اليومُ بساعته)
  const emit = (day: string, h = hh, m = mm) => onPick(timeOnly ? clamp(`${pad(h)}:${pad(m)}`) : withTime ? clamp(`${day}T${pad(h)}:${pad(m)}`) : day);
  const move = (n: number) => setView((v) => {
    if (level === "months") return { ...v, y: v.y + n };
    if (level === "years") return { ...v, y: v.y + n * 12 };
    const t = new Date(Date.UTC(v.y, v.m + n, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() };
  });
  const minY = minD ? +minD.slice(0, 4) : -Infinity;
  const maxY = maxD ? +maxD.slice(0, 4) : Infinity;
  const minM = minD ? +minD.slice(0, 4) * 12 + +minD.slice(5, 7) - 1 : -Infinity;
  const maxM = maxD ? +maxD.slice(0, 4) * 12 + +maxD.slice(5, 7) - 1 : Infinity;
  const pm = hh >= 12;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  const setHour = (h: number) => emit(d0 || today, (h % 12) + (pm ? 12 : 0));
  /** ما يُكتب في الدقيقة قبل اعتماده (يُعتمد بالخروج منها أو Enter)، ويُحصر بين ٠ و٥٩ */
  const [minDraft, setMinDraft] = useState<string | null>(null);
  const commitMin = () => {
    if (minDraft === null) return;
    const n = minDraft === "" ? mm : Math.min(59, +minDraft);
    setMinDraft(null);
    if (n !== mm) emit(d0 || today, hh, n);
  };

  /**
   * **لوحةُ المفاتيح** (سهولةُ الوصول قبل التعميم): الأسهمُ تنقل بين الأيّام (اليمينُ أمسٌ واليسارُ غدٌ في الاتّجاه العربيّ، والأعلى
   * والأسفلُ أسبوع)، و`Enter` يختار (الزرُّ نفسُه)، و`Escape` يغلق (اللوحُ المنبثق).
   */
  const onGridKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? -1 : e.key === "ArrowLeft" ? 1 : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
    if (!step) return;
    const key = (e.target as HTMLElement).dataset.key;
    if (!key) return;
    e.preventDefault();
    const t = new Date(Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, +key.slice(8, 10) + step));
    const next = ymd(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
    if (t.getUTCFullYear() !== view.y || t.getUTCMonth() !== view.m) setView({ y: t.getUTCFullYear(), m: t.getUTCMonth() });
    setFocusKey(next);
  };

  // الكعب: اليومُ المختار، أو اليومُ إن لم يُختر شيءٌ بعد (خافتًا)
  const shown = d0 || today; // الساعةُ وحدها تُصاغ على يومٍ ما، فلا يُرى يومُه
  const sd = new Date(Date.UTC(+shown.slice(0, 4), +shown.slice(5, 7) - 1, +shown.slice(8, 10), hh, mm));

  /** **الأيّامُ وقفةٌ واحدة لـ Tab** (المختارُ، أو اليوم، أو أوّلُ الشهر) والأسهمُ تتنقّل بينها، فلا يمرّ Tab على ثلاثين زرًّا */
  const [roam, setRoam] = useState<string | null>(null);
  const inView = (k: string | null) => !!k && +k.slice(0, 4) === view.y && +k.slice(5, 7) - 1 === view.m;
  const tabKey = inView(roam) ? roam : inView(d0) ? d0 : inView(today) ? today : ymd(view.y, view.m, 1);
  /** «اليوم» و«هذا الشهر» لا يتجاوزان الحدّين (تاريخُ الميلاد حدُّه الأعلى في الماضي) */
  const todayOut = monthOnly
    ? (!!min && today.slice(0, 7) < min.slice(0, 7)) || (!!max && today.slice(0, 7) > max.slice(0, 7))
    : !timeOnly && !withTime && ((!!minD && today < minD) || (!!maxD && today > maxD));
  /** اللوحُ نافذةٌ صغيرة: Tab يدور في أزراره ولا يخرج إلى ما خلفه (ولا إلى شريط المتصفّح، فاللوحُ آخرُ الصفحة) */
  const onRootKey = (e: KeyboardEvent<HTMLDivElement>) => {
    byPointer.current = false;
    if (e.key !== "Tab") return;
    const items = [...(root.current?.querySelectorAll<HTMLElement>("button:not(:disabled, [tabindex='-1']), input") ?? [])];
    if (!items.length) return;
    const i = items.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
  };

  return (
    <div ref={root} className="adp" dir="rtl" onKeyDown={onRootKey} onPointerDown={(e) => { byPointer.current = e.pointerType !== "mouse"; }}>
      <div className="adp-plate" data-empty={(timeOnly ? !t0 : !d0) || undefined}>
        {timeOnly ? (
          <span className="adp-say">
            <b>{t0 ? TIME.format(sd) : "اختر الساعة"}</b>
          </span>
        ) : (
          <>
            <span className="ad-td-stub" data-cut={cutOf(shown)} aria-hidden>
              <b className="ad-num">{monthOnly ? +shown.slice(5, 7) : +shown.slice(8, 10)}</b>
              <span>{monthOnly ? shown.slice(0, 4) : MONTH.format(sd)}</span>
            </span>
            <span className="adp-say">
              <b>{monthOnly ? (d0 ? MONTH.format(sd) : "اختر الشهر") : d0 ? WEEKDAY.format(sd) : "اختر اليوم"}</b>
              {withTime ? <span>{d0 ? TIME.format(sd) : "ثمّ الساعة"}</span> : null}
            </span>
          </>
        )}
      </div>

      <div className="adp-body">
        {timeOnly ? null : <>
        <div className="adp-head">
          <button type="button" className="ad-ibtn" aria-label={level === "days" ? "الشهر السابق" : level === "months" ? "السنة السابقة" : "السنوات السابقة"} onClick={() => move(-1)}><ToRight /></button>
          {/* العنوانُ نفسُه بابُ القفز: من الأيّام إلى الشهور، ومن الشهور إلى السنين */}
          {level === "years" ? (
            <b className="adp-month" dir="ltr">{yStart} – {yStart + 11}</b>
          ) : (
            <button type="button" className="adp-title" aria-label={level === "days" ? "اختر الشهر والسنة" : "اختر السنة"}
              onClick={() => setLevel(level === "days" ? "months" : "years")}>
              {level === "days" ? MONTH.format(new Date(Date.UTC(view.y, view.m, 1))) : view.y}
              <Svg d="M6 9l6 6 6-6" />
            </button>
          )}
          <button type="button" className="ad-ibtn" aria-label={level === "days" ? "الشهر التالي" : level === "months" ? "السنة التالية" : "السنوات التالية"} onClick={() => move(1)}><ToLeft /></button>
        </div>
        {level === "months" ? (
          <div className="adp-picks">
            {Array.from({ length: 12 }, (_, m) => (
              <button key={m} type="button" className="adp-day" data-on={(d0 && +d0.slice(0, 4) === view.y && +d0.slice(5, 7) - 1 === m) || undefined}
                data-today={(+today.slice(0, 4) === view.y && +today.slice(5, 7) - 1 === m) || undefined}
                disabled={view.y * 12 + m < minM || view.y * 12 + m > maxM ? true : undefined}
                onClick={() => { if (monthOnly) { onPick(`${view.y}-${pad(m + 1)}`); done(); return; } setView({ y: view.y, m }); setLevel("days"); }}>{MONTH_ONLY.format(new Date(Date.UTC(view.y, m, 1)))}</button>
            ))}
          </div>
        ) : level === "years" ? (
          <div className="adp-picks">
            {Array.from({ length: 12 }, (_, i) => yStart + i).map((y) => (
              <button key={y} type="button" className="adp-day" data-on={(d0 && +d0.slice(0, 4) === y) || undefined}
                data-today={+today.slice(0, 4) === y || undefined} disabled={y < minY || y > maxY ? true : undefined}
                onClick={() => { setView({ y, m: view.m }); setLevel("months"); }}>{y}</button>
            ))}
          </div>
        ) : (
        <div className="adp-grid" onKeyDown={onGridKey}>
          {WEEK.map((w) => <span key={w} className="adp-wk">{w}</span>)}
          {cells.map((c, i) => c ? (
            <button key={c.key} type="button" className="adp-day" data-key={c.key} tabIndex={c.key === tabKey ? 0 : -1} onFocus={() => setRoam(c.key)}
              aria-label={DAY_FULL.format(new Date(Date.UTC(view.y, view.m, c.d)))} aria-pressed={c.key === d0} aria-current={c.key === today ? "date" : undefined}
              data-on={c.key === d0 || undefined} data-today={c.key === today || undefined}
              disabled={(minD && c.key < minD) || (maxD && c.key > maxD) ? true : undefined}
              onClick={() => { emit(c.key); if (!withTime) done(); }}>{c.d}</button>
          ) : <span key={`e${i}`} />)}
        </div>
        )}
        </>}

        {withTime ? (
          // الوقتُ سطرٌ واحد (محمد: «كبير جدًّا جدًّا»): الساعةُ والدقيقةُ عدّادان، و«ص / م» المبدّلُ الواحد
          <div className="adp-time">
            <span className="adp-k">الساعة</span>
            <div className="adp-clock" dir="ltr">
              <div className="adp-step">
                <button type="button" aria-label="ساعة أقلّ" onClick={() => setHour(h12 === 1 ? 12 : h12 - 1)}><ToLeft /></button>
                <b aria-live="polite">{h12}</b>
                <button type="button" aria-label="ساعة أكثر" onClick={() => setHour(h12 === 12 ? 1 : h12 + 1)}><ToRight /></button>
              </div>
              <b className="adp-colon">:</b>
              {/* الدقيقةُ حرّة (محمد ٢٠٢٦-١١-٢٠): السهمان طريقٌ سريعٌ بخطوة خمس، ومن خارجها يُردّ إلى أقرب خمس في جهته (١٢ ← ١٥ أو ١٠)،
                  والرقمُ نفسُه يُكتب (٠–٥٩) لما لا تبلغه الخمسات: «١١:٥٩ م» آخرُ دقيقةٍ في مواعيد الإغلاق */}
              <div className="adp-step">
                <button type="button" aria-label="خمس دقائق أقلّ" onClick={() => emit(d0 || today, hh, ((Math.ceil(mm / 5) * 5 - 5) + 60) % 60)}><ToLeft /></button>
                <input className="adp-min" inputMode="numeric" maxLength={2} aria-label="الدقيقة" value={minDraft ?? pad(mm)}
                  onFocus={(e) => { setMinDraft(pad(mm)); e.currentTarget.select(); }}
                  onChange={(e) => {
                    // ما فوق ٥٩ لا يُكتب أصلًا (كان يُقبل «٨٨» ثمّ يصير ٥٩ عند Enter): الضغطةُ التي تتجاوزه تُهمَل، فـ«٨» ثمّ «٨» تبقى «٨» أي ٠٨
                    const d = e.currentTarget.value.replace(/\D/g, "").slice(0, 2);
                    if (d.length < 2 || +d <= 59) setMinDraft(d);
                  }}
                  onBlur={commitMin}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitMin(); e.currentTarget.select(); }
                    else if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const m = (mm + (e.key === "ArrowUp" ? 1 : 59)) % 60; setMinDraft(pad(m)); emit(d0 || today, hh, m); }
                  }} />
                <button type="button" aria-label="خمس دقائق أكثر" onClick={() => emit(d0 || today, hh, (Math.floor(mm / 5) * 5 + 5) % 60)}><ToRight /></button>
              </div>
            </div>
            <div className="ad-switch adp-ampm" role="group" aria-label="صباحًا أو مساءً">
              <button type="button" className="ad-switch-seg" aria-pressed={!pm} onClick={() => pm && emit(d0 || today, hh - 12)}><span className="ad-switch-l">ص</span></button>
              <button type="button" className="ad-switch-seg" aria-pressed={pm} onClick={() => !pm && emit(d0 || today, hh + 12)}><span className="ad-switch-l">م</span></button>
            </div>
          </div>
        ) : null}

        <div className="adp-foot">
          {withTime ? (
            <button type="button" className="ad-btn ad-btn-fill ad-btn-sm" onClick={done}><Check />تمّ</button>
          ) : null}
          {/* الزرُّ القريبُ باسم نوعه: «اليوم» لليوم، و«الآن» للساعة (بتوقيت الرياض مقرّبةً إلى خمس دقائق)، و«هذا الشهر» للشهر */}
          <button type="button" className="ad-btn ad-btn-soft ad-btn-sm" disabled={todayOut || undefined} onClick={() => {
            if (monthOnly) { onPick(today.slice(0, 7)); done(); return; }
            setView({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 });
            if (timeOnly) { const [h, m] = riyadhNowHM(); emit(today, h, m); return; }
            emit(today); if (!withTime) done();
          }}>{timeOnly ? <><Clock />الآن</> : <><CalToday />{monthOnly ? "هذا الشهر" : "اليوم"}</>}</button>
          <button type="button" className="ad-btn ad-btn-soft ad-btn-sm" onClick={() => { onPick(""); done(); }}><Clear />مسح</button>
        </div>
      </div>
    </div>
  );
}
