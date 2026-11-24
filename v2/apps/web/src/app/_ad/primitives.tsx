"use client";

/**
 * لبناتُ الأساس الجديد (٢٠٢٦-١٠-٣٠) — الطبقتان ٢ و٣ في `v2/DESIGN.md`.
 *
 * كلُّ ما هنا يقرأ أصناف `.ad-*` من `@adeeb/design-system/ad.css` وحدها، ولا يكتب تنسيقًا.
 * والغرفةُ تُركَّب من هذه اللبنات ومن قالبها، فلا تعرف حجمَ خطٍّ ولا مسافةً ولا لونًا.
 *
 * والقرارات التي تحملها اللبنات (لا الغرف):
 * - **اللوح** رأسُ الغرفة بمادّة الشريط الجانبيّ، والفعلُ الأساسيّ في طرفه المقابل للاسم، في مكانٍ واحد لكلّ الغرف.
 * - **المواضع** مبدّلٌ واحدٌ لغرف القوائم كلّها، تحت اللوح، بعددها؛ والنادرُ منها في «المزيد».
 * - **الأفعال ظاهرة** أزرارًا، وأيقوناتُها بأسمائها تلميحًا — لا قائمةَ ⋮.
 * - **الشارة** لا تظهر إلّا حيث تخالف الحالُ موضعَها.
 * - **الفراغ** واحد: «لا شيء بعد» غيرُ «لا شيء يطابق».
 */
import Link from "next/link";
import { Fragment, createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { AnchoredPopover, Checkbox, Dialog, matchesSearch } from "@adeeb/design-system";
import { Copy, ListBullets, SquaresFour, UserCircleDashed, WhatsappLogo } from "@phosphor-icons/react";
import { CaretDown, CaretLeft, CaretRight, CaretUp, CaretUpDown, Check, CheckCircle, DuotoneZone, FunnelSimple, Info, MagnifyingGlass, Warning, WarningCircle, X } from "@/app/_components/glyphs";
import { DropdownMenu, type MenuGroup } from "@/app/dashboard/_components/DropdownMenu";
import { useRouter } from "next/navigation";
import { useAdLab } from "./lab";
import { SortGrip, useSortItem, useSortNode } from "./reorder";
import { dayParts, fmtNum, fmtPct } from "./format";
import { arCount, type ArForms } from "@/lib/arabicCount";
import { copyText } from "@/lib/clipboard";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { Avatar } from "@/app/dashboard/_components/Avatar";

export type AdTone = "ok" | "warn" | "bad" | "info" | "neutral";

/* ═══ الغرفة ═══
   لا تحمل وضعًا (فاتحًا أو داكنًا): الوضعُ للموقع كلّه على `<html data-theme>` (`lib/theme.ts`).
   **والغرفةُ منطقةُ duotone كالشريط الجانبيّ** (محمد ٢٠٢٦-١٠-٣٠: «اخترتُ نوعًا واحدًا من الأيقونات، والأيقوناتُ
   متفاوتة»): كان في الصفّ الواحد رمزٌ بوزن الموقع (`ChartBar`، `LinkSimple`) بجانب رمزٍ من قائمة الاستثناء بوزنٍ
   عريض (`PencilSimple`، `Trash`). والمنطقةُ تردّ كلَّ رمزٍ فيها إلى وزنٍ واحد — وزنِ الشريط — حتى ما في قوائمها. */
export function AdRoom({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <DuotoneZone>
      <div className="ad-room" role="region" aria-label={label}>
        {children}
      </div>
    </DuotoneZone>
  );
}

/* ═══ الزرّ ═══ */
type BtnVariant = "fill" | "inverse" | "inverse-quiet" | "line" | "soft" | "quiet" | "danger" | "danger-fill";
/** `iconEnd`: الرمزُ بعد الاسم — للسهم الذي يشير إلى جهة سيره («التالي ‹» مقابل «› السابق») */
/** `first`: يتلقّى التركيزَ حين تُفتح نافذتُه (`data-autofocus`) — للخروج الآمن في تأكيد الفعل الخطِر.
 *  `busy`: الفعلُ يجري — دوّارةٌ مكانَ الرمز (أو قبل الاسم إن لم يكن له رمز)، والنقرُ لا يُكرَّر.
 *  `held`: موقوفٌ مؤقّتًا (إلغاءُ نافذةٍ يجري فعلُها). **وكلاهما `aria-disabled` لا `disabled`**: الزرُّ المعطَّل يُسقط التركيزَ
 *  إلى أوّل الصفحة، فيخرج من النافذة المفتوحة ولا يعود (المراجعة المستقلّة). */
type BtnBase = { variant?: BtnVariant; size?: "sm" | "lg"; icon?: ReactNode; iconEnd?: boolean; children: ReactNode; done?: boolean; first?: boolean; busy?: boolean; held?: boolean;
  /** رابطٌ خارج الموقع (الخريطة): يُفتح في تبويبٍ جديد كما كان الرابطُ في الصفحات القديمة */
  external?: boolean;
  /**
   * **بلا ختمٍ بقرار** (حارسُ الختم `scripts/button-stamps.mjs`): الثانويُّ يحمل أيقونتَه دائمًا، إلّا الرجوعَ (إلغاء، إغلاق، تراجع) وثانيَي
   * الالتزام في النماذج — فيُكتب ذلك على الزرّ نفسه لا يُسكت عنه. لا أثرَ له في الرسم
   */
  plain?: boolean;
  /** زرُّ شريطٍ يُبقي حالته (العريضُ والقائمتان في المحرّر المرئيّ): يُعلن أنّه مضغوط، ويُرى كذلك */
  pressed?: boolean };
type BtnProps = BtnBase &
  ({ href: string; onClick?: never; disabled?: never } | { href?: never; onClick: () => void; disabled?: boolean });

/**
 * **قاعدةُ الختم كاملةً** (محمد ٢٠٢٦-١٠-٣١، من أربعة توجّهاتٍ مبنيّة): الفعلُ الأساسيّ **هو نفسُه قطعةٌ من اللوح** (`fill`:
 * فتح المحرّر، عرض النتائج) فلا يحتاج ختمًا، والثانويُّ الصندوقُ الأبيضُ الذي لا لونَ فيه **فيحمل ختمًا من اللوح** في مربّع
 * أيقونته (إلغاء النشر، تحرير، مسح الكلّ). فلا يتنافس مربّعان في قاعٍ واحد، والرتبةُ ظاهرة: اللوحُ ثمّ الختمُ ثمّ «المزيد».
 */
const btnClass = (v: BtnVariant, size?: "sm" | "lg", end?: boolean) => `ad-btn ad-btn-${v}${size ? ` ad-btn-${size}` : ""}${end ? " ad-btn-end" : ""}`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- `plain` علامةٌ للحارس لا للرسم، فتُنزع من الخصائص
export function AdButton({ variant = "line", size, icon, iconEnd, children, done, first, busy, held, external, plain: _plain, pressed, ...rest }: BtnProps) {
  if ("href" in rest && rest.href && external) {
    return (
      <a href={rest.href} target="_blank" rel="noopener noreferrer" className={btnClass(variant, size, iconEnd)}>
        {!iconEnd && icon}
        {children}
        {iconEnd && icon}
      </a>
    );
  }
  // علامةٌ في الصفحة نفسِها رابطٌ عاديّ لا `Link`: الموجِّهُ يقفز إليها قفزًا، والانزلاقُ يتولّاه `SmoothScroll` (١١-٢٤)
  if ("href" in rest && rest.href?.startsWith("#")) {
    return (
      <a href={rest.href} className={btnClass(variant, size, iconEnd)} data-done={done || undefined}>
        {!iconEnd && icon}
        {children}
        {iconEnd && icon}
      </a>
    );
  }
  if ("href" in rest && rest.href) {
    return (
      <Link href={rest.href} className={btnClass(variant, size, iconEnd)} data-done={done || undefined}>
        {!iconEnd && icon}
        {children}
        {iconEnd && icon}
      </Link>
    );
  }
  const r = rest as { onClick: () => void; disabled?: boolean };
  const mark = busy ? <span className="ad-spin" aria-hidden /> : icon;
  return (
    <button
      type="button"
      className={btnClass(variant, size, iconEnd)}
      onClick={busy || held ? undefined : r.onClick}
      disabled={r.disabled}
      aria-disabled={busy || held || undefined}
      aria-busy={busy || undefined}
      aria-pressed={pressed}
      data-done={done || undefined}
      data-autofocus={first || undefined}
    >
      {!iconEnd && mark}
      {children}
      {iconEnd && !busy && icon}
    </button>
  );
}

/** زرُّ أيقونة ظاهرٌ دائمًا، واسمُه للقارئ الآليّ وللتلميح معًا. */
export function AdIconButton({
  label, icon, onClick, href, danger, quiet, disabled, external, done,
}: { label: string; icon: ReactNode; onClick?: () => void; href?: string; danger?: boolean; disabled?: boolean;
  /** خطرٌ هادئ: رمزٌ أحمرُ على صبغة الخطر لا زرٌّ مصمت — حين يجاوره زرٌّ مصمتٌ أحمر (إعجابٌ مضغوط) فلا يلتبسان */
  quiet?: boolean;
  /** رابطٌ خارجيّ (الخريطة، واتساب) يُفتح في نافذةٍ جديدة، ويقول ذلك لقارئ الشاشة */
  external?: boolean;
  /** تمّ الفعلُ للتوّ («نُسخ الرابط»): الرمزُ بلون النجاح (`[data-done]`) */
  done?: boolean }) {
  const cls = `ad-ibtn${danger ? " ad-ibtn-danger" : ""}`;
  if (href && external) {
    return (
      <a href={href} className={cls} aria-label={`${label}، يُفتح في نافذةٍ جديدة`} data-tip={label} target="_blank" rel="noopener noreferrer">
        {icon}
      </a>
    );
  }
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={label} data-tip={label}>
        {icon}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} aria-label={label} data-tip={label} onClick={onClick} disabled={disabled} data-done={done || undefined} data-quiet={quiet || undefined}>
      {icon}
    </button>
  );
}

/* ═══ الشارة ═══ */
/**
 * **الشارة — قطعةٌ واحدة للكرت والسطر** (محمد ٢٠٢٦-١٠-٣١: «لماذا لا يكون هو الأخضر وليس نقطة؟»): الحالُ تملأ الشارةَ بلونها
 * («منشور» خضراء، «موقوف» كهرمانيّة، «أُعيد للتعديل» حمراء)، والعلامةُ والنوعُ محايدان برمزهما («مميّز» بالنجمة).
 * (كانت في الكرت «رقاقةً» بنقطةٍ ملوّنة — بقيّةُ زمن الزجاج على اللوح حيث لا تُقرأ التعبئة — وفي السطر «شارةً» معبّأة: قطعتان لمعنًى واحد.)
 */
export function AdBadge({ tone = "neutral", icon, glass, children }: {
  tone?: AdTone; icon?: ReactNode;
  /** **الشارةُ الزجاجيّة** فوق صورةٍ ملوّنة (غلافُ الكرت في الموقع العامّ، محمد ٢٠٢٦-١١-١٥: «لماذا لا نأخذ البادج العادي ونصنع منه واحدًا زجاجيًّا؟») — هندستُها هندستُها، ومادّتُها زجاجُ اللوح */
  glass?: boolean; children: ReactNode;
}) {
  return (
    <span className="ad-badge" data-tone={tone === "neutral" ? undefined : tone} data-glass={glass || undefined}>
      {icon}
      {children}
    </span>
  );
}

/* ═══ البصمة: لوح الغرفة ═══ */
/** `rare`: موضعٌ يُفتح نادرًا (الأرشيف، والمحذوفات، والملغاة) — مكانُه «المزيد» في المبدّل لا صفُّه. */
/** `count` اختياريّ: موضعٌ ليس عددًا (عرضٌ من عروض السجلّ — «التحليلات» في نتائج الاستبيان، ٢٠٢٦-١١-٠٧) يُكتب اسمُه وحده */
export type AdPosition = { key: string; label: string; count?: number; rare?: boolean };
/** `busy`: يدور الزرُّ وحدَه حتى يعود ما فعله (حضورُ متطوّعٍ في الطابور)، ويُمسَك إخوتُه في السجلّ نفسِه. */
export type AdAction =
  | { label: string; icon?: ReactNode; href: string; onClick?: never; busy?: never; disabled?: never }
  | { label: string; icon?: ReactNode; onClick: () => void; href?: never; busy?: boolean;
      /** موقوفٌ لسببٍ في السجلّ (قبولُ متطوّعٍ اكتمل عددُ فترته) — يُرى ولا يُضغط */
      disabled?: boolean };

/** اللوح — رأسُ الغرفة: المسار، والاسم، والفعلُ الأساسيّ. والمواضعُ ليست فيه، تحته في المبدّل. ولا سطرَ حالٍ فيه (٢٠٢٦-١٠-٣١). */
/** مسارُ اللوح — واحدٌ للوح الغرفة ولكعب الكرت الذي يلبس رأسَها (`AdRoomBand`) */
export function PlateCrumb({ crumb }: { crumb?: { label: string; href?: string }[] }) {
  if (!crumb || crumb.length === 0) return null;
  return (
    <nav className="ad-crumb" aria-label="المسار">
      {crumb.map((c, i) => (
        <span key={c.label} className="ad-crumb-step">
          {c.href ? <Link href={c.href}>{c.label}</Link> : <span>{c.label}</span>}
          {i < crumb.length - 1 && <CaretLeft aria-hidden />}
        </span>
      ))}
    </nav>
  );
}

export function RoomPlate({
  title, crumb, action, extra,
}: {
  title: string;
  crumb?: { label: string; href?: string }[];
  action?: AdAction;
  /**
   * فعلٌ ثانٍ للغرفة كلّها (محمد ٢٠٢٦-١١-٠١: «معاينة الشهادة» بجانب «إصدار شهادة»): **نصٌّ هادئٌ على اللوح** برمزه بلا صندوق،
   * فيبقى الإنشاءُ وحده القطعةَ الزجاجيّة — درجتان لا فعلان متساويان.
   */
  extra?: AdAction;
}) {
  return (
    <section className="ad-plate" aria-labelledby="ad-room-title">
      <div className="ad-plate-body">
        <div className="ad-plate-id">
          <PlateCrumb crumb={crumb} />
          <h1 id="ad-room-title" className="ad-plate-title">{title}</h1>
        </div>
        {(action || extra) && (
          <div className="ad-plate-act">
            {extra && (extra.href ? (
              <AdButton variant="inverse-quiet" icon={extra.icon} href={extra.href}>{extra.label}</AdButton>
            ) : (
              <AdButton variant="inverse-quiet" icon={extra.icon} onClick={extra.onClick!}>{extra.label}</AdButton>
            ))}
            {action && (action.href ? (
              <AdButton variant="inverse" icon={action.icon} href={action.href}>{action.label}</AdButton>
            ) : (
              <AdButton variant="inverse" icon={action.icon} onClick={action.onClick!}>{action.label}</AdButton>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══ المبدّل — مواضعُ الغرفة (اتّفاق محمد ٢٠٢٦-١٠-٣٠) ═══
   الوظيفةُ الواحدة كانت مبنيّةً في البوّابة بخمسة أشكال (تبويبٌ بخطّ، وكبسولات، ومبدّل، وروابطُ بشكل
   تبويب، وأزرارٌ في الأدوات)، فصارت لبنةً واحدة لغرف القوائم كلّها (الجردُ في مستند المشروع
   `list-rooms-inventory.md`: ستٌّ وأربعون غرفة). وقواعدُها:
   - **أجزاءٌ متساوية العرض،** في كلّ جزءٍ اسمُ الموضع وعدده. والمختارُ بتدرّج الهويّة.
   - **حجمٌ ثابت:** عرضُ الجزء واحدٌ في المكتب واللوحيّ، ولا يمتدّ إلّا على الجوّال ليملأ السطر — فلا
     يأخذ نصفَ الصفحة هنا وكلَّها هناك (ملاحظةُ محمد على الكبسولات).
   - **أربعةُ أجزاءٍ على الأقلّ، وما اتّسع له العرضُ فوقها** (محمد ٢٠٢٦-١١-٠٤: «المزيد» أخفت لجنتين من ثلاثٍ في «قسمي» والشريطُ
     يتّسع لها — واللجانُ أصلُ الغرفة): يُقاس الشريط فيظهر من الأجزاء ما يتّسع له بعرضٍ لا يقلّ عن `SEG_MIN`، ولا يقلّ عن أربعة
     (كان حدًّا ثابتًا). وما يُفتح نادرًا (`rare`) وما فاض يذهب إلى جزءٍ أخير «المزيد» يفتح قائمةً بعددها. وإن كان الموضعُ المختار
     هناك، حمل الجزءُ اسمَه وعددَه فلا يضيع المكان.
   - الغرفةُ بلا مواضع لا يُرسم لها شيء. */
const SWITCH_MIN = 4;
/** أقلُّ عرضٍ للجزء بوحدة خطّ الشريط — اسمُ لجنةٍ وعددُها بلا قصّ */
const SEG_MIN = 9;

export function AdSwitch({
  positions, position, onPosition, label = "المواضع",
}: {
  positions: AdPosition[];
  position: string;
  onPosition: (key: string) => void;
  label?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [max, setMax] = useState(SWITCH_MIN);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      const seg = (parseFloat(getComputedStyle(el).fontSize) || 16) * SEG_MIN;
      setMax(Math.max(SWITCH_MIN, Math.floor(el.clientWidth / seg)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  if (positions.length < 2) return null;
  let shown = positions.filter((p) => !p.rare);
  let more = positions.filter((p) => p.rare);
  if (shown.length + (more.length > 0 ? 1 : 0) > max) {
    const keep = max - 1;
    more = [...shown.slice(keep), ...more];
    shown = shown.slice(0, keep);
  }
  // **«المزيد» بموضعٍ واحدٍ لا يُفتح** (محمد ٢٠٢٦-١١-٠٢: «الملغاة وحدها في المزيد — أليس المفروضُ أن تظهر مكانَه؟») — قاعدةُ
  // أفعال السجلّ نفسُها: القائمةُ لما زاد على واحد، والواحدُ يظهر باسمه وعدده في مكانها
  if (more.length === 1) { shown = [...shown, ...more]; more = []; }
  const inMore = more.find((p) => p.key === position);
  return (
    <div ref={box} className="ad-switch" role="group" aria-label={label}>
      {shown.map((p) => (
        <button
          key={p.key}
          type="button"
          className="ad-switch-seg"
          aria-pressed={p.key === position}
          onClick={() => onPosition(p.key)}
        >
          <span className="ad-switch-l" title={p.label}>{p.label}</span>
          {p.count !== undefined && <span className="ad-switch-n">{fmtNum(p.count)}</span>}
        </button>
      ))}
      {more.length > 0 && <AdSwitchMore more={more} inMore={inMore} position={position} onPosition={onPosition} />}
    </div>
  );
}

/** «المزيد» في المبدّل: اختيارُ موضع — فقائمتُه قائمةُ الاختيار (`AdChoiceList`)، والعددُ في كبسولة الأجزاء نفسِها. */
function AdSwitchMore({
  more, inMore, position, onPosition,
}: {
  more: AdPosition[];
  inMore?: AdPosition;
  position: string;
  onPosition: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btn}
        type="button"
        className={"ad-switch-seg" + (inMore ? " is-on" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={inMore ? `${inMore.label}، ومواضع أخرى` : "مواضع أخرى"}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); setOpen(true); } }}
      >
        <span className="ad-switch-more">
          {inMore ? inMore.label : "المزيد"}
          <CaretDown className="ad-caret" aria-hidden />
        </span>
        {inMore?.count !== undefined && <span className="ad-switch-n">{fmtNum(inMore.count)}</span>}
      </button>
      <AdChoiceList
        open={open}
        anchorRef={btn}
        label="مواضع أخرى"
        options={more.map((p) => ({ value: p.key, label: p.label, count: p.count }))}
        value={inMore ? position : ""}
        onChoose={(v) => { onPosition(v); setOpen(false); btn.current?.focus(); }}
        onDismiss={(reason) => { setOpen(false); if (reason === "escape") btn.current?.focus(); }}
      />
    </>
  );
}

/* ═══ شريط الأدوات ═══
   **بلغة المبدّل فوقه لا قطعًا متفرّقة** (محمد ٢٠٢٦-١٠-٣٠: «الفلاتر كمكانٍ وطريقةِ عرض تحتاج تطويرًا لتكون هويّةً
   متكاملة… لا تشطح وتقدّم مكوّنًا جديدًا»): مسارٌ أبيضُ واحد بحدٍّ رفيع وبارتفاع المبدّل، فيه البحثُ مفتوحًا،
   ثمّ المرشّحاتُ وطريقةُ العرض أجزاءً مصبوغة (الأداةُ خطوةٌ عن أرضها). **والمرشّحُ المُفعَّل قطعةٌ من اللوح**
   كالموضع المختار — فيُرى من بعيدٍ أنّ القائمة منخولة.
   - **المرشّحُ قائمةُ «المزيد» نفسُها** (`DropdownMenu`) لا قائمةُ المتصفّح: كانت على الشاشة قائمتان بلغتين.
   - **ولا عدّادَ مرئيّ:** كان يكرّر عددَ الجزء المختار في المبدّل حرفيًّا (والمبدّلُ يتبع البحثَ أصلًا)؛
     فبقي إعلانًا لقارئ الشاشة وحده.
   - **وطريقةُ العرض ظاهرةٌ في كلّ مقاس:** كانت تختفي على الجوّال والعرضُ المحفوظُ يبقى، فمن اختار الجدولَ على
     المكتب علِق فيه على الجوّال بلا مخرج (وجده محمد).
   - **والمرشّحُ المُفعَّل يُرفع من مكانه بـ✕** (قرار محمد ٢٠٢٦-٠٨-١٤ في الشريط القديم: «الذي وضع المرشّح هو الذي
     يرفعه»)، فلا زرَّ «إعادة تعيين» عامّ يطفو. وزرّان متجاوران لا زرٌّ داخل زرّ.
   - **وبالعدد لا بالمقاس:** مرشّحٌ أو اثنان جزءان ظاهران؛ ومن ثلاثةٍ فأكثر جزءٌ واحد «التصفية» بعدد المُفعَّل، يفتح
     لوحةً فيها المرشّحاتُ كلُّها صفوفًا من الأزرار — في كلّ مقاس، فلا تتبدّل الأداةُ بين الجوّال والمكتب.
     قيس ٢٠٢٦-١٠-٣٠: من ١٩ غرفةً فيها مرشّحات، ١٦ بواحدٍ أو اثنين، والأعضاءُ بخمسة والإنذاراتُ وديبو بثلاثة.
     وكلُّها اختيارٌ واحدٌ من قائمة؛ لا متعدّدَ ولا تاريخَ ولا مفتاح. */
/** من كم مرشّحًا تُجمع المرشّحاتُ في جزء «التصفية» (القياسُ أعلاه). */
const FILTER_PANEL_AT = 3;
export type AdFilter = {
  key: string;
  label: string;
  value: string;
  /** `chip`: اسمُ الخيار مختارًا حين لا يقول نفسَه خارج مجموعته («نعم» ← «أحضرت؟: نعم») */
  options: { value: string; label: string; group?: string; chip?: string; groupIcon?: ReactNode }[];
  onChange: (v: string) => void;
};

export function AdTools({
  search, filters, view, count,
}: {
  search: { value: string; onChange: (v: string) => void; placeholder: string };
  filters?: AdFilter[];
  view?: { value: "cards" | "list"; onChange: (v: "cards" | "list") => void };
  count?: string;
}) {
  const lab = useAdLab();
  const list = filters ?? [];
  const inPanel = list.length >= (lab.filterPanelAt ?? FILTER_PANEL_AT);
  const hasSet = list.length > 0 || !!view;
  return (
    <div className="ad-tools">
      {/* ✕ المسح زرُّنا لا زرُّ المتصفّح (✕ أزرقُ أصليّ لا يعرف الهويّة — محمد ٢٠٢٦-١٠-٣٠)، وحبّةُ ✕ المرشّح نفسُها.
          وغلافٌ لا `<label>`: زرٌّ داخل التسمية وسمٌ غيرُ صالح، والحقلُ مسمًّى بـ`aria-label`. */}
      <div className="ad-search">
        <MagnifyingGlass aria-hidden />
        <input
          className="ad-search-input"
          type="search"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder}
          aria-label={search.placeholder}
        />
        {search.value && (
          <button
            type="button"
            className="ad-search-x"
            aria-label="امسح البحث"
            // الزرُّ يختفي بعد عمله، فالتركيزُ يعود إلى الحقل لا إلى أوّل الصفحة
            onClick={(e) => { search.onChange(""); (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null)?.focus(); }}
          >
            <X aria-hidden />
          </button>
        )}
      </div>
      {hasSet && (
        <div className="ad-tools-set">
          {inPanel ? <AdFilterPanel filters={list} /> : list.map((f) => <AdFilterMenu key={f.key} f={f} />)}
          {view && (
            <div className="ad-seg" role="group" aria-label="طريقة العرض">
              <button type="button" className="ad-ibtn" aria-pressed={view.value === "cards"} aria-label="كروت" data-tip="كروت" onClick={() => view.onChange("cards")}>
                <SquaresFour />
              </button>
              <button type="button" className="ad-ibtn" aria-pressed={view.value === "list"} aria-label="قائمة" data-tip="قائمة" onClick={() => view.onChange("list")}>
                <ListBullets />
              </button>
            </div>
          )}
        </div>
      )}
      {count && <span className="ad-sr" aria-live="polite">{count}</span>}
    </div>
  );
}

/**
 * **قائمةُ الاختيار — قطعةٌ واحدةٌ لكلّ «اختر واحدًا»** (محمد ٢٠٢٦-١٠-٣١): المرشّحُ و«المزيد» في المبدّل. كانا يُبنيان بقائمة
 * الأفعال (`DropdownMenu`، لتنفيذ الأفعال)، فجاء المختارُ صحًّا كفعلٍ نُفّذ، وعددُ الموضع «(1)» بين قوسين. فصارت:
 * - **هي قائمةُ «المزيد» نفسُها** (`.dm-menu`/`.dm-item`، محمد ٢٠٢٦-١٠-٣١: «الأجملُ ما كان في المزيد»، وقطعةُ اللوح للمختار
 *   «مبالغٌ فيها جدًّا»): المختارُ علامةٌ ✓ في موضع رمز الفعل وخطٌّ أعرض، والمرورُ مرورُها. والعددُ في كبسولة المبدّل.
 * - المجموعاتُ برؤوس الشريط الجانبيّ، و**بحثٌ في رأسها حين تطول** (أكثرُ من ثمانية خيارات).
 * - دلالةُ «قائمة اختيار» (`listbox`/`option`) والأسهمُ وEnter وEsc.
 */
const SEARCH_AT = 8;
/** `apart`: خطٌّ بعده — «الكلّ» رفعُ المرشّح لا قيمةٌ من قيمه، كما يُفصل «حذف» عن الأفعال في «المزيد» */
/** `groupIcon`: رمزُ مجموعته قبل اسمها في رأسها — كرأس مجموعة قائمة الحقل (محمد ٢٠٢٦-١١-١٢) */
type AdChoice = { value: string; label: string; group?: string; groupIcon?: ReactNode; count?: number; apart?: boolean };
type AdChoiceProps = {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  label: string;
  options: AdChoice[];
  value: string;
  onChoose: (v: string) => void;
  onDismiss: (reason: "escape" | "pointer") => void;
  /** بعرض زرّها — حين يكون الزرُّ حقلًا ممتدًّا (في لوحة «التصفية») */
  matchWidth?: boolean;
};
/** تُركَّب عند كلّ فتح، فتبدأ بحالٍ جديدة: البحثُ فارغ، والمؤشّرُ على المختار. */
function AdChoiceList(props: AdChoiceProps) {
  return props.open ? <AdChoiceListOpen {...props} /> : null;
}
function AdChoiceListOpen({ anchorRef, label, options, value, onChoose, onDismiss, matchWidth }: AdChoiceProps) {
  const [q, setQ] = useState("");
  // لا صفَّ مُضاءً عند الفتح كقائمة «المزيد»: الإضاءةُ للفأرة أو للأسهم فقط
  const sel = options.findIndex((o) => o.value === value);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const uid = useId();
  const long = options.length > SEARCH_AT;
  const flat = q.trim() ? options.filter((o) => matchesSearch(q, o.label)) : options;

  // التركيزُ بعد أن تتموضع المنبثقةُ وتظهر (المخفيُّ `visibility: hidden` لا يقبله)
  useEffect(() => {
    const id = requestAnimationFrame(() => (long ? search.current : box.current)?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [long]);
  const searching = !!q.trim();
  useEffect(() => {
    const at = active >= 0 ? active : searching ? -1 : sel;
    if (at >= 0) document.getElementById(`${uid}-o${at}`)?.scrollIntoView({ block: "nearest" });
  }, [active, uid, sel, searching]);

  const onKey = (e: React.KeyboardEvent) => {
    const n = flat.length;
    if (!n) return;
    // أوّلُ سهمٍ يبدأ من المختار، والبحثُ يبدأ من أوّل نتيجة
    const start = searching ? 0 : Math.max(0, sel);
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a < 0 ? start : (a + 1) % n)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a < 0 ? start : (a - 1 + n) % n)); }
    else if (e.key === "Home" && !long) { e.preventDefault(); setActive(0); }
    else if (e.key === "End" && !long) { e.preventDefault(); setActive(n - 1); }
    else if (e.key === "Enter") { e.preventDefault(); const o = active < 0 ? undefined : flat[Math.min(active, n - 1)]; if (o) onChoose(o.value); }
  };

  // المجموعاتُ بترتيبها، والترتيبُ المسطّحُ للأسهم هو ترتيبُ الرسم نفسُه
  const groups: { group?: string; icon?: ReactNode; items: { o: AdChoice; i: number }[] }[] = [];
  flat.forEach((o, i) => {
    const last = groups[groups.length - 1];
    if (last && last.group === o.group) last.items.push({ o, i });
    else groups.push({ group: o.group, icon: o.groupIcon, items: [{ o, i }] });
  });

  return (
    <AnchoredPopover open anchorRef={anchorRef} onDismiss={onDismiss} align="start" matchWidth={matchWidth} className="dm-menu ad-flist" reflowKey={q}>
      {long && (
        <div className="ad-flist-search">
          <MagnifyingGlass aria-hidden />
          <input
            ref={search}
            type="text"
            value={q}
            placeholder={`ابحث في ${label}…`}
            aria-label={`ابحث في ${label}`}
            role="combobox"
            aria-expanded
            aria-controls={`${uid}-list`}
            aria-activedescendant={flat.length && active >= 0 ? `${uid}-o${active}` : undefined}
            onChange={(e) => { setQ(e.target.value); setActive(e.target.value.trim() ? 0 : -1); }}
            onKeyDown={onKey}
          />
        </div>
      )}
      <div
        ref={box}
        className="ad-flist-body"
        id={`${uid}-list`}
        role="listbox"
        aria-label={label}
        tabIndex={long ? -1 : 0}
        aria-activedescendant={!long && flat.length && active >= 0 ? `${uid}-o${active}` : undefined}
        onKeyDown={long ? undefined : onKey}
        // النقرُ والمرورُ على القائمة كلِّها لا على كلّ خيار: الخيارُ يحمل قيمتَه وترتيبَه
        onClick={(e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("[data-v]"); if (el) onChoose(el.dataset.v ?? ""); }}
        onMouseMove={(e) => { const el = (e.target as HTMLElement).closest<HTMLElement>("[data-i]"); if (el) setActive(Number(el.dataset.i)); }}
        onMouseLeave={() => setActive(-1)}
      >
        {groups.map((g, gi) => (
          <div key={gi} role={g.group ? "group" : "presentation"} aria-label={g.group}>
            {g.group && <div className="dm-hd" aria-hidden>{g.icon ? <span className="dm-hd-ic">{g.icon}</span> : null}<span>{g.group}</span></div>}
            {g.items.map(({ o, i }) => (
              <Fragment key={o.value || "all"}>
                <div
                  id={`${uid}-o${i}`}
                  role="option"
                  aria-selected={o.value === value}
                  data-highlighted={i === active ? "" : undefined}
                  data-v={o.value}
                  data-i={i}
                  className="dm-item"
                >
                  {/* العلامةُ في آخر الصفّ كمنسدل الهويّة (`.asel-ck`)، محجوزةٌ بالرؤية فلا يتزحزح شيء، وأوّلُ الصفّ للاسم لا لفراغ */}
                  <span className="ad-flist-l">{o.label}</span>
                  {o.count !== undefined && <span className="ad-switch-n">{fmtNum(o.count)}</span>}
                  <Check className="ad-flist-ck ad-line" aria-hidden />
                </div>
                {o.apart && i < flat.length - 1 && <div className="dm-sep" role="separator" />}
              </Fragment>
            ))}
          </div>
        ))}
        {!flat.length && <p className="ad-flist-none">لا خيارَ يطابق «{q.trim()}».</p>}
      </div>
    </AnchoredPopover>
  );
}

/**
 * **المرشّح:** زرُّه فارغًا باسمه وحده («الجهة ▾» لا «الجهة الكلّ»)، ومختارًا قطعةٌ من اللوح باسمه خافتًا وقيمتِه و✕؛ والسهمُ
 * ينقلب حين تُفتح قائمتُه (`AdChoiceList`)، و«الكلّ» أوّلُها.
 */
/** `onOpen`: تُبلغ به لوحةُ «التصفية» حين تحوي القائمةَ (مرشّحٌ طويل) — فلا تُغلق هي حين يُنقر في القائمة المنبثقة فوقها. */
/**
 * `field`: في لوحة «التصفية» — حقلٌ يمتدّ بعرض صفّه كحبّات جيرانه، ويقول قيمتَه («الكلّ»، «لجنة التأليف») لأنّ رأسَ الصفّ
 * يسمّيه (كان «الجهة ▾» تحت رأس «الجهة»)، وقائمتُه بعرضه.
 */
export function AdFilterMenu({ f, onOpen, field }: { f: AdFilter; onOpen?: (open: boolean) => void; field?: boolean }) {
  const [open, setOpenState] = useState(false);
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpen?.(v);
  };
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const chosen = f.value ? f.options.find((o) => o.value === f.value) : undefined;
  const choose = (v: string) => {
    f.onChange(v);
    setOpen(false);
    btn.current?.focus();
  };
  return (
    <span ref={wrap} className={"ad-filter" + (chosen ? " is-on" : "")}>
      <button
        ref={btn}
        type="button"
        className="ad-filter-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${f.label}: ${chosen ? chosen.chip ?? chosen.label : "الكلّ"}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); setOpen(true); } }}
      >
        {/* فارغًا باسمه وحده («الجهة ▾»)، ومختارًا باسمه خافتًا ثمّ قيمتِه («الجهة لجنة التأليف ✕») — الشريطُ ملخّصُ ما صُفّي،
            وبعضُ القيم لا تقول مرشّحَها وحدها («للجميع»، «نشط») (محمد ٢٠٢٦-١٠-٣١) */}
        {field ? (
          <b className="ad-filter-v" title={chosen?.chip ?? chosen?.label}>{chosen ? chosen.chip ?? chosen.label : "الكلّ"}</b>
        ) : (
          <>
            <span className="ad-filter-l">{f.label}</span>
            {chosen && <b className="ad-filter-v" title={chosen.chip ?? chosen.label}>{chosen.chip ?? chosen.label}</b>}
          </>
        )}
        {!chosen && <CaretDown className="ad-caret" aria-hidden />}
      </button>
      {chosen && (
        <button
          type="button"
          className="ad-filter-x"
          aria-label={`مسح مرشّح ${f.label}`}
          onClick={(e) => { f.onChange(""); (e.currentTarget.parentElement?.querySelector(".ad-filter-btn") as HTMLButtonElement | null)?.focus(); }}
        >
          <X aria-hidden />
        </button>
      )}
      <AdChoiceList
        open={open}
        anchorRef={wrap}
        matchWidth={field}
        label={f.label}
        options={[{ value: "", label: "الكلّ", apart: true }, ...f.options]}
        value={f.value ?? ""}
        onChoose={choose}
        onDismiss={(reason) => {
          setOpen(false);
          if (reason === "escape") btn.current?.focus();
        }}
      />
    </span>
  );
}

/**
 * «التصفية»: جزءٌ واحدٌ لثلاثة مرشّحاتٍ فأكثر، يفتح لوحتها — كجزء المبدّل تمامًا: رمزٌ واسمٌ وحبّةُ العدد، **بلا
 * سهم** (القمعُ يقول «يفتح مرشّحات»، والسهمُ بعد الحبّة كان رابعَ شيءٍ في جزءٍ صغير، «تموضعُه ووضعُه سيّئ»).
 * **ولا ✕ على الجزء:** بجانب حبّة العدد تصير حبّتان توأمين. فالمسحُ في رأس اللوحة بجانب اسمها («مسح الكلّ»)،
 * زرًّا هادئًا بسطحه ومربّع أيقونته (كان نصًّا عاريًا يُقرأ عنوانًا ثانيًا)، و«الكلّ» في كلّ صفّ. و«مسح» لا «حذف» ولا «ارفع»: «حذف» في البوّابة لإتلاف السجلّات، و«ارفع» لم تُفهم (محمد).
 */
function AdFilterPanel({ filters }: { filters: AdFilter[] }) {
  const [open, setOpen] = useState(false);
  const inner = useRef(false); // قائمةُ مرشّحٍ طويلٍ مفتوحةٌ فوق اللوحة
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const on = filters.filter((f) => f.value).length;
  // التركيزُ بعد أوّل إطار: المنبثقةُ مخفيّةٌ في إطارها الأوّل حتى تُقاس (كقائمة المرشّح)، فالتركيزُ قبله يضيع
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [open]);
  return (
    <span ref={wrap} className={"ad-filter" + (on ? " is-on" : "")}>
      <button
        ref={btn}
        type="button"
        className="ad-filter-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <FunnelSimple aria-hidden />
        <b className="ad-filter-v">التصفية</b>
        {on > 0 && <span className="ad-filter-n ad-num">{on}</span>}
      </button>
      <AnchoredPopover
        open={open}
        anchorRef={wrap}
        onDismiss={(reason) => {
          // النقرُ في قائمة المرشّح الطويل (منبثقةٌ فوق اللوحة) ليس خروجًا منها، وEsc الأوّلُ يُغلق القائمةَ وحدها
          if (inner.current) return;
          setOpen(false);
          if (reason === "escape") btn.current?.focus();
        }}
        align="start"
        className="ad-fpanel"
        role="dialog"
        ariaLabelledby={titleId}
        tabIndex={-1}
        panelRef={(el) => {
          panel.current = el;
        }}
      >
        <div className="ad-fpanel-top">
          <p id={titleId} className="ad-fpanel-t">التصفية</p>
          {on > 0 && (
            <AdButton variant="soft" size="sm" icon={<X className="ad-line" />} onClick={() => { filters.forEach((f) => f.value && f.onChange("")); panel.current?.focus({ preventScroll: true }); }}>
              مسح الكلّ
            </AdButton>
          )}
        </div>
        {filters.map((f) => (
          <div key={f.key} className="ad-fpanel-row" role="group" aria-label={f.label}>
            <p className="ad-fpanel-h">{f.label}</p>
            {/* **الطولُ يحكم الشكلَ في المكانين** (محمد ٢٠٢٦-١٠-٣١): القصيرُ حبّاتٌ تُلمس مرّة، والطويلُ زرُّ الشريط نفسُه
                يفتح قائمتَه ببحثها ومجموعاتها — لا جدارَ حبّاتٍ بلا بحث («الجهة» 18 خيارًا) */}
            {f.options.length > SEARCH_AT ? (
              <AdFilterMenu f={f} field onOpen={(o) => { inner.current = o; }} />
            ) : (
            <div className="ad-fpanel-opts">
              <button type="button" className="ad-fopt" aria-pressed={!f.value} onClick={() => f.onChange("")}>الكلّ</button>
              {groupOptions(f.options).map((g, gi) => (
                <span key={g.group ?? gi} className="ad-fpanel-grp">
                  {g.group && <span className="ad-fpanel-g">{g.group}</span>}
                  {g.items.map((o) => (
                    <button key={o.value} type="button" className="ad-fopt" aria-pressed={o.value === f.value} onClick={() => f.onChange(o.value)}>
                      {o.label}
                    </button>
                  ))}
                </span>
              ))}
            </div>
            )}
          </div>
        ))}
      </AnchoredPopover>
    </span>
  );
}

function groupOptions(options: AdFilter["options"]) {
  const out: { group?: string; items: AdFilter["options"] }[] = [];
  for (const o of options) {
    const last = out[out.length - 1];
    if (last && last.group === o.group) last.items.push(o);
    else out.push({ group: o.group, items: [o] });
  }
  return out;
}

/* ═══ الكرت والسطر ═══ */
/** **كلُّ معلومةٍ برمزها** (محمد ٢٠٢٦-١٠-٣٠: «الأيقونة تساعد على الفهم»): الرمزُ إلزاميٌّ في النوع نفسه، فلا تمرّ معلومةٌ بلا رمز. */
/** `tone`: سطرُ الحال يتلوّن بحاله رمزًا ونصًّا (مفتوح، يقترب، منتهٍ، محذوف) — فيُقرأ من بعيدٍ قبل كلامه. */
export type AdMetaTone = "ok" | "warn" | "bad" | "muted";
/**
 * `ltr`: نصٌّ لاتينيٌّ يُعزَل باتّجاهه (بريد، معرّف، رابط) فلا تنقلب أجزاؤه في السطر العربيّ.
 * `clip`: سطرٌ واحدٌ مقصوصٌ في السطر أيضًا (نصُّ رسالة) — والكرتُ يقصّ سطورَه كلَّها أصلًا، واسمُه كاملًا في التلميح.
 */
export type AdMeta = { icon: ReactNode; text: string; tone?: AdMetaTone; ltr?: boolean; clip?: boolean };
/** نصُّ المعلومة: معزولٌ باتّجاهه إن كان لاتينيًّا */
const metaText = (m: AdMeta) => (m.ltr ? <bdi dir="ltr" className="lat">{m.text}</bdi> : m.text);
/** معلومةٌ واحدةٌ برمزها في سطر المعلومات (`.ad-row-sub`) — كما في السطر ورأس المجموعة وسجلّ الأحداث. */
export function AdInfo({ m }: { m: AdMeta }) {
  return <span className="ad-row-info" data-tone={m.tone} data-clip={m.clip || undefined} title={m.text}>{m.icon}<span>{metaText(m)}</span></span>;
}
/**
 * `of`: إن كان الرقمُ جزءًا من كلّ (حجوزاتٌ من مقاعد، حضورٌ من حجوزات) رُسم تحته شريطُ نسبته، والنسبةُ في طرف سطره.
 * **والشريطُ كحليٌّ دائمًا** (محمد ٢٠٢٦-١٠-٣٠): الحالُ تقولها الكلمةُ مكانَ النسبة لا اللون —
 * `full`: كلمةُ الامتلاء حين يكون خبرًا («مكتمل»)، و`note`: كلمةٌ حين لا تصحّ النسبةُ بعد («لم يبدأ»، والشريطُ فارغ).
 */
export type AdMeterOf = {
  now: number; max: number; full?: string; note?: string;
  /**
   * **حدٌّ على الشريط: «القطعُ وكلمتُه»** (اعتمده محمد ٢٠٢٦-١١-٢٠، «النصف» في إدارة التقييم): الشريطُ مقطوعٌ عند الحدّ بفجوةٍ من أرض سطره
   * كثقب التذكرة، وتحت القطع كلمتُه الصغيرة. الموضعُ نسبةٌ من ثلاث (ربعٌ ونصفٌ وثلاثة أرباع) لأنّه صنفٌ في `ad.css` لا قيمةٌ في السطر.
   * (رُفض: خطٌّ رفيعٌ فوق الشريط — مستوردٌ من الغرفة القديمة؛ ودرجاتُ الحدّ — لا تتّسع للّجان الكبيرة؛ والكلمةُ وحدها — ضعيفة.)
   */
  mark?: { at: 25 | 40 | 50 | 75; label: ReactNode };
  /** كلمةُ الحال مكانَ النسبة والشريطُ ممتلئٌ بقدره («بقي 3» قبل الحدّ) — قاعدةُ الشريط: «الحالُ كلمةٌ مكانَ النسبة» */
  word?: string;
};
/**
 * `ltr`: قيمةٌ لاتينيّة (رقمٌ مرجعيّ، رمز) تُكتب بالخطّ اللاتينيّ من أوّلها إلى آخرها كالبريد في سطور المعلومات — كانت بخطّ المتن
 * العربيّ، فحروفُها بلاتينيّته المذيّلة وأرقامُها بأرقامه، خطّان في كلمةٍ واحدة (محمد ٢٠٢٦-١١-٠١).
 */
export type AdFigure = {
  value: string | number; label: string; icon: ReactNode; of?: AdMeterOf; ltr?: boolean;
  /** **الفرقُ عن الفترة السابقة** (إحصائيّات الزوّار، ٢٠٢٦-١١-١٤): تقرؤه خلاصةُ المدّة هناك شارةً بسهمها، خضراءَ للأحسن وحمراءَ للأسوأ —
   *  و«أحسن» ليس دائمًا «أكبر»، فالحكمُ (`good`) يأتي من صاحب الرقم لا من السهم. وسطرُ الأرقام (`AdFigureRow`) لا يرسمه */
  delta?: { pct: number; good: boolean | null };
};
const latin = (v: ReactNode, ltr?: boolean) => (ltr ? <bdi dir="ltr" className="lat">{v}</bdi> : v);
/** الشريطُ نفسُه في الكرت والجدول: النسبة، أو الكلمةُ مكانَها («مكتمل»، «لم يبدأ»، «أُلغيت»). */
function meterOf(of?: AdMeterOf) {
  if (!of || !(of.max > 0 || of.note)) return null;
  const full = !!of.full && of.max > 0 && of.now >= of.max;
  const pct = of.max > 0 ? Math.round((Math.min(of.now, of.max) / of.max) * 100) : 0;
  return { of, full, pct, word: of.note ?? of.word ?? (full ? of.full : undefined) };
}
/** `seed` (معرّفُ السجلّ): يُقصّ قماشُ الكعب من موضعٍ يخصّه — فالكعوبُ قطعٌ مختلفةٌ من قماشٍ واحد لا نسخٌ متطابقة. */
/** ستّةُ مواضع قصٍّ ثابتة (`ad.css`)، يختار المعرّفُ أحدَها — ثابتٌ للسجلّ نفسه بين الزيارات. */
const CUTS = 6;
export const cutOf = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % CUTS;
};

/** **كعبُ اليوم**: قطعةُ الجدول المصغّرةُ نفسُها (رقمُ اليوم وتحته «أكتوبر 2026») علامةً ليومٍ على خطّ سجلّ الأحداث (`AdLog`). */
export function AdDayTile({ iso }: { iso: string }) {
  const d = dayParts(iso);
  return <AdStubTile seed={iso.slice(0, 10)} stub={{ big: d.day, small: d.month }} />;
}

/**
 * **الكعبُ المصغّرُ قائمًا بذاته** (٢٠٢٦-١١-٠٤): قطعةُ الجدول نفسُها خارجَ السطر — صورةُ رأس مجموعةٍ صاحبُها سجلٌّ مؤرَّخ (الفرصةُ
 * فوق متطوّعيها في طابور الشهادات: يومُها، أو رمزُ المرنة). وبلا حقيقةٍ قماشُه وحده كالكعب.
 */
export function AdStubTile({ stub, seed }: { stub?: AdStub; seed: string }) {
  return (
    <span className="ad-td-stub" data-cut={cutOf(seed)} aria-hidden>
      {stub?.icon ? <span className="ad-stub-icon">{stub.icon}</span> : stub?.big ? <b className="ad-num">{stub.big}</b> : null}
      {stub?.small && <span>{stub.small}</span>}
    </span>
  );
}

/** معلومةُ الكعب: أهمُّ ما في السجلّ بخطٍّ كبير — تاريخُ الفعاليّة أو الخبر، مشاركاتُ الاستبيان. */
/**
 * `icon`: حقيقةٌ لا رقمَ لها تُرسم رمزًا مكانَ الرقم الكبير — الفرصةُ المرنة لانهايةٌ (∞) لا تاريخ (أمرُ المالك ٢٠٢٦-١٠-٠٣). كان
 * محرفُ «∞» يُكتب نصًّا فيأتي من خطٍّ غير خطَّي الهويّة («شكلُها غريب»، محمد ٢٠٢٦-١١-٠٢)؛ والرمزُ من مكتبة الأيقونات نفسِها.
 */
export type AdStub = { big: string; small: string; icon?: ReactNode };
/** الكعبُ المصغّر في سطر الجدول: حقيقةُ الكعب نفسُها، وغلافُه، وموضعُ قصّ قماشه (`seed`) — كما في التذكرة. */
export type AdTile = Partial<AdStub> & { cover?: string | null; seed?: string };

/**
 * **كرتُ السجلّ: «التذكرة»** (اختيارُ محمد ٢٠٢٦-١٠-٣٠ من ثلاثة توجّهات): كعبٌ من مادّة اللوح يحمل أهمَّ معلومةٍ في
 * السجلّ (`stub`)، وغلافُه (`cover`) يملأ الكعبَ بلون اللوح ويعود لونُه عند المرور؛ وسجلٌّ بلا غلافٍ كعبُه قماشُ اللوح
 * (`seed`). ثمّ الورقة: رقاقاتُ النوع، والعنوان، وسطورُ المعلومات (كلٌّ برمزه على مربّعٍ مصبوغٍ بلون سطره)، والأرقامُ صفٌّ بفواصل، والقاعُ للأفعال
 * بقاعدة `AdActs`. **وكرتٌ واحدٌ لكلّ غرف السجلّات**: الغرفةُ تملأ محتواه ولا تغيّر هيئتَه (الأشخاصُ كرتٌ آخر،
 * والرسائلُ والطلباتُ سطر).
 */
/* ═══ التحديدُ الجماعيّ ═══ */
/**
 * **التحديدُ الجماعيّ** (٢٠٢٦-١٠-٣١): مربّعُ اختيار الهويّة (`Checkbox` المتّفقُ عليه، رسمٌ وارتداد) في أوّل سطر الجدول،
 * **في الجدول وحده** — التحديدُ إدارةٌ بالجملة، والجدولُ عرضُ الإدارة (كثيفٌ يُرى فيه الكثير)، والتذكرةُ للتصفّح ومربّعٌ في زاويتها
 * يزاحم شاراتها؛ ومَن أراد التحديدَ بدّل العرض. والسطرُ المحدَّدُ مُنارٌ، وشريطُ الأدوات يتبدّل محتواه في مكانه.
 * والقالبُ يملكه: الغرفةُ تعطي معرّفَ سجلّها وأفعالَها الجماعيّة، والسطرُ والتذكرةُ يعرفان أنفسَهما من سياقهما (`AdPickItem`).
 */
type PickCtx = { selected: Set<string>; toggle: (id: string) => void };
const AdPickCtx = createContext<PickCtx | null>(null);
const AdPickId = createContext<string | null>(null);

export function AdPickScope({ value, children }: { value: PickCtx | null; children: ReactNode }) {
  return <AdPickCtx.Provider value={value}>{children}</AdPickCtx.Provider>;
}
export function AdPickItem({ id, children }: { id: string; children: ReactNode }) {
  return <AdPickId.Provider value={id}>{children}</AdPickId.Provider>;
}
function usePick() {
  const ctx = useContext(AdPickCtx);
  const id = useContext(AdPickId);
  if (!ctx || id === null) return null;
  return { on: ctx.selected.has(id), toggle: () => ctx.toggle(id) };
}

/** مربّعُ «الصفحة كلِّها» في رأس الجدول: نصفُ تحديدٍ (شَرطة) حين يُحدَّد بعضُها — حالٌ لا تُكتب إلّا على العنصر نفسِه */
function PickAll({ all, some, onAll, label }: { all: boolean; some: boolean; onAll: (on: boolean) => void; label?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const input = box.current?.querySelector("input");
    if (input) input.indeterminate = some && !all;
  }, [all, some]);
  return (
    <span ref={box} className="ad-pick-all">
      <Checkbox className="ad-pick" checked={all} onChange={() => onAll(!all)} aria-label={label ?? (all ? "إلغاء تحديد الصفحة" : "تحديد الصفحة كلِّها")} />
    </span>
  );
}

/**
 * **شريطُ المحدَّد هو شريطُ الأدوات نفسُه** يتبدّل محتواه في مكانه (محمد ٢٠٢٦-١٠-٣١: «لا يستبدل بل يكبر… مو حلو بصريًّا»؛
 * كان قطعةَ لوحٍ كحليّةً تحلّ محلَّه فتثقل وتلتفّ سطرين): الصفحةُ البيضاء نفسُها بارتفاعها وزاويتها، وفيها مكانَ البحث العددُ
 * («حُدِّد 3 أخبار»)، ومكانَ المرشّحات الأفعالُ الجماعيّة صناديقَ بختمها، ثمّ «إلغاء التحديد».
 * **والخطِرُ بينها آخرَها، صندوقٌ كإخوته وختمُه قطعةٌ من رأس نافذة الحذف** (`danger` في `ad.css`).
 */
export function AdSelBar({ count, noun, ops, onClear }: { count: number; noun: ArForms; ops: AdOp[]; onClear: () => void }) {
  return (
    <div className="ad-tools ad-tools-sel" role="toolbar" aria-label="أفعال المحدَّد">
      <p className="ad-sel-n" aria-live="polite">{`حُدِّد ${arCount(count, noun)}`}</p>
      {/* «إلغاء التحديد» قبل الأفعال في الترتيب: في الجوّال يجاور العددَ في سطر البحث، والأفعالُ سطرُ المرشّحات — فلا يكبر الشريط */}
      <span className="ad-sel-x"><AdButton variant="soft" icon={<X className="ad-line" />} onClick={onClear}>إلغاء التحديد</AdButton></span>
      <div className="ad-tools-set ad-sel-acts">
        {ops.map((o) => (
          <AdButton key={o.key} variant={o.danger ? "danger" : "soft"} icon={o.icon} onClick={() => o.onClick?.()} disabled={o.disabled} busy={o.busy} held={!o.busy && ops.some((x) => x.busy)}>{o.label}</AdButton>
        ))}
      </div>
    </div>
  );
}

/** عنوانُ السجلّ: رابطٌ إلى صفحته، أو زرٌّ يفتحه في مكانه (`onOpen`) — وكلاهما يمتدّ على الكرت أو السطر فيُنقر كلُّه */
/**
 * العنوانُ معزولٌ باتّجاهه (`<bdi>`): سجلٌّ بلا اسمٍ عنوانُه بريدُه (أصدقاءُ لم يُكملوا ملفّهم) فلا ينقلب في السطر العربيّ؛
 * والعنوانُ العربيُّ لا يتغيّر.
 */
function titleOf(title: string, href?: string, onOpen?: () => void) {
  const t = <bdi>{title}</bdi>;
  if (href) return <Link href={href}>{t}</Link>;
  if (onOpen) return <button type="button" className="ad-open" onClick={onOpen}>{t}</button>;
  return t;
}

/**
 * **وجهُ صاحب السجلّ** (كرتُ الشخص، ٢٠٢٦-١١-٠٢): صورتُه، وإلّا رسمُ جنسه (`Avatar`) — للغرف التي سجلُّها إنسان (الأعضاء،
 * والمتطوّعون، والأصدقاء، وأعضاءُ الوحدة).
 */
export type AdFace = {
  src?: string | null; gender?: string | null; name: string;
  /** مقعدٌ فارغ: مكانُ الوجه متقطّعٌ بلا رسم (صفُّ القيادة) */
  vacant?: boolean;
  /** شارةٌ على حدّ الوجه السفليّ في وسطه، كبطاقة اسمٍ مثبّتةٍ عليه («أنت» في صفّ القيادة، فكرةُ محمد ٢٠٢٦-١١-٠٣) */
  mark?: ReactNode;
  /** الوجهُ نفسُه عنصرًا يُمرَّر مكانَ الصورة: محرّرُ صورة صاحب الحساب في «حسابي» (`AvatarEditor` بكاميرته) */
  node?: ReactNode;
};

export function AdCard({
  cover, seed, stub, chips, title, href, onOpen, meta, figures, foot, face, paper, band, extra,
}: {
  /** ما يُقرأ في ورقة الكرت بعد سطوره (٢٠٢٦-١١-١٩): بيانُ المرشّح في ورقة التصويت — نصٌّ لا سطرُ معلومة */
  extra?: ReactNode;
  /**
   * ما يُكتب على الكعب نفسِه: **رأسُ الغرفة حين يقودها الكرت في الجوّال** (`AdRoomBand`؛ اعتمده محمد ٢٠٢٦-١١-٠٥). يظهر في الضيّق
   * وحده حين يكون الكرتُ أوّلَ العمود الصاعد (`AdCols top`)، ويغيب لوحُ الغرفة؛ وفي المكتب اللوحُ في مكانه والكعبُ بلا كتابة.
   */
  band?: ReactNode;
  /** فتحُ السجلّ بلا صفحة (نافذة: قراءةُ رسالة) — العنوانُ زرٌّ يمتدّ على الكرت كما يمتدّ الرابط */
  onOpen?: () => void;
  cover?: string | null;
  seed?: string;
  stub?: AdStub;
  chips?: ReactNode;
  title: string;
  href?: string;
  meta?: AdMeta[];
  figures?: AdFigure[];
  /** القاعُ وأفعالُه — وبلا قاعٍ («كرتُك» في حسابي: لا فعلَ عليه سوى صورته) لا يُرسم شريطُه */
  foot?: ReactNode;
  /**
   * **كرتُ الشخص: التذكرةُ واقفة** — الكعبُ شريطٌ أعلاها (كما تصير التذكرةُ في الضيّق)، ووجهُ صاحبها على حدّه، واسمُه
   * وسطورُه تحته في وسطها. فالإنسانُ يُعرف بوجهه قبل اسمه، والقطعةُ قطعةُ الهويّة نفسُها.
   */
  face?: AdFace;
  /**
   * **تذكرةُ الورقة** (شهاداتي، ٢٠٢٦-١١-٠٤: «أراها الأضعف»): الشهادةُ عند صاحبها هي ورقتُها، فالكعبُ رأسُ التذكرة بنسبة الورقة نفسِها
   * (`cover` صورتُها كاملةً بلونها الطبيعيّ لا شريطٌ مقصوصٌ مصبوغ — «الشهادةُ شيءٌ رسميّ»)، والثلمتان على خطّ القطع تحته — كتذكرة الضيّق، في كلّ عرض.
   */
  /** `"portrait"`: الورقةُ قائمةٌ بنسبة بطاقة عِرفان (1080×1350) لا بنسبة الشهادة */
  paper?: boolean | "portrait";
}) {
  // في الغرفة المرتَّبة يدويًّا (`reorder.tsx`) الكعبُ مقبضُ السحب، ورقمُه موضعُ السجلّ الحيّ
  const sort = useSortItem();
  const node = useSortNode(sort);
  return (
    <div className="ad-card-wrap" ref={node} data-sort-id={sort?.id} data-dragging={sort?.isDragging || undefined} data-face={face ? "" : undefined} data-paper={paper === "portrait" ? "portrait" : paper ? "" : undefined}>
      <span className="ad-card-shade" aria-hidden><span /></span>
      <article className="ad-card">
        <div className="ad-card-stub" data-cut={seed ? cutOf(seed) : undefined}>
          {band ? <div className="ad-card-band">{band}</div> : null}
          {stub && (
            <div className="ad-card-stub-fact">
              {stub.icon && !sort ? <span className="ad-stub-icon" aria-hidden>{stub.icon}</span> : <b className="ad-num">{sort ? fmtNum(sort.n) : stub.big}</b>}
              <span>{stub.small}</span>
            </div>
          )}
          {cover && (
            <span className="ad-card-stub-media" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ad-card-stub-img" src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ad-card-stub-color" src={cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </span>
          )}
        </div>
        {face && (
          <span className="ad-card-face">
            {face.node ? face.node : face.vacant
              // الفارغُ وجهٌ كالوجوه بأرضه وإطاره، وفيه الشخصُ المقطَّع (محمد ٢٠٢٦-١١-٠٤: «يظهر فارغًا، هل هناك خطأ؟»؛ ثمّ «أيقونةُ
              // الشخص الباهتة في إطارٍ متقطّع قبيحة: توقّعتُ خلفيّةً والشخصَ المقطَّع») — كان إطارًا متقطّعًا بلا رسم فيُظنّ صورةً لم تُحمَّل
              ? <span className="av av-xl ad-card-face-empty" aria-hidden><span className="av-icon"><UserCircleDashed /></span></span>
              : <Avatar name={face.name} src={face.src ?? undefined} gender={face.gender} size="xl" />}
            {face.mark && <span className="ad-card-face-mark">{face.mark}</span>}
          </span>
        )}
        <div className="ad-card-main">
          <div className="ad-card-body">
            {/* المحرّكُ (`reorder.tsx`) في رأس الورقة مقابلَ الشارات، في سطرها لا فوق العنوان */}
            {sort ? (
              <div className="ad-card-top">
                {chips && <span className="ad-chips">{chips}</span>}
                <SortGrip sort={sort} />
              </div>
            ) : chips && <span className="ad-chips">{chips}</span>}
            <h3 className="ad-card-title">{titleOf(title, href, onOpen)}</h3>
            {meta && meta.length > 0 && <AdMetaList meta={meta} />}
            {figures && figures.length > 0 && <AdFigureRow figures={figures} />}
            {extra}
          </div>
          {foot ? <div className="ad-card-foot">{foot}</div> : null}
        </div>
      </article>
    </div>
  );
}

/**
 * **صفُّ أرقام التذكرة** (`AdCard.figures`): كلُّ رقمٍ برمزه واسمه، والنسبةُ في طرف سطره، والشريطُ تحته — قطعةٌ واحدةٌ للكرت
 * ولرأس صفحة السجلّ (`_ad/record.tsx`) الذي هو التذكرةُ نفسُها مفتوحة.
 */
/** سطورُ معلومات التذكرة، كلٌّ برمزه على مربّعٍ مصبوغٍ بلون سطره — للكرت ولرأس صفحة السجلّ معًا */
export function AdMetaList({ meta }: { meta: AdMeta[] }) {
  return (
    <ul className="ad-meta">
      {meta.map((m) => (
        <li key={m.text} className="ad-meta-line" data-tone={m.tone}>{m.icon}<span title={m.text}>{metaText(m)}</span></li>
      ))}
    </ul>
  );
}

export function AdFigureRow({ figures }: { figures: AdFigure[] }) {
  return (
    <dl className="ad-figures">
      {figures.map((f) => {
        const m = meterOf(f.of);
        const of = m?.of;
        const full = !!m?.full;
        const pct = m?.pct ?? 0;
        const word = m?.word;
        return (
          <div key={f.label} className="ad-figure">
            <dt>{f.icon}{f.label}</dt>
            {/* النسبةُ في طرف سطر الرقم مقابلَه («25 / 40 … 63%»)، والشريطُ تحتهما بعرض العمود كلِّه (اقتراحُ محمد
                ٢٠٢٦-١٠-٣٠)؛ وإذا كان الاكتمالُ تنبيهًا قالت الكلمةُ مكانَ النسبة («مكتمل») */}
            <dd className="ad-num ad-figure-v">
              {latin(f.value, f.ltr)}
              {of && <span className="ad-meter-pct" data-word={of.note ? "note" : full ? "full" : undefined}>{word ?? fmtPct(pct)}</span>}
            </dd>
            {of && (
              <dd className="ad-meter-row">
                {/* الحدُّ على شريط الرقم كحدّه على شريط السطر (`AdRow`): القطعُ وكلمتُه — تفصيلُ المقيَّم ٢٠٢٦-١١-٢٠ */}
                {of.mark ? (
                  <span className="ad-meter-wrap" data-mark>
                    <meter className="ad-meter" min={0} max={Math.max(of.max, 1)} value={of.note ? 0 : Math.min(of.now, of.max)} aria-label={`${f.label}: ${word ?? fmtPct(pct)}`} />
                    <span className="ad-meter-mark" data-at={of.mark.at} aria-hidden><span>{of.mark.label}</span></span>
                  </span>
                ) : <meter className="ad-meter" min={0} max={Math.max(of.max, 1)} value={of.note ? 0 : Math.min(of.now, of.max)} aria-label={`${f.label}: ${word ?? fmtPct(pct)}`} />}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

/** فعلٌ في كرتٍ أو سطر: باسمه ورمزه، رابطًا أو نقرة. */
export type AdOp = { key: string; label: string; icon: ReactNode; href?: string; onClick?: () => void; danger?: boolean; disabled?: boolean; busy?: boolean };

/**
 * **أفعالُ السجلّ: الأساسيُّ ظاهرٌ دائمًا، والبقيّةُ في «المزيد» — إلّا إذا كان فعلًا واحدًا فيظهر باسمه** (محمد ٢٠٢٦-١١-٠٢).
 * والقاعدةُ واحدةٌ في الكرت والجدول، لا تحسب المكان: السجلُّ نفسُه بأفعاله نفسِها في العرضين.
 * (كان الكرتُ يُظهر أوّلَ فعلٍ ثانٍ والجدولُ لا، ثمّ يُظهر الوحيدَ الباقي — فكان للرسالة الجديدة زرّان في الكرت و«المزيد» في
 * الجدول، واحتاج شرحُ ذلك أربعَ رسائل: «ما فهمت». والقاعدةُ التي تحتاج شرحًا لا يتوقّعها المستخدم.)
 * والحذفُ وكلُّ فعلٍ خطِر آخرَ «المزيد» بالأحمر بعد فاصل؛ وإن كان وحدَه ظهر صندوقًا بختمه الأحمر (`danger`).
 * والغرفةُ ترتّب أفعالَها بالأكثر استعمالًا.
 */
/**
 * `inRow`: **في الجدول ينزل الأساسيُّ درجة** — الصندوقُ بختمه لا القطعةُ المصمتة: العنوانُ نفسُه رابطُ الأساسيّ، وقطعةُ لوحٍ في
 * كلّ سطرٍ تصنع عمودًا كحليًّا يطغى على ما يُقارَن في الجدول (قاعدةُ الختم نفسُها مصغّرةً بدرجة).
 */
export function AdActs({ primary, ops, inRow }: { primary: AdAction; ops: AdOp[]; inRow?: boolean }) {
  const router = useRouter();
  const safe = ops.filter((o) => !o.danger);
  const danger = ops.filter((o) => o.danger);
  // فعلٌ يعمل: يدور زرُّه، ويُمسَك ما سواه في السجلّ نفسِه حتى يعود (لا حكمان على سجلٍّ واحدٍ معًا)
  const anyBusy = !!primary.busy || ops.some((o) => o.busy);
  const item = (o: AdOp) => ({
    label: o.label, icon: o.icon, danger: o.danger, disabled: o.disabled || anyBusy,
    onSelect: () => (o.href ? router.push(o.href) : o.onClick?.()),
  });
  const groups: MenuGroup[] = [
    ...(safe.length ? [{ items: safe.map(item) }] : []),
    ...(danger.length ? [{ danger: true, items: danger.map(item) }] : []),
  ];
  // **قائمةٌ ببندٍ واحدٍ لا تُفتح** (محمد ٢٠٢٦-١١-٠١: «المزيد يعرض الحذفَ وحده، فلماذا لا يُستبدل به؟»)
  const lone = ops.length === 1 ? ops[0] : null;
  return (
    <>
      {primary.href ? (
        <AdButton variant={inRow ? "soft" : "fill"} size="sm" icon={primary.icon} href={primary.href}>{primary.label}</AdButton>
      ) : (
        <AdButton variant={inRow ? "soft" : "fill"} size="sm" icon={primary.icon} onClick={primary.onClick!} busy={primary.busy} held={anyBusy && !primary.busy} disabled={primary.disabled}>{primary.label}</AdButton>
      )}
      {lone && (lone.href ? (
        <AdButton variant={lone.danger ? "danger" : "soft"} size="sm" icon={lone.icon} href={lone.href}>{lone.label}</AdButton>
      ) : (
        <AdButton variant={lone.danger ? "danger" : "soft"} size="sm" icon={lone.icon} onClick={lone.onClick!} disabled={lone.disabled} busy={lone.busy} held={anyBusy && !lone.busy}>{lone.label}</AdButton>
      ))}
      {!lone && groups.length > 0 && (
        <DropdownMenu
          ariaLabel="أفعالٌ أخرى"
          triggerClassName="ad-btn ad-btn-soft ad-btn-sm ad-more"
          trigger={<><CaretDown aria-hidden />المزيد</>}
          groups={groups}
        />
      )}
    </>
  );
}

/* ═══ الجدول ═══ */
/**
 * **العرضُ الجدوليّ جدولٌ حقًّا** (٢٠٢٦-١٠-٣١): رأسٌ واحدٌ يسمّي الأعمدةَ برموزها مرّةً (كانت التسميةُ تتكرّر في كلّ سطر)، وأعمدةٌ
 * مصطفّةٌ عبر السطور كلِّها (`subgrid`) فتُقارَن الأرقامُ بالنظر، وحقيقةُ الكعب عمودٌ أوّل (التاريخ، الموعد) فلا يضيع ما في التذكرة،
 * والشريطُ نفسُه تحت رقمه. وفي الضيّق يصير كلُّ سطرٍ بطاقةً صغيرة: الرأسُ يختفي، وكلُّ خليّةٍ تحمل اسمَ عمودها.
 */
/**
 * `text`: عمودٌ نصّيّ (رقمٌ مرجعيّ، فترة، بريد، رابط) لا رقم — أعرضُ من عمود الرقم ولا يلتفّ. و`wide`: رقمٌ بشريطه («3 / 10» والنسبةُ
 * والشريطُ تحتها) أعرضُ من الرقم وحده. فالجدولُ الذي فيه أعمدةٌ عريضة (نصّيّةٌ أو بشريط) يتحوّل إلى سطور الضيّق قبل غيره
 * (`data-load` في `ad.css`)، لئلّا يُعصر عمودُ السجلّ حتى يختفي اسمُه (الشهادات ثمّ الفرص التطوّعيّة، ٢٠٢٦-١١-٠٢).
 */
export type AdColumn = { key: string; label: string; icon?: ReactNode; sortable?: boolean; text?: boolean; wide?: boolean };
/** ترتيبُ الجدول: العمودُ واتّجاهُه. مفتاحُ عمود السجلّ نفسِه (العنوان) `AD_HEAD`. */
export type AdSort = { key: string; desc: boolean };
export const AD_HEAD = "_head";
/** أعمدةُ الجدول لسطوره: رمزُ كلّ عمودٍ يظهر في خليّته حين يختفي الرأسُ في الضيّق */
const AdTableCols = createContext<AdColumn[]>([]);
export type AdCell = { label: string; value: ReactNode; sub?: string; of?: AdMeterOf; text?: boolean; tone?: AdMetaTone; ltr?: boolean };

export function AdList({
  children, label, head, columns, foot, select, sort, onSort, headSortable, stub, grip,
}: {
  children: ReactNode; label: string; head: string; columns: AdColumn[]; foot?: ReactNode;
  /** عمودُ مقبض السحب أوّلَ السطر (`reorder.tsx`) — في الغرفة المرتَّبة يدويًّا */
  grip?: boolean;
  /** عمودُ الكعب المصغّر قبل السجلّ (`AdRow.stub`): اسمُه في الرأس، ويُرتَّب منه كغيره. */
  stub?: AdColumn;
  /** تحديدُ سطور الصفحة كلِّها من رأس الجدول */
  select?: { all: boolean; some: boolean; onAll: (on: boolean) => void };
  /**
   * **الترتيبُ من رأس العمود** (كان في جداول البوّابة القديمة، `DataTable`): الضغطُ يرتّب، والثاني يعكس، والثالثُ يعيد الترتيبَ
   * الأصليّ. والسهمُ يقول الحال: مزدوجٌ خافتٌ لما يُرتَّب ولم يُرتَّب، ومفردٌ لاتّجاه المرتَّب.
   */
  sort?: AdSort | null; onSort?: (key: string) => void; headSortable?: boolean;
}) {
  // `kind`: رأسُ الأرقام والكعب في وسط عموده فوق قيمته، ورأسُ السجلّ في أوّله (`ad.css`)
  const th = (key: string, content: ReactNode, name: string, sortable?: boolean, kind?: "col" | "stub") => {
    if (!sortable || !onSort) return <span key={key} className="ad-th" role="columnheader" data-kind={kind}>{content}</span>;
    const on = sort?.key === key;
    return (
      <span key={key} className="ad-th" role="columnheader" data-kind={kind} aria-sort={on ? (sort!.desc ? "descending" : "ascending") : undefined}>
        <button type="button" className="ad-th-sort" data-on={on || undefined} aria-label={`فرز حسب ${name}`} onClick={() => onSort(key)}>
          {content}
          {on ? (sort!.desc ? <CaretDown className="ad-th-caret" aria-hidden /> : <CaretUp className="ad-th-caret" aria-hidden />) : <CaretUpDown className="ad-th-caret" aria-hidden />}
        </button>
      </span>
    );
  };
  return (
    <div className="ad-tbl" data-load={columns.filter((c) => c.text || c.wide).length || undefined}>
    <div className="ad-table" role="table" aria-label={label} data-cols={columns.length} data-sel={select ? "" : undefined} data-stub={stub ? "" : undefined} data-grip={grip ? "" : undefined}>
      <div className="ad-tr ad-thead" role="row">
        {select && (
          <span className="ad-th ad-td-pick" role="columnheader">
            <PickAll all={select.all} some={select.some} onAll={select.onAll} />
          </span>
        )}
        {grip && <span className="ad-th ad-td-grip" role="columnheader"><span className="ad-sr">مقبض الترتيب</span></span>}
        {stub && th(stub.key, <>{stub.icon}{stub.label}</>, stub.label, stub.sortable, "stub")}
        {th(AD_HEAD, head, head, headSortable)}
        {columns.map((c) => th(c.key, <>{c.icon}{c.label}</>, c.label, c.sortable, "col"))}
        <span className="ad-th" role="columnheader"><span className="ad-sr">الأفعال</span></span>
      </div>
      <AdTableCols.Provider value={columns}>{children}</AdTableCols.Provider>
      {foot}
    </div>
    </div>
  );
}

export function AdRow({
  title, href, onOpen, badge, sub, cells, acts, stub, face,
}: {
  /** فتحُ السجلّ بلا صفحة — كما في `AdCard` */
  onOpen?: () => void;
  /** الكعبُ المصغّر أوّلَ السطر — مع `stub` في `AdList` */
  stub?: AdTile;
  title: string;
  href?: string;
  badge?: ReactNode;
  sub?: AdMeta[];
  cells: AdCell[];
  acts: ReactNode;
  /** وجهُ صاحب السطر في موضع الكعب (كرتُ الشخص في الجدول) — ويُعطى الجدولُ `table.stub` ليحجز عمودَه */
  face?: AdFace;
}) {
  const cols = useContext(AdTableCols);
  const pick = usePick();
  const sort = useSortItem();
  const node = useSortNode(sort);
  return (
    <div className="ad-tr" role="row" ref={node} data-sort-id={sort?.id} data-picked={pick?.on || undefined} data-dragging={sort?.isDragging || undefined}>
      {pick && (
        <div className="ad-td-pick" role="cell">
          <Checkbox className="ad-pick" checked={pick.on} onChange={pick.toggle} aria-label={`تحديد «${title}»`} />
        </div>
      )}
      <SortGrip sort={sort} cell />
      {face && (
        <div className="ad-td-face" role="cell">
          <Avatar name={face.name} src={face.src ?? undefined} gender={face.gender} size="lg" />
        </div>
      )}
      {stub && !face && (
        <div className="ad-td-stub" role="cell" data-cut={stub.seed ? cutOf(stub.seed) : undefined}>
          {stub.cover && (
            <span className="ad-td-stub-media" aria-hidden>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ad-card-stub-img" src={stub.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ad-card-stub-color" src={stub.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
            </span>
          )}
          {stub.icon && !sort ? <span className="ad-stub-icon" aria-hidden>{stub.icon}</span> : (sort || stub.big) && <b className="ad-num">{sort ? fmtNum(sort.n) : stub.big}</b>}
          {stub.small && <span>{stub.small}</span>}
        </div>
      )}
      {/* **طبقاتُ الكرت نفسُها** (محمد ٢٠٢٦-١١-٠١: «البادج منحشرٌ مع البيانات… لا تنظيمَ بصريًّا عكسَ الكارد»): كانت الشاراتُ
          وسطورُ المعلومات تجري في سطرٍ واحدٍ يلتفّ — حالٌ وحقائقُ مختلطة. فصارت كما في الكرت: الشاراتُ سطرُها، ثمّ العنوان،
          ثمّ المعلوماتُ برموزها سطرُها — ثلاثُ طبقاتٍ بارتفاع الكعب المصغّر */}
      <div className="ad-row-main" role="cell">
        {badge && <span className="ad-chips ad-row-chips">{badge}</span>}
        <span className="ad-row-title">{titleOf(title, href, onOpen)}</span>
        {sub && sub.length > 0 && (
          <span className="ad-row-sub">
            {sub.map((s) => <span key={s.text} className="ad-row-info" data-tone={s.tone} data-clip={s.clip || undefined} title={s.text}>{s.icon}<span>{metaText(s)}</span></span>)}
          </span>
        )}
      </div>
      {/* غلافٌ بلا صندوق في العريض (`display: contents`: الخلايا أعمدةُ الشبكة نفسِها)، وصفٌّ واحدٌ في الضيّق */}
      <div className="ad-td-wrap">
      {cells.map((c, i) => {
        const m = meterOf(c.of);
        return (
          <div key={c.label} className="ad-td" role="cell" data-text={c.text || undefined} data-tone={c.tone}>
            {/* في الضيّق يختفي الرأس: رمزُ العمود في مربّعه يقول ما الرقم (كسطور المعلومات)، واسمُه لقارئ الشاشة */}
            <span className="ad-td-i" aria-hidden>{cols[i]?.icon}</span>
            <span className="ad-td-l">{c.label}</span>
            <span className={c.text ? "ad-td-v" : "ad-td-v ad-num"}>
              {latin(c.value, c.ltr)}
              {m && <span className="ad-meter-pct" data-word={m.of.note ? "note" : m.full ? "full" : undefined}>{m.word ?? fmtPct(m.pct)}</span>}
            </span>
            {c.sub && <span className="ad-td-sub">{c.sub}</span>}
            {m && (m.of.mark ? (
              <span className="ad-meter-wrap" data-mark>
                <meter className="ad-meter" min={0} max={Math.max(m.of.max, 1)} value={m.of.note ? 0 : Math.min(m.of.now, m.of.max)} aria-label={`${c.label}: ${m.word ?? fmtPct(m.pct)}`} />
                <span className="ad-meter-mark" data-at={m.of.mark.at} aria-hidden><span>{m.of.mark.label}</span></span>
              </span>
            ) : <meter className="ad-meter" min={0} max={Math.max(m.of.max, 1)} value={m.of.note ? 0 : Math.min(m.of.now, m.of.max)} aria-label={`${c.label}: ${m.word ?? fmtPct(m.pct)}`} />)}
          </div>
        );
      })}
      </div>
      <div className="ad-row-acts" role="cell">{acts}</div>
    </div>
  );
}

/**
 * **مراحلُ بتواريخها: «كعوبُ الأيّام»** (اعتمده محمد ٢٠٢٦-١١-٢٠ في إدارة التقييم، من ثلاثةٍ مبنيّة على الحاسوب والجوّال: الكعوب، ودرجاتُ
 * الحدّ، والسطرُ المستورد من الحاليّ): لكلّ مرحلةٍ كعبُ يومها (قطعةُ الجدول المصغّرة: اليومُ وتحته الشهر)، وبجانبه اسمُها عريضًا، وتحته
 * سطرُ حالها سطرَ معلوماتٍ بأيقونته (`AdInfo`): «مضت» خافتة، و«الآن» بالأخضر، و«لم تبدأ». والكعبُ كاملٌ لا يُبهت، والماضي يخفت اسمُه
 * بلون الحبر. وفي الغرفة الضيّقة يقف الكعبُ فوق اسمه. (رُفض: أيقونةٌ قبل الاسم العريض — لا مثيلَ لها في الهويّة؛ وشفافيّةُ الكعب الماضي.)
 */
export type AdStage = { key: string; icon: ReactNode; label: string; date: string; state: "past" | "now" | "next" };
const STAGE_WORD: Record<AdStage["state"], string> = { past: "مضت", now: "الآن", next: "لم تبدأ" };
export function AdStages({ stages, label }: { stages: AdStage[]; label: string }) {
  return (
    <ol className="ad-stages" aria-label={label}>
      {stages.map((s) => {
        const d = dayParts(s.date);
        return (
          <li key={s.key} className="ad-stage" data-state={s.state} aria-current={s.state === "now" ? "step" : undefined}>
            <AdStubTile seed={s.date.slice(0, 10)} stub={{ big: d.day, small: d.month.split(" ")[0] }} />
            <span className="ad-stage-t">
              <b>{s.label}</b>
              <AdInfo m={{ icon: s.icon, text: STAGE_WORD[s.state], tone: s.state === "past" ? "muted" : s.state === "now" ? "ok" : undefined }} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** درجاتُ حدٍّ في رأس مجموعة: `max` قطعًا تمتلئ منها `now` بنغمتها، وتحتها `label` كلمةً (`AdGroupHead.steps`). */
export type AdSteps = { now: number; max: number; tone?: "warn" | "bad"; label: string };

/** الدرجاتُ قطعةً واحدة — في رأس المجموعة (غرفةُ الإنذارات)، وفي رأس القسم (`AdSection.steps`: «إنذاراتي» في «عضويتي»، ٢٠٢٦-١١-١٤) */
export function AdStepsBar({ steps }: { steps: AdSteps }) {
  return (
    <div className="ad-steps" data-tone={steps.now > 0 ? steps.tone : undefined}>
      <span className="ad-steps-bar" role="img" aria-label={`${steps.now} من ${steps.max}`}>
        {Array.from({ length: Math.max(steps.max, 1) }, (_, i) => <i key={i} data-on={i < steps.now || undefined} />)}
      </span>
      <span className="ad-steps-l">{steps.label}</span>
    </div>
  );
}

/**
 * **رأسُ مجموعة** (`CollectionRoom.group`، محمد ٢٠٢٦-١١-٠٢: «شريطٌ باسم الشخص وتحته إنذاراته»؛ ثمّ «نظيفٌ مقبول لكن ليس جميلًا»):
 * صاحبُ المجموعة بوجهه (`lead`: صورتُه) واسمِه بخطّ العنوان وسطورِه تحته، وفي طرفه **درجاتُ حدّه** (`steps`): قطعٌ بعدد الحدّ
 * تمتلئ بنغمتها وتحتها كلمتُها («بقي إنذارٌ واحد») — صورةٌ تُقرأ بلمحةٍ مع جملتها، لا رقمٌ يكرّرها. أو رقمٌ بشريطه (`figure`)
 * لمجموعةٍ لا حدَّ لها. في الكروت قطعةٌ فوق شبكتها، وفي الجدول شريطٌ بعرضه كلِّه.
 */
/**
 * **تحديدُ المجموعة كلِّها من رأسها** (محمد ٢٠٢٦-١١-٠٤، شهاداتُ المتطوّعين: «الفرصةُ وحدةُ العمل»): حين يكون في الموضع تحديدٌ جماعيّ
 * يضع القالبُ (`CollectionRoom`) مربّعَ التحديد نفسَه أوّلَ رأس كلّ مجموعة — يحدّد سجلّاتها وحدها بضغطة، ويُعلن نصفَ التحديد كمربّع الصفحة.
 */
export const AdGroupPick = createContext<{ all: boolean; some: boolean; onAll: (on: boolean) => void } | null>(null);

export function AdGroupHead({ title, sub, lead, steps, figure, act }: {
  title: string; sub?: AdMeta[]; lead?: ReactNode; steps?: AdSteps; figure?: AdFigure;
  /** فعلُ المجموعة في طرفها («افتح الفرصة» فوق متطوّعيها) — زرٌّ ظاهرٌ باسمه كأفعال السجلّ */
  act?: ReactNode;
}) {
  const m = meterOf(figure?.of);
  const pick = useContext(AdGroupPick);
  return (
    <div className="ad-group-head">
      <div className="ad-group-who">
        {pick && <PickAll {...pick} label={pick.all ? `إلغاء تحديد «${title}»` : `تحديد «${title}» كلِّها`} />}
        {lead}
        <div className="ad-group-main">
          <span className="ad-group-title">{title}</span>
          {sub && sub.length > 0 && (
            <span className="ad-row-sub">
              {sub.map((x) => <span key={x.text} className="ad-row-info" data-tone={x.tone} title={x.text}>{x.icon}<span>{metaText(x)}</span></span>)}
            </span>
          )}
        </div>
      </div>
      {steps && <AdStepsBar steps={steps} />}
      {figure && (
        <div className="ad-group-fig">
          <span className="ad-group-fig-l">{figure.icon}{figure.label}</span>
          <span className="ad-num ad-figure-v">
            {figure.value}
            {m && <span className="ad-meter-pct" data-word={m.of.note ? "note" : m.full ? "full" : undefined}>{m.word ?? fmtPct(m.pct)}</span>}
          </span>
          {m && <meter className="ad-meter" min={0} max={Math.max(m.of.max, 1)} value={m.of.note ? 0 : Math.min(m.of.now, m.of.max)} aria-label={`${figure.label}: ${m.word ?? fmtPct(m.pct)}`} />}
        </div>
      )}
      {act && <div className="ad-group-act">{act}</div>}
    </div>
  );
}

/* ═══ ترقيمُ الصفحات ═══ */
/**
 * **ترقيمُ الصفحات** (محمد ٢٠٢٦-١٠-٣١: «عرض المزيد ضعيفٌ بصريًّا جدًّا… هل هذا ما تعتمده المواقعُ المحترمة؟» — لا: ذاك نمطُ
 * المتاجر «شاهدتَ 72 من 3456»؛ وأنظمةُ الإدارة تُرقّم). ذيلٌ ملتصقٌ بالقائمة: «1–50 من 120 خبرًا»، ثمّ السابقُ والأرقامُ والتالي،
 * والصفحةُ الحاليّةُ قطعةٌ من اللوح (المختارُ على الورقة). في الجدول قاعُه المصبوغُ كرأسه، وفي الكروت شريطٌ كشريط الأدوات.
 * فتعرف أين أنت، وتعود إلى صفحتك (تُحفظ في الرابط)، ولا تنتفخ الصفحةُ بمئات السجلّات.
 */
function pageSlots(p: number, n: number): number[] {
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
  const keep = new Set([1, n, p - 1, p, p + 1, ...(p <= 3 ? [2, 3, 4] : []), ...(p >= n - 2 ? [n - 3, n - 2, n - 1] : [])]);
  const sorted = [...keep].filter((x) => x >= 1 && x <= n).sort((a, b) => a - b);
  // الصفرُ فجوةٌ («…») بين رقمين غيرِ متتاليين
  return sorted.flatMap((x, i) => (i && x - sorted[i - 1] > 1 ? [0, x] : [x]));
}

export function AdPager({
  page, size, total, noun, onPage, inTable,
}: { page: number; size: number; total: number; noun: ArForms; onPage: (p: number) => void; inTable?: boolean }) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);
  const body = (
    <>
      <p className="ad-pager-t" aria-live="polite">{`${from === to ? fmtNum(to) : `${fmtNum(from)}–${fmtNum(to)}`} من ${arCount(total, noun)}`}</p>
      <nav className="ad-pager-nav" aria-label="الصفحات">
        <AdButton variant="soft" size="sm" icon={<CaretRight />} onClick={() => onPage(page - 1)} held={page === 1}>السابق</AdButton>
        <span className="ad-pager-nums">
          {pageSlots(page, pages).map((n, i) =>
            n === 0 ? (
              <span key={`gap${i}`} className="ad-pager-gap" aria-hidden>…</span>
            ) : (
              <button key={n} type="button" className="ad-page" aria-current={n === page ? "page" : undefined} data-near={Math.abs(n - page) <= 1 || undefined} aria-label={`الصفحة ${n}`} onClick={() => onPage(n)}>
                {fmtNum(n)}
              </button>
            ),
          )}
        </span>
        <AdButton variant="soft" size="sm" icon={<CaretLeft />} iconEnd onClick={() => onPage(page + 1)} held={page === pages}>التالي</AdButton>
      </nav>
    </>
  );
  return inTable ? (
    <div className="ad-tr ad-tfoot" role="row"><div className="ad-pager" role="cell">{body}</div></div>
  ) : (
    <div className="ad-pager ad-pager-bar">{body}</div>
  );
}

/* ═══ نافذةُ التأكيد ═══ */
/**
 * **نافذةُ التأكيد** (٢٠٢٦-١٠-٣١، اعتمدها محمد بعد عشرة توجّهات) — بديلُ `ConfirmDialog` في القالب، بواجهته نفسِها فتنتقل الغرفُ
 * بسطر الاستيراد. **رأسُها لوحٌ مصمتٌ بلون معناها** (الحذفُ أحمر، والتحذيرُ كهرمانيّ، والنجاحُ أخضر) بمادّة اللوح كلِّها، والسؤالُ
 * والختمُ الزجاجيُّ عليه؛ والشرحُ والزرّان على الورقة. **لونٌ مشبعٌ واحدٌ في النافذة** (لا كحليَّ فيها): الأساسيُّ المادّةُ نفسُها،
 * والإلغاءُ الصندوقُ المحايد. (الشكلُ والقاعدة في `ad.css`، والرفوضُ هناك.)
 * **والتركيزُ عند الفتح على «إلغاء»** في الخطِر والتحذير (حذف، إنهاء نهائيّ): فلا يُنفِذ Enter عَجِلٌ ما لا يُستردّ — وفي النجاح على الفعل.
 */
type ConfirmProps = {
  open: boolean;
  onClose: () => void;
  tone: "danger" | "warning" | "success";
  icon: ReactNode;
  title: string;
  text?: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  onCancel?: () => void;
  single?: boolean;
  loading?: boolean;
};

export function AdConfirm(p: ConfirmProps) {
  const titleId = useId();
  const descId = useId();
  // **النافذةُ تُغلق بما فُتحت به**: الغرفةُ تُفرغ هدفَها لحظةَ الإغلاق، والصندوقُ يبقى لحركة خروجه، فكان نصُّه يختفي ويتبدّل
  // لونُه وهو يتلاشى (حمراءُ تصير كهرمانيّةً بلا عنوان). فيُحفظ آخرُ ما عُرض ما دامت مغلقة.
  const [shown, setShown] = useState(p);
  if (p.open && (shown.title !== p.title || shown.text !== p.text || shown.tone !== p.tone || shown.confirmLabel !== p.confirmLabel || shown.loading !== p.loading || !shown.open)) setShown(p);
  const c = p.open ? p : { ...shown, open: false, onClose: p.onClose, loading: p.loading };
  return (
    <Dialog open={p.open} onClose={p.onClose} busy={p.loading} contentClassName={`mdl mdl-sm ad-dlg ad-dlg-tone-${c.tone}`} labelledBy={titleId} describedBy={c.text ? descId : undefined}>
      <ConfirmInner {...c} titleId={titleId} descId={descId} />
    </Dialog>
  );
}

/** مختبر: النافذةُ نفسُها ساكنةً في الصفحة — للوح المعاينة (`/dashboard/ad/dialogs`). تُحذف مع المختبر. */
export function AdConfirmStill(p: Omit<ConfirmProps, "open" | "onClose" | "onConfirm">) {
  const titleId = useId();
  const descId = useId();
  const noop = () => {};
  return (
    <div className={`mdl mdl-sm ad-dlg ad-dlg-still ad-dlg-tone-${p.tone}`} role="group" aria-labelledby={titleId}>
      <ConfirmInner {...p} open onClose={noop} onConfirm={noop} titleId={titleId} descId={descId} />
    </div>
  );
}

function ConfirmInner({
  tone, icon, title, text, confirmLabel, onConfirm, cancelLabel = "إلغاء", onCancel, onClose, single, loading, titleId, descId,
}: ConfirmProps & { titleId: string; descId: string }) {
  return (
    <DuotoneZone>
      <div className="ad-dlg-head">
        <span className="ad-dlg-mark" aria-hidden>{icon}</span>
        <h2 id={titleId} className="ad-dlg-t">{title}</h2>
      </div>
      <div className="ad-dlg-main">
        {text && <p id={descId} className="ad-dlg-x">{text}</p>}
        <div className="ad-dlg-foot">
          <AdButton plain variant={tone === "danger" ? "danger-fill" : "fill"} onClick={onConfirm} busy={loading}>{confirmLabel}</AdButton>
          {!single && <AdButton plain variant="soft" onClick={onCancel ?? onClose} held={loading} first={tone !== "success"}>{cancelLabel}</AdButton>}
        </div>
      </div>
    </DuotoneZone>
  );
}

/* ═══ الفراغ والسطر الصادق ═══ */
/**
 * **الفراغ: القطعة** (اختيارُ محمد ٢٠٢٦-١٠-٣٠، بدل ديبو ومن ثلاثة مقترحات): مربّعٌ من اللوح برمز الغرفة — علامةُ
 * الشريط مقلوبةً على الورقة، كمربّع أيقونة الزرّ الهادئ — ثمّ الحقيقةُ وأفعالُها. هيئةٌ واحدة للفراغات كلّها.
 * (القماشُ يصنع مادّةً ثالثة: ورقةً منقوشة، والسطرُ يجعل للفراغ هيئتين.)
 */
/** `detail`: نصُّ الخطأ التقنيّ في صندوقٍ بزرّ «نسخ» — و`report` ما يُنسخ فعلًا (النصُّ مع سياقه: الغرفةُ والمسارُ والوقت) */
export function AdEmpty({
  icon, title, desc, detail, report, action,
}: { icon?: ReactNode; title: string; desc?: string; detail?: string | null; report?: () => string; action?: ReactNode }) {
  return (
    <div className="ad-empty" role="status">
      {icon && <span className="ad-empty-ic" aria-hidden>{icon}</span>}
      <div className="ad-empty-text">
        <p className="ad-empty-title">{title}</p>
        {desc && <p className="ad-empty-desc">{desc}</p>}
        {detail && <ErrDetail text={detail} report={report} />}
        {action && <div className="ad-empty-acts">{action}</div>}
      </div>
    </div>
  );
}

/** صندوقُ نصّ الخطأ: يُقرأ كما هو (من اليسار، بخطٍّ ثابت العرض)، وتحته «نسخ نصّ الخطأ» يضعه في الحافظة بسياقه لمن يُبلِغ. */
function ErrDetail({ text, report }: { text: string; report?: () => string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <div className="ad-empty-detail">
      <code dir="ltr">{text}</code>
      <div className="ad-empty-detail-foot">
      <AdButton
        variant="soft"
        size="sm"
        icon={copied ? <Check /> : <Copy />}
        done={copied}
        onClick={async () => {
          try {
            await copyText(report ? report() : text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            toast.error("تعذّر النسخ، فحدّد النصَّ وانسخه بيدك.");
          }
        }}
      >
        {copied ? "نُسخ نصُّ الخطأ" : "نسخ نصّ الخطأ"}
      </AdButton>
      </div>
    </div>
  );
}

/**
 * `tone`: بلا نغمة تنبيهٌ كهرمانيّ (نقصٌ في القراءة)، و`bad` خطأ — كلاهما `alert`. و`info` **قاعدةٌ دائمةٌ للغرفة** لا تنبيه
 * (حدُّ ما يُكتب في معرفة ديبو): هادئةٌ بلون الورقة، و`note` لا `alert` فلا يقاطع قارئُ الشاشة بها كلَّ زيارة.
 */
/**
 * **صفُّ القيادة** (محمد ٢٠٢٦-١١-٠٣): مقاعدُ الوحدة وجوهًا بمسمّياتها — منسّقُ القسم، والقائد، والنائب، والمشرفان — فوق كروت
 * أعضائها. كانت القيادةُ كرتين بين الأعضاء وسطرًا نصّيًّا («لا يُلاحَظ من كثر ما هو عاديّ»)، فصار لها مكانٌ واحدٌ يُرى. والمقعدُ الفارغ
 * دائرةٌ متقطّعة بلون التحذير مكتوبٌ تحتها «فارغ»، فيُلفت العينَ بلا جملة. وصاحبُ الشاشة «أنت» أينما جلس، والوجهُ يفتح ملفَّه.
 */
export type AdSeat = {
  /** المنصب — في كعب التذكرة مع رمزه («القائد»، «المشرف») */
  title: string;
  /** رمزُ المنصب في الكعب (تاجٌ للقائد، نصفُ تاجٍ للنائب، درعٌ للمشرف) */
  icon?: ReactNode;
  /** سطورُ صاحب المقعد تحت اسمه — سطورُ الكرت نفسُها برموزها («منذ 23 أكتوبر 2026»، «إدارة الضمان والجودة») */
  meta?: AdMeta[];
  person: { name: string; src?: string | null; gender?: string | null } | null;
  you?: boolean;
  /** فتحُ ملفّ صاحب المقعد — باسمه، كما يُفتح الكرت */
  onOpen?: () => void;
  /** التواصلُ معه (واتساب) — «التواصل» في قاع كرته كما في كروت الأعضاء (محمد ٢٠٢٦-١١-٠٣: «القائدُ يحتاج أن يتواصل مع مشرفيه») */
  onContact?: () => void;
  /** مجموعتُه في الصفّ («القيادة» بالتاج، «الإشراف» بالدرع) — المقاعدُ المتتالية بمجموعةٍ واحدة تحت عنوانها ورمزِه */
  group?: {
    label: string; icon?: ReactNode; /** رأسُ الوحدة فوق لجانها: صفٌّ وحده في منتصفه، كرأس صفحة الهيكلة */ head?: boolean;
    /** أفعالٌ على المجموعة في سطر عنوانها («تعديل» اللجنة) — `AdGroupTitle act` */
    act?: AdGroupAct[];
    /** سطرٌ تحت اسمها («مقعدٌ فارغ») */
    sub?: string;
  };
  /**
   * **قاعُ المقعد أفعالُ صاحب الغرفة** (تعيينُ المناصب ٢٠٢٦-١١-١٤): «استبدال» و«إزالة»، و«إسناد» و«تكليف» للفارغ — مكانَ «التواصل».
   * والقاعدةُ نفسُها: قاعٌ في المقاعد كلّها، فمقعدٌ لا فعلَ فيه («منصبٌ ثابت») قاعُه سطرٌ هادئٌ لا فراغ
   */
  foot?: ReactNode;
};
/**
 * **صفُّ القيادة: كلُّ مقعدٍ كرتُ شخصٍ واقف** (محمد ٢٠٢٦-١١-٠٣: «المبدأُ والتذكرةُ متّفقٌ عليهما، والتطبيقُ قبيح»). المقعدُ هو `AdCard`
 * بوجهه نفسِه لا قطعةٌ تشبهه: الكعبُ شريطٌ أعلاه بقماشه وثلمتيه وفيه المنصبُ برمزه، والوجهُ على حدّه، والاسمُ وسطورُه تحته،
 * وقاعُه «التواصل» في المقاعد كلّها، و«أنت» شارةٌ على حدّ وجهك. فلا حجمَ ولا زاويةَ ولا ثلمةَ ولا زرَّ إلّا ما في كروت البوّابة.
 * (رُدّ قبله: تذكرةٌ أفقيّةٌ عريضةٌ قصيرة بزاويةٍ وثلمةٍ أصغر من الكرت — نوعٌ آخرُ من التذاكر، وفراغٌ بين الاسم وطرفها، وصفٌّ يتبدّل
 * بين صفٍّ وصفّين بقياس الأسماء؛ ودائرةُ رمز الواتساب وحده؛ وطرفٌ مثقوبٌ بخطٍّ متقطّع، والمتقطّعُ عندنا حدُّ الفارغ.)
 */
export function AdSeats({ label, seats, gaps }: {
  label: string;
  seats: AdSeat[];
  /** ما ينقص اللجانَ — سطرٌ في الصفّ نفسِه لا صندوقٌ ثانٍ */
  gaps?: string | null;
}) {
  /**
   * **الصفُّ مجموعاتٌ بعناوينها** (محمد ٢٠٢٦-١١-٠٣: «"قيادة لجنة الفعاليات" غيرُ واضحة: هل المشرفان قيادة؟»): القائدُ والنائبُ تحت
   * «القيادة»، والمشرفان تحت «الإشراف» — فالهيكلُ يُرى بنفسه: من يقود اللجنة ومن يشرف عليها من خارجها. والكروتُ صفٌّ واحدٌ كما كانت
   * (شبكةٌ فرعيّة)، واسمُ الوحدة لا يتكرّر فوقها: هو في رأس الصفحة وفي موضعها المختار. وبلا مجموعات يبقى العنوانُ الواحد.
   */
  const groups = seats.reduce<{ label?: string; icon?: ReactNode; head?: boolean; act?: NonNullable<AdSeat["group"]>["act"]; sub?: string; seats: AdSeat[] }[]>((acc, x) => {
    const last = acc[acc.length - 1];
    if (last && last.label === x.group?.label) last.seats.push(x);
    else acc.push({ label: x.group?.label, icon: x.group?.icon, head: x.group?.head, act: x.group?.act, sub: x.group?.sub, seats: [x] });
    return acc;
  }, []);
  const card = (x: AdSeat) => (
    <li key={`${x.title}-${x.person?.name ?? ""}-${x.meta?.[0]?.text ?? ""}`} className="ad-seat-cell" data-vacant={x.person ? undefined : ""}>
      <AdCard
        seed={`${x.title}${x.person?.name ?? ""}`}
        stub={{ big: "", small: x.title, icon: x.icon }}
        face={x.person ? { name: x.person.name, src: x.person.src, gender: x.person.gender, mark: x.you ? <AdBadge>أنت</AdBadge> : undefined } : { name: "", vacant: true }}
        title={x.person ? x.person.name : "فارغ"}
        onOpen={x.person ? x.onOpen : undefined}
        meta={x.meta}
        /* **قاعٌ واحدٌ بزرٍّ واحد في المقاعد كلّها** (محمد ٢٠٢٦-١١-٠٣: «الفارغُ أيضًا يحتاج فوترًا ليتّسق»): «التواصل» لغيرك (زرُّ كروت
           الأعضاء نفسُه)، ومعطّلًا حيث لا أحدَ يُتواصَل معه — الفارغ، ومن لا جوّال له، ومقعدُك (و«أنت» على حدّ وجهك).
           (رُدّ قبله: القاعُ كاملًا «الملفّ الشخصيّ» و«التواصل» — فعلان متلاصقان في كرتٍ من أربعة؛ و«الملفّ الشخصيّ» وحده في مقعدك —
           «لا داعي، الاسمُ يفتحه»؛ و«أنت» شارةً في القاع — «قبيح»؛ وكبسولةً في ركن الشريط؛ وزرًّا معطّلًا مكانَ الزرّ.) */
        // `foot: null` كرتٌ بلا قاع (ضيوفُ الفعاليّة: لا تواصلَ مع ضيفٍ من صفحةٍ عامّة)
        foot={x.foot === null ? undefined : x.foot ?? <AdButton variant="soft" size="sm" icon={<WhatsappLogo />} onClick={x.onContact ?? (() => {})} disabled={!x.onContact || !x.person}>التواصل</AdButton>}
      />
    </li>
  );
  const grouped = groups.some((g) => g.label);
  return (
    <section className="ad-seats" aria-label={label}>
      {!grouped && <h3 className="ad-seats-title">{label}</h3>}
      {seats.length > 0 && (
        <div className="ad-seats-row" data-n={Math.min(seats.length, 4)}>
          {groups.map((g, i) => (
            <div key={`${g.label ?? ""}-${i}`} className="ad-seat-group" data-k={Math.min(g.seats.length, 4)} data-head={g.head ? "" : undefined}>
              {g.label && <AdGroupTitle icon={g.icon} act={g.act} sub={g.sub}>{g.label}</AdGroupTitle>}
              <ul className="ad-seat-list">{g.seats.map(card)}</ul>
            </div>
          ))}
        </div>
      )}
      {gaps && <p className="ad-seats-gaps">{gaps}</p>}
    </section>
  );
}

/**
 * **عنوانُ مجموعة الكروت** (محمد ٢٠٢٦-١١-٠٤، قاعدة): لوحةُ اسمٍ من اللوح الكحليّ بنقشه — رمزُ عائلة الكروت وكلمتُها — ثمّ خطٌّ يخرج
 * منها ويذوب إلى آخر المجموعة. لكلّ غرفةٍ تقسم كروتها مجموعات («القيادة» و«الإشراف» في صفّ القيادة)؛ والشكلُ وما رُدّ قبله في `ad.css`.
 */
export type AdGroupAct = { label: string; icon: ReactNode; onClick: () => void };
export function AdGroupTitle({ icon, children, sub, more, act }: {
  icon?: ReactNode; children: ReactNode;
  /** **أفعالٌ على المجموعة نفسِها** في موضع «عرض الكل» (تعيينُ المناصب ٢٠٢٦-١١-١٤: «تعديل» اللجنة فوق مقعدَيها، و«إضافة لجنة») — أزرارٌ لا روابط */
  act?: AdGroupAct[];
  /**
   * **«عرض الكل (N)»** (قطعةٌ جديدة، أُعلنت لمحمد ٢٠٢٦-١١-١٣ مع الرئيسية): المجموعةُ ملخّصٌ من غرفتها («من كلّ نوعٍ ثلاثةٌ ثمّ عرض الكل»،
   * قاعدةُ النموّ ٢٠٢٦-١١-٠٧)، فبابُ غرفتها في طرف سطرها بعد الشعرة، بعدد ما فيها كلِّه
   */
  more?: { label: string; href: string };
  /** سطرٌ تحت الاسم يلخّص المجموعة («ينتظرك»: «لك موعدٌ بعد 7 أيام، وشهادةٌ جاهزة» — الرئيسية ٢٠٢٦-١١-٠٥): الاسمُ قصيرٌ في قطعته،
   *  والجملةُ بحبر الورق تحته — كانت الجملةُ نفسُها في القطعة فثقُل الكحليُّ تحت لوح الغرفة */
  sub?: string;
}) {
  const title = (
    <h3 className="ad-gtitle">
      <span className="ad-gtitle-name">{icon}<span>{children}</span></span>
      {more ? <Link className="ad-btn ad-btn-line ad-btn-sm ad-btn-end ad-gtitle-more" href={more.href}>{more.label}<CaretLeft /></Link> : null}
      {act?.length ? (
        <span className="ad-gtitle-more ad-gtitle-acts">
          {act.map((a) => <button key={a.label} type="button" className="ad-btn ad-btn-line ad-btn-sm" onClick={a.onClick}>{a.icon}{a.label}</button>)}
        </span>
      ) : null}
    </h3>
  );
  return sub ? <div className="ad-gtitle-wrap">{title}<p className="ad-gtitle-sub">{sub}</p></div> : title;
}

/**
 * **التنبيه** (`AdNote`، اعتمده محمد ٢٠٢٦-١١-٠٥: «ممتاز، يعتمد» — «ي» الورقةُ المضاءة، بعد تسعة توجّهاتٍ بُنيت في الغرف: الختم، والكرت،
 * واللوحُ بنغمته شريطًا، والسطر، والعلامةُ المائيّة، والختمُ في السطر، واللوحُ كاملًا، واللسان — وكان الأوّلُ «عاديًّا جدًّا»):
 * ورقةٌ بيضاءُ بحافّةٍ داخليّةٍ فاتحة (لغةُ كرت العضويّة)، و**الختمُ قطعةٌ من مادّة اللوح بلون المعنى** برمزه وضوئه، و**وهجٌ بلونه ينبعث
 * من الختم** دائرةً ناعمة، ثمّ التسميةُ الصغيرة (`label`) فوق الجملة بخطّ العناوين (`title`) وشرحِها (`children`)، ثمّ الفعلُ في الطرف
 * المقابل (وفي الضيّق تحت النصّ). والجملةُ الواحدةُ بلا عنوان هي العنوانُ نفسُه. والنغماتُ أربع: إعلاميٌّ بلوح الهويّة الكحليّ، ونجاحٌ
 * وتحذيرٌ وخطر — **لونٌ واحدٌ يسري في الختم والوهج والجملة وختمِ الفعل**. و`onClose` إغلاقُه (رسالةٌ بعد فعلٍ تمّ). والرسالةُ المنبثقة
 * القطعةُ نفسُها حين تأتي وتذهب (`ad.css`).
 */
type NoteTone = "info" | "ok" | "warn" | "bad";
const NOTE_IC: Record<NoteTone, ReactNode> = { info: <Info />, ok: <CheckCircle />, warn: <Warning />, bad: <WarningCircle /> };

export function AdNote({ tone, label, title, icon, children, action, onClose, live }: {
  tone?: NoteTone;
  /** **حالٌ تصل بعد فعل** («حُفظ مقعدك»): تُعلَن لقارئ الشاشة (`status`) — الملاحظةُ الساكنةُ في نغمتها الهادئة `note` لا تُعلَن */
  live?: boolean;
  /** تسميةٌ صغيرةٌ فوق الجملة («رغباتك»، «البريد») — لغةُ سطر «حسابي»: التسميةُ فوق القيمة */
  label?: string;
  title?: ReactNode; icon?: ReactNode; children?: ReactNode; action?: ReactNode; onClose?: () => void;
}) {
  const t: NoteTone = tone ?? "warn";
  return (
    <div className="ad-note" data-tone={t} role={live ? "status" : t === "info" || t === "ok" ? "note" : "alert"}>
      <span className="ad-note-band" aria-hidden><span>{icon ?? NOTE_IC[t]}</span></span>
      <span className="ad-note-t">{label ? <small>{label}</small> : null}{title ? <b>{title}</b> : null}{children ? <span>{children}</span> : null}</span>
      {action || onClose ? (
        <span className="ad-note-act">
          {action}
          {onClose ? <button type="button" className="ad-note-x" onClick={onClose} aria-label="إغلاق"><X /></button> : null}
        </span>
      ) : null}
    </div>
  );
}
