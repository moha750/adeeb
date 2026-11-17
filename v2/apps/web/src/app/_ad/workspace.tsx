"use client";

/**
 * **قالبُ مساحة العمل** (مختبرُ ٢٠٢٦-١١-١٢، لم يُعتمد بعد): غرفٌ يُبنى فيها شيءٌ طويلٌ من قطعٍ تُرتَّب — أسئلةُ الاستبيان، وأقسامُ الخبر،
 * وقواعدُ ديبو — ويُجرَّب قبل الالتزام. هو امتدادُ قالب النموذج («التذكرةُ الحيّة»): لوحُ الغرفة، وأقسامُ «حسابي»، والحقولُ (ب)،
 * وأفعالُ الالتزام وطافيُها في الضيّق — ويزيد ثلاثًا وجدتها دراسةُ الغرف الثلاث:
 * 1. **القطعة** (`WorkBlock`): سطرٌ يُطوى ويُفتح، رقمُه موضعُه، ويُسحب بمحرّك الترتيب المعتمد (▲ ⠿ ▼). قائمةُ أربعين قاعدةً لا تُقرأ مفتوحة.
 * 2. **التجربة** قبل الالتزام: في (أ) نافذة، وفي (ب) منضدةٌ بجانب التحرير.
 * 3. **حارسُ المغادرة** (`useLeaveGuard`): كانت الغرفُ الثلاث تُغادَر بتعديلاتها بلا كلمة.
 * والاتّجاهان: (أ) «الصفحةُ المتّصلة» — عمودُ النموذج الضيّق فيه الأفعالُ ثمّ فهرسُ القطع ثمّ التذكرة؛ و(ب) «المنضدة» — عمودٌ عريضٌ
 * للتجربة الحيّة، وفي الضيّق موضعان «التحرير / المعاينة».
 */
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { ListNumbers } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { CaretUp, Eye, PencilSimple, Warning } from "@/app/_components/glyphs";
import { AdConfirm, AdGroupTitle, AdRoom, AdSwitch, PlateCrumb } from "./primitives";
import { CommitButtons, FloatCommit, useFormCrumb, type FormCommitSpec } from "./form";
import { SortGrip, useSortItem, useSortNode } from "./reorder";
import { fmtNum } from "./format";
import { stageMsg } from "@/lib/stageFrame";

function Plate({ title, path }: { title: string; path?: string }) {
  const crumb = useFormCrumb(path, title);
  return (
    <div className="ad-room-head">
      <section className="ad-plate" aria-labelledby="ad-room-title">
        <div className="ad-plate-body">
          <div className="ad-plate-id">
            <PlateCrumb crumb={crumb} />
            <h1 id="ad-room-title" className="ad-plate-title">{title}</h1>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * الغرفة. `look` الاتّجاه (مختبر). في (أ) `side` ما تحت الأفعال في العمود الضيّق (الفهرس، التذكرة). وفي (ب) `stage` التجربةُ الحيّة
 * في العمود العريض، و`stageTitle` اسمُها («كما يراه المشارك»).
 */
export function WorkRoom({ look, path, title, commit, side, stage, stageTitle, lead, panes, board: boardProp, onBoard, switched, view: viewProp, onView, children }: {
  look: "a" | "b";
  path?: string;
  title: string;
  /**
   * **غرفةٌ بلا التزام** (محرّر الكتيّب ٢٠٢٦-١١-١٦): كلُّ فعلٍ فيها يُحفظ في لحظته، فلا «حفظ» ولا «إلغاء» — وحالُها وفعلُ مرحلته
   * في `lead` (كحال الخبر). فلا يُرسم شريطُ الأفعال فوق المنضدة ولا طافيه.
   */
  commit?: FormCommitSpec;
  side?: ReactNode;
  stage?: ReactNode;
  stageTitle?: string;
  /** ما فوق التحرير في عموده، يبقى في كلّ لوح (حالُ الخبر وفعلُ مرحلته) */
  lead?: ReactNode;
  /**
   * **ألواحُ التحرير** (محرّر الخبر ٢٠٢٦-١١-١٣: «الكتابة» و«الإدارة»، قرارُ المالك ٢٠٢٦-٠٩-٢٤ «لوحان لا ستّةُ تبويبات»): في العريض مبدّلٌ
   * فوق العمود (`AdSwitch`)، وفي الضيّق تصير مواضعَ في مبدّل الصفحة نفسِه بجانب «المعاينة» — مبدّلٌ واحدٌ لا مبدّلان متراكبان.
   */
  panes?: { key: string; label: string; node: ReactNode }[];
  /** اللوحُ الظاهر حين تختاره الغرفةُ نفسُها (البيانات: «نسخ إلى المحرّر» من «الصادرة» يرجع إلى «البيان») — وبلاه يختاره المبدّلُ وحده */
  board?: string | null;
  onBoard?: (key: string) => void;
  /**
   * **المعاينةُ موضعٌ في المبدّل على كلّ شاشة** (محرّر الكتيّب، محمد ٢٠٢٦-١١-١٦: «بحكم أهمّيّة التبويب… يحتاج إلى تركيزٍ أكبر»): لا تجاور
   * التحرير في العريض، بل تأخذ الغرفةَ كلَّها حين تُختار — فيُرى الكتابُ بصفحتيه المتقابلتين كما يراه القارئ في الحاسوب لا في عمودٍ ضيّق
   */
  switched?: boolean;
  /** الموضعُ حين تختاره الغرفة («عاينها» في قطعة الصفحة ينقل إلى المعاينة) — وبلاه يختاره المبدّلُ وحده */
  view?: "edit" | "stage";
  onView?: (v: "edit" | "stage") => void;
  children?: ReactNode;
}) {
  const [paneIn, setPaneIn] = useState<"edit" | "stage">("edit");
  const pane = viewProp ?? paneIn;
  const setPane = (v: "edit" | "stage") => { setPaneIn(v); onView?.(v); };
  const [boardIn, setBoardIn] = useState(panes?.[0]?.key ?? "edit");
  const board = boardProp ?? boardIn;
  const setBoard = (k: string) => { setBoardIn(k); onBoard?.(k); };
  const wb = useRef<HTMLDivElement>(null);
  useScrollportHeight(wb);
  // **المعاينةُ تُرى كاملةً حين تُختار** (`switched`): الإطارُ بطول الشاشة تحت اللوح والمبدّل، فتنزل الغرفةُ إليه — كانت تُختار فيُرى نصفُها
  useEffect(() => {
    if (!switched || pane !== "stage") return;
    // **المبدّلُ والإطارُ كلاهما يُرى** (المراجع ٢٠٢٦-١١-١٦): كانت الغرفةُ تنزل إلى أسفل الإطار فيغيب المبدّلُ تحت الرأس، ولا يُرجَع إلى التحرير
    // إلّا بالتمرير. فيُقاس ما بين المبدّل والإطار (`--ad-wb-lead`)، ويقصر الإطارُ بقدره، وتنزل الغرفةُ إلى المبدّل
    const el = wb.current;
    const panes = el?.previousElementSibling as HTMLElement | null;
    const fr = el?.querySelector<HTMLElement>(".ad-wb-frame");
    if (!el || !panes || !fr) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => {
      el.style.setProperty("--ad-wb-lead", `${fr.getBoundingClientRect().top - panes.getBoundingClientRect().top}px`);
      panes.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    });
  }, [switched, pane]);
  if (look === "a") {
    return (
      <AdRoom label={title}>
        <Plate title={title} path={path} />
        <div className="ad-form ad-work" data-look="a">
          <div className="ad-form-main">{children}</div>
          <aside className="ad-form-side">
            {commit ? <div className="ad-form-commit" data-commit-home><CommitButtons commit={commit} /></div> : null}
            {side}
          </aside>
          {commit ? <FloatCommit commit={commit} /> : null}
        </div>
      </AdRoom>
    );
  }
  return (
    <AdRoom label={title}>
      <Plate title={title} path={path} />
      {/* في الضيّق موضعان: التحريرُ والتجربةُ لا يتّسعان معًا لشاشة جوّال */}
      <div className="ad-wb-panes">
        <AdSwitch label="العرض" position={pane === "stage" ? "stage" : panes ? board : "edit"}
          onPosition={(k) => { if (k === "stage") setPane("stage"); else { setPane("edit"); if (panes) setBoard(k); } }}
          positions={[...(panes ? panes.map((x) => ({ key: x.key, label: x.label })) : [{ key: "edit", label: "التحرير" }]), { key: "stage", label: "المعاينة" }]} />
      </div>
      <div ref={wb} className="ad-form ad-work ad-wb" data-look="b" data-pane={pane} data-switch={switched || undefined}>
        <div className="ad-form-main">
          {lead}
          {panes ? (
            <>
              <div className="ad-wb-boards">
                <AdSwitch label="لوحا العمل" position={board} onPosition={setBoard} positions={panes.map((x) => ({ key: x.key, label: x.label }))} />
              </div>
              {panes.find((x) => x.key === board)?.node}
            </>
          ) : children}
        </div>
        <aside className="ad-wb-stage" aria-label={stageTitle}>
          {commit ? (
            <div className="ad-wb-bar">
              <div className="ad-form-commit" data-commit-home><CommitButtons commit={commit} /></div>
            </div>
          ) : null}
          <div className="ad-wb-screen">
            <AdGroupTitle icon={<Eye />}>{stageTitle ?? "المعاينة"}</AdGroupTitle>
            <div className="ad-wb-frame">{stage}</div>
          </div>
        </aside>
        {commit ? <FloatCommit commit={commit} /> : null}
      </div>
    </AdRoom>
  );
}

/**
 * **ارتفاعُ ما يُرى من المحتوى** يُكتب على المنضدة (`--ad-wb-view`، ومعه حشوتاه `--ad-wb-pad`) فتملأ المنضدةُ الشاشةَ ولا تزيد.
 * كانت `100dvh` ناقصًا تقديرًا، لا تعرف رأسَ البوّابة ولا جزيرةَ الجوّال: فخرج أسفلُها عن الشاشة في الحاسوب (لا تُرى زاويتاه)
 * وفي الجوّال بربع طولها (المراجع البصريّ ٢٠٢٦-١١-١٣). والقياسُ من نافذة التمرير نفسِها (`.ash-content`) لا من أرقام الهيكل.
 */
function useScrollportHeight(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    const port = el?.closest<HTMLElement>(".ash-content");
    if (!el || !port) return;
    const write = () => {
      const cs = getComputedStyle(port);
      el.style.setProperty("--ad-wb-view", `${port.clientHeight}px`);
      el.style.setProperty("--ad-wb-pad", `${parseFloat(cs.paddingBlockStart) + parseFloat(cs.paddingBlockEnd)}px`);
    };
    write();
    const ro = new ResizeObserver(write);
    ro.observe(port);
    return () => ro.disconnect();
  }, [ref]);
}

/**
 * **القطعة**: سطرٌ برقم موضعه وعنوانِه وسطرِ حاله، يُفتح فيصير حقولًا. والمقبضُ (▲ ⠿ ▼) يحرّكها حين تكون في ساحة سحب (`SortItem`).
 * والسطرُ كلُّه زرُّ فتحها، وفعلُه في طرفه قطعةٌ من سطر «حسابي» (`.ad-line-act`): «تحرير» مطويّةً و«أقلّ» مفتوحة — كان سهمًا وحده
 * ومعه رمزا «تكرار» و«حذف» رماديّان في الرأس، قطعٌ بلا أصل (محمد ٢٠٢٦-١١-١٢). و`acts` أفعالُها **في ذيلها مفتوحةً** (تكرار، حذف):
 * تُفعل بالقطعة وهي بين يديك، لا في كلّ سطرٍ من قائمةٍ مطويّة. والمطويّةُ تُقرأ من سطرها: «اختيار واحد، إلزاميّ، 4 خيارات».
 */
export function WorkBlock({ n, title, untitled, sub, open, onToggle, acts, warn, verb, thumb, children }: {
  n: number;
  /**
   * **صورتُها بعد رقمها** (محرّر الكتيّب ٢٠٢٦-١١-١٦: القطعةُ صفحةٌ من صور، ولا تُعرف صفحةٌ بلا اسمٍ إلّا بوجهها): مصغّرةُ معرض الصور
   * (`AdGallery`) بنسبة الصفحة، بين الرقم والعنوان.
   */
  thumb?: string;
  title: string;
  /** العنوانُ لم يُكتب بعد: يُعرض خافتًا باسم القطعة */
  untitled?: boolean;
  sub?: string;
  open: boolean;
  onToggle: () => void;
  acts?: ReactNode;
  /** ما يمنع حفظها (خيارٌ فارغ، سؤالٌ بلا نصّ) — علامةٌ في سطرها وهي مطويّة */
  warn?: string;
  /** فعلُها مطويّةً حين لا تُحرَّر بل تُقرأ (جوابُ ديبو في القياس: «جوابه» لا «تحرير») */
  verb?: { label: string; icon: ReactNode };
  children: ReactNode;
}) {
  const sort = useSortItem();
  const ref = useSortNode(sort);
  const at = sort?.n ?? n;
  const body = useId();
  return (
    <div ref={ref} className="ad-wblk" data-open={open || undefined} data-moving={sort?.moving || undefined} role="group" aria-label={`${title}، ${fmtNum(at)}`}>
      <div className="ad-wblk-head">
        <SortGrip sort={sort} axis="y" />
        <button type="button" className="ad-wblk-hit" aria-expanded={open} aria-controls={open ? body : undefined} onClick={onToggle}>
          <span className="ad-wblk-n ad-num" aria-hidden>{fmtNum(at)}</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- مصغّرةٌ من التخزين بتحويله، لا صورةُ موقع */}
          {thumb ? <img className="ad-wblk-thumb" src={thumb} alt="" loading="lazy" /> : null}
          <span className="ad-wblk-t">
            <b data-untitled={untitled || undefined}>{title}</b>
            {/* ما ينقصها سطرُها بنغمة التحذير كسطر «حسابي» (`.ad-line-sub[data-tone]`)، ورمزُه في مربّعٍ بلونه كمربّع رمز السطر (`.ad-line-ic`) —
                محمد ٢٠٢٦-١١-١٢: «كان وجودُ الأيقونة رائعًا… لو كان وراءها خلفيّة» */}
            {warn ? <span data-tone="warn"><span className="ad-wblk-wi" aria-hidden><Warning /></span>{warn}</span> : sub ? <span>{sub}</span> : null}
          </span>
          <span className="ad-btn ad-btn-soft ad-btn-sm ad-line-act" aria-hidden>{open ? <CaretUp /> : verb?.icon ?? <PencilSimple />}{open ? "أقلّ" : verb?.label ?? "تحرير"}</span>
        </button>
      </div>
      {open ? (
        <div id={body} className="ad-wblk-body">
          {children}
          {acts ? <div className="ad-wblk-foot">{acts}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * **فهرسُ القطع** في العمود الضيّق (أ): سطرٌ لكلّ قطعةٍ برقمها، والنقرُ يفتحها وينزل إليها. والمفتوحةُ معلَّمة.
 */
export function WorkIndex({ label, items, at, onPick }: {
  label: string;
  items: { key: string; n: number; text: string; untitled?: boolean; warn?: boolean }[];
  at: string | null;
  onPick: (key: string) => void;
}) {
  return (
    <nav className="ad-windex" aria-label={label}>
      <AdGroupTitle icon={<ListNumbers />}>{label}</AdGroupTitle>
      <ol className="ad-windex-l" role="list">
        {items.map((x) => (
          <li key={x.key}>
            <button type="button" className="ad-windex-b" aria-current={at === x.key || undefined} onClick={() => onPick(x.key)} data-untitled={x.untitled || undefined}>
              <span className="ad-windex-n ad-num" aria-hidden>{fmtNum(x.n)}</span>
              <span className="ad-windex-t">{x.text}</span>
              {x.warn ? <><Warning className="ad-windex-w" aria-hidden /><span className="ad-sr">، ينقصه ما يمنع الحفظ</span></> : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * **حارسُ المغادرة**: ما دام في الغرفة ما لم يُحفظ، فإغلاقُ اللسان أو تحديثُه يسأل المتصفّحَ سؤالَه، والنقرُ على رابطٍ داخل البوّابة
 * يفتح نافذةَ التحذير المعتمدة («تغادر قبل الحفظ؟») — كانت الغرفُ الثلاث تُغادَر بتعديلاتها بلا كلمة.
 */
export function useLeaveGuard(dirty: boolean) {
  const router = useRouter();
  const [to, setTo] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty) return;
    // `returnValue` لسفاري والمتصفّحات الأقدم: `preventDefault` وحده لا يُسأل به فيها
    const onUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname + url.search === location.pathname + location.search && url.hash)) return;
      e.preventDefault();
      e.stopPropagation();
      setTo(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onUnload); document.removeEventListener("click", onClick, true); };
  }, [dirty]);
  return (
    <AdConfirm
      open={to !== null}
      onClose={() => setTo(null)}
      tone="warning"
      icon={<Warning />}
      title="تغادر قبل الحفظ؟"
      text="ما غيّرتَه بعد آخر حفظٍ سيضيع."
      confirmLabel="غادر بلا حفظ"
      cancelLabel="ابقَ هنا"
      onConfirm={() => { const href = to; setTo(null); if (href) router.push(href); }}
    />
  );
}

/**
 * **المنضدة: الصفحةُ كما ستُرى** (اعتُمدت ٢٠٢٦-١١-١٢ على منشئ الاستبيان، وعُمّمت ٢٠٢٦-١١-١٣ لمحرّر الخبر): إطارٌ يحمل صفحةً من
 * `/frame/*` (`lib/stageFrame`)، والمحرّرُ يرسل إليها مسوّدتَه (`payload`) برسالةٍ من الأصل نفسه كلّما تبدّلت، ويعيدها كلّما قال الإطارُ إنّه
 * جاهز (حُمّل أوّلَ مرّةٍ أو أُعيد تحميلُه). والطرفُ الآخر `useStageDraft` في `app/frame/`.
 * - **وضعُ الإطار وضعُ الغرفة**: الوضعُ على `<html data-theme>` وحده، والإطارُ وثيقةٌ أخرى — فيُنسخ إليه حين يُحمَّل وكلّما تبدّل.
 * - والصفحةُ تملأ إطارَها وتقيس خطوطَها بعرضه هو (الإطارُ شاشةٌ مستقلّة)، فتُرسم كما تُرسم على شاشةٍ بهذا العرض.
 */
export function StageFrame({ src, kind, payload, title }: { src: string; kind: string; payload: unknown; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const m = stageMsg(kind);
  const json = JSON.stringify(payload);
  const latest = useRef<unknown>(payload);
  const send = () => frame.current?.contentWindow?.postMessage({ kind: m.draft, draft: latest.current }, location.origin);
  const ping = () => frame.current?.contentWindow?.postMessage({ kind: m.ping }, location.origin);
  const theme = () => {
    const doc = frame.current?.contentDocument?.documentElement;
    const mode = document.documentElement.dataset.theme;
    if (doc && mode) doc.dataset.theme = mode;
  };
  useEffect(() => {
    latest.current = JSON.parse(json);
    send();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `send` يقرأ `latest` لا حالًا، والمسوّدةُ نصُّها `json`
  }, [json]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow || e.data?.kind !== m.ready) return;
      theme();
      send();
      setReady(true);
    };
    window.addEventListener("message", on);
    // الإطارُ يبدأ تحميلَه مع الصفحة قبل أن تركّب الغرفة، فقد يُعلن جاهزيّتَه ولا مستمعَ بعد: فتسأله الغرفةُ حين تركّب
    ping();
    const mo = new MutationObserver(theme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { window.removeEventListener("message", on); mo.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- يُركَّب مرّةً لكلّ إطار
  }, [kind]);
  return (
    <>
      {/* حتى يجهز الإطار: علامةُ الانتظار لا مربّعٌ فارغ */}
      {ready ? null : <span className="ad-wb-wait" role="status" aria-label="تُحمَّل المعاينة"><span className="ad-spin" aria-hidden /></span>}
      {/* غلافٌ يقصّ زاويةَ الإطار (الإطارُ لا يدوّر نفسَه في كلّ متصفّح) */}
      <div className="ad-wb-sheet">
        <iframe ref={frame} className="ad-wb-phone" data-ready={ready || undefined} src={src} title={title}
          onLoad={() => { theme(); ping(); }} />
      </div>
    </>
  );
}
