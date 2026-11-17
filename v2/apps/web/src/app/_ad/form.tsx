"use client";

/**
 * **قالبُ صفحة النموذج — «التذكرةُ الحيّة»** (اعتمده محمد ٢٠٢٦-١١-٠٧ من ثلاثة اتّجاهاتٍ مبنيّة في «فعاليّة جديدة»: «أنا مثلك أعتمد أ بجدارة»).
 *
 * رُفضت قبله محاولةٌ أولى رفضًا قاطعًا: `SectionCard` القديم وشريطُ الحفظ القديم وزرُّ الرفع القديم بألوان الهويّة («استوردتَ التبويب»). فكلُّ قطعةٍ
 * هنا من قطع الهويّة المعتمدة:
 * - **الرأسُ** لوحُ الغرفة (`RoomPlate` بمادّته وفتاته)، والحقولُ شكلُ (ب)، والأزرارُ برتبتها.
 * - **العمودان** تخطيطُ «حسابي»: العريضُ للأقسام (قسمُ «حسابي» نفسُه: صفحةٌ بيضاء ورأسٌ مصبوغٌ ومربّعُ رمزه قطعةٌ من اللوح)، والضيّقُ يلازم
 *   الشاشة وفيه **الأفعالُ ثمّ تذكرةُ السجلّ كما ستظهر في غرفته**، تتبدّل وأنت تكتب. ولكلّ غرفة قائمةٍ تذكرتُها، فلكلّ نموذجٍ تذكرتُه.
 * - **في الضيّق** ينزل العمودُ آخرَ الصفحة (التذكرةُ ثمّ الأفعال: راجِع ثمّ أنشئ)، و**يلحقك الفعلُ** فوق جزيرة التنقّل حين يكون ما يُحفظ،
 *   ويغيب حين تبلغ الأفعالَ في مكانها (`FloatCommit`؛ عيبٌ سمّيتُه قبل الاعتماد وأُصلح بعين محمد).
 * - **قطعٌ جديدة** على القاعدة نفسِها: حقلُ الصورة (`AdImageField`)، والعنصرُ المتكرّر (`FormRepeatItem`)، والاختيارُ في رأس القسم (`FormChoice`)،
 *   والمفتاحُ في بئر (`FormToggle`)، وسطرُ الحال (`FormHint`).
 * (رُفض: «اللوحُ الملازم» — الأفعالُ أعلى الصفحة وأنت تنتهي في أسفلها؛ و«النافذةُ الكبيرة» — ورقةٌ بيضاءُ واحدة، أقلُّ هويّة.)
 * والسلوكُ سلوكُ كلّ نموذجٍ كما كان؛ والغرفةُ تعطي القالبَ حقولَها وأفعالَها وتذكرتَها ولا تكتب تنسيقًا.
 */
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FieldMark } from "@adeeb/design-system";
import { Eye, Trash } from "@/app/_components/glyphs";
import { crumbFor } from "@/app/dashboard/_shell/crumb";
import { useNav } from "@/app/dashboard/_shell/nav-context";
import { AdButton, AdGroupTitle, AdRoom, PlateCrumb } from "./primitives";
import { useAdLab } from "./lab";
import { SectionSlots } from "./slots";
import { AdUpload } from "./upload";
import { useToast } from "@/app/dashboard/_components/ToastProvider";

/** فعلُ الالتزام: `busy` يجري، و`held` لا شيءَ يُحفظ بعد (التحريرُ قبل أوّل تغيير). */
export type FormAct = { label: string; icon?: ReactNode; onClick: () => void; busy?: boolean; held?: boolean };
/** `dirty`: في النموذج ما لم يُحفظ — به يلحقك الفعلُ في الضيّق. */
export type FormCommitSpec = { primary: FormAct; secondary?: FormAct; cancelHref: string; dirty?: boolean };

/** فتاتُ الصفحة من مسارها (كـ`useRoomCrumb`)، و`path` يسمّيه حين تُعرض الصفحةُ في غير مسارها. */
export function useFormCrumb(path: string | undefined, title: string) {
  const nav = useNav();
  const here = usePathname();
  return crumbFor(path ?? here ?? "", nav, title)
    .filter((st) => st.kind !== "leaf")
    .map((st) => ({ label: st.label, href: st.kind === "link" ? st.href : undefined }));
}

export function FormRoom({ path, title, commit, preview, previewLabel, previewTools, children }: {
  path?: string;
  title: string;
  commit: FormCommitSpec;
  /** تذكرةُ السجلّ كما ستظهر في غرفته (`AdCard` بقيم النموذج) */
  preview?: ReactNode;
  /** اسمُ ما في الجانب حين لا يكون «كما ستظهر» (بيانات الدخول: «العضو» الذي تتغيّر بياناته) */
  previewLabel?: { label: string; icon: ReactNode };
  /** أداةٌ فوق المعاينة خارجَ جسمها الخامد (`inert`) — مبدّلُ «في الموقع / في البوّابة» في نموذج الفعاليّة (٢٠٢٦-١١-١٥) */
  previewTools?: ReactNode;
  children: ReactNode;
}) {
  const crumb = useFormCrumb(path, title);
  return (
    <AdRoom label={title}>
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
      <div className="ad-form">
        <div className="ad-form-main">{children}</div>
        <aside className="ad-form-side">
          <div className="ad-form-commit" data-commit-home>
            <CommitButtons commit={commit} />
          </div>
          {preview ? (
            <div className="ad-form-preview">
              <AdGroupTitle icon={previewLabel?.icon ?? <Eye />}>{previewLabel?.label ?? "كما ستظهر"}</AdGroupTitle>
              {previewTools}
              {/* التذكرةُ عرضٌ لا أداة: لا تُنقر ولا يقف عليها التركيز (الحقولُ هي ما يُكتب فيه) */}
              <div className="ad-form-ticket" inert>{preview}</div>
            </div>
          ) : null}
        </aside>
        <FloatCommit commit={commit} />
      </div>
    </AdRoom>
  );
}

/** الأساسيُّ أوّلًا، ثمّ الثانويّ (حفظ كمسوّدة)، ثمّ «إلغاء» إلى الغرفة — والثانيان صندوقان بلا ختم: يمتدّان بعرض عمودهما، والمربّعُ في زرٍّ
 *  ممتدٍّ «نقطةٌ منحرفة» (`DESIGN.md` §٣). و«إلغاء» رجوعٌ لا فعل، كإلغاء النافذة. */
/** مختبرُ حقل الرفع يعرض نماذجَ حقيقيّة (`useAdLab().dry`): أفعالُها تقول إنّها لا تُنفَّذ */
function useDry(commit: FormCommitSpec): FormCommitSpec {
  const { dry } = useAdLab();
  const toast = useToast();
  if (!dry) return commit;
  const no = () => toast.info("مختبر: لا يُحفظ شيءٌ من هنا.");
  return { ...commit, primary: { ...commit.primary, onClick: no }, secondary: commit.secondary ? { ...commit.secondary, onClick: no } : undefined };
}

export function CommitButtons({ commit: raw }: { commit: FormCommitSpec }) {
  const commit = useDry(raw);
  const { primary: p, secondary: s, cancelHref } = commit;
  const busy = !!(p.busy || s?.busy);
  return (
    <>
      <AdButton variant="fill" icon={p.icon} onClick={p.onClick} busy={p.busy} held={p.held || s?.busy}>{p.label}</AdButton>
      {s ? <AdButton plain variant="line" onClick={s.onClick} busy={s.busy} held={s.held || p.busy}>{s.label}</AdButton> : null}
      {busy ? <AdButton plain variant="line" onClick={() => {}} held>إلغاء</AdButton> : <AdButton plain variant="line" href={cancelHref}>إلغاء</AdButton>}
    </>
  );
}

/**
 * **الفعلُ يلحقك في الضيّق**: في الجوّال زرُّ الحفظ آخرَ الصفحة، فمن عدّل حقلًا في أعلاها نزل إليها ليحفظ. فحين يكون في النموذج ما لم يُحفظ يطفو
 * فوق جزيرة التنقّل قطعةٌ بيضاءُ فيها الفعلُ الأساسيّ وجارُه، **ويغيب حين يبلغ المرءُ مكانَ الأفعال** فلا يرى الزرَّ مرّتين. وفي العريض لا يُرسم.
 * لا يأخذ مكانًا في الصفحة (هامشٌ سالبٌ بقدره)، فلا يقفز شيءٌ حين يظهر.
 */
export function FloatCommit({ commit: raw }: { commit: FormCommitSpec }) {
  const commit = useDry(raw);
  const me = useRef<HTMLDivElement>(null);
  const [home, setHome] = useState(false);
  useEffect(() => {
    const el = me.current?.closest(".ad-form")?.querySelector("[data-commit-home]");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setHome(e.isIntersecting), { root: el.closest(".ash-content"), threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const on = !!commit.dirty && !home;
  const { primary: p, secondary: s, cancelHref } = commit;
  return (
    <div ref={me} className="ad-form-float" data-on={on || undefined} aria-hidden={!on || undefined} inert={!on || undefined}>
      <div className="ad-form-float-bar">
        <AdButton variant="fill" icon={p.icon} onClick={p.onClick} busy={p.busy} held={p.held || s?.busy}>{p.label}</AdButton>
        {s ? <AdButton plain variant="line" onClick={s.onClick} busy={s.busy} held={s.held || p.busy}>{s.label}</AdButton>
          : <AdButton plain variant="line" href={cancelHref}>إلغاء</AdButton>}
      </div>
    </div>
  );
}

/**
 * القسم: قسمُ «حسابي» نفسُه، وجسمُه حقولُه. و`act` بابُ القسم كلِّه في طرف رأسه (مبدّلُ «بفترات/مرنة»).
 * و`mark` علامةُ الحقل حين يكون القسمُ حقلًا واحدًا (صورةُ الغلاف): القسمُ إطارُه، فلا بئرَ داخله (محمد: «الكونتينر داخل كونتينر ثاني»).
 */
export function FormSection({ id, icon, title, sub, act, mark, children }: {
  id?: string; icon: ReactNode; title: string; sub?: string; act?: ReactNode; mark?: "required" | "optional"; children: ReactNode;
}) {
  // **موضعان يملؤهما الحقلُ حين يكون هو القسم** (حقلُ الرفع، محمد ٢٠٢٦-١١-١٣): أفعالُه في طرف الرأس، ووصفُه تحت القسم لا داخله
  const [head, setHead] = useState<HTMLElement | null>(null);
  const [under, setUnder] = useState<HTMLElement | null>(null);
  return (
    <SectionSlots.Provider value={{ head, under }}>
    <section className="ad-sec ad-fsec" id={id}>
      <header className="ad-sec-head">
        <span className="ad-sec-ic" aria-hidden>{icon}</span>
        <span className="ad-sec-t">
          <h2>{title}{mark ? <FieldMark required={mark === "required"} optional={mark === "optional"} /> : null}</h2>
          {sub ? <p>{sub}</p> : null}
        </span>
        {act ? <div className="ad-fsec-act">{act}</div> : null}
        <div className="ad-fsec-act" data-slot="" ref={setHead} />
      </header>
      <div className="ad-fsec-body">{children}</div>
    </section>
    <div className="ad-fsec-under" ref={setUnder} />
    </SectionSlots.Provider>
  );
}

/** اختيارٌ بين بابين في رأس القسم («بفترات» و«مرنة»): المبدّلُ نفسُه (`.ad-switch`) بلا أعداد. */
export function FormChoice({ label, items, value, onChange, disabled }: {
  label: string; items: { value: string; label: string }[]; value: string; onChange: (v: string) => void;
  /** يُمسَك ساعةَ الحفظ: لا يتبدّل النموذجُ تحت الدوّارة (كان `KindPicker` القديم يُمسَك) */
  disabled?: boolean;
}) {
  return (
    <div className="ad-switch ad-fchoice" role="group" aria-label={label}>
      {items.map((it) => (
        <button key={it.value} type="button" className="ad-switch-seg" aria-pressed={it.value === value} disabled={disabled} onClick={() => onChange(it.value)}>
          <span className="ad-switch-l">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

/** سطرُ حالٍ تحت مجموعة حقول (تقسيمُ المقاعد) — بلغة وصف الحقل وموضعِه، والخطأُ بلونه. */
export function FormHint({ tone, children }: { tone?: "bad"; children: ReactNode }) {
  // `status` لا `alert`: الجملةُ تتبدّل مع كلّ رقمٍ يُكتب، والتنبيهُ يقاطع القارئَ الآليّ عند كلّ حرف
  return <p className="ad-fhint form-full" data-tone={tone} role="status">{children}</p>;
}

/**
 * **المفتاحُ في بئر** («يقولها ديبو»، «إظهار + بعد الرقم»): بئرُ الحقل (ب) بمربّع رمزه، والجملةُ قيمتُه ووصفُها تحتها، والمفتاحُ في طرفه —
 * مفتاحُ «حسابي» نفسُه (`.ad-toggle-sw`: المُشغَّلُ قطعةٌ من اللوح). والبئرُ كلُّه يقلبه.
 */
export function FormToggle({ icon, label, description, checked, onChange, className }: {
  icon: ReactNode; label: string; description?: string; checked: boolean; onChange: (on: boolean) => void; className?: string;
}) {
  return (
    <label className={`ad-ftoggle${className ? ` ${className}` : ""}`}>
      <span className="ad-ftoggle-ic" aria-hidden>{icon}</span>
      <span className="ad-ftoggle-t">
        <b>{label}</b>
        {description ? <span>{description}</span> : null}
      </span>
      <input type="checkbox" role="switch" className="ad-toggle-in" checked={checked}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)} />
      <span className="ad-toggle-sw" aria-hidden><span /></span>
    </label>
  );
}

/**
 * **حقلٌ بجانب الحقول** (شعارُ الراعي، محمد ٢٠٢٦-١١-٠٧: «القسمُ المخصّص للشعار فقط في مكان والباقي كلُّه فارغ»): المربّعُ في أوّل القسم
 * والحقولُ بجانبه — كصورة الملفّ بجانب بياناته — فلا قسمَ لمربّعٍ وحده. وفي الضيّق المربّعُ فوقها.
 */
export function FormWith({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    // الغلافُ حاويةُ القياس: الحاويةُ لا تسأل عن نفسها، فيُسأل عن عرض القسم الذي هي فيه لا عن الغرفة (عمودُ النموذج يضيق والغرفةُ عريضة)
    <div className="ad-fwith-box">
      <div className="ad-fwith">
        <div className="ad-fwith-aside">{aside}</div>
        <div className="ad-fwith-main">{children}</div>
      </div>
    </div>
  );
}

/**
 * **عنصرٌ متكرّر** (فترةُ الفرصة): لوحٌ مصبوغٌ داخل القسم، والحقولُ عليه بيضاء (الأداةُ خطوةٌ عن أرضها)، ورأسُه رقمُه في مربّعٍ من اللوح
 * واسمُه، و«حذف» في طرفه صندوقَ الخطر.
 */
export function FormRepeatItem({ n, label, onRemove, children }: { n: number; label: string; onRemove?: () => void; children: ReactNode }) {
  return (
    <div className="ad-frep" role="group" aria-label={`${label} ${n}`}>
      <div className="ad-frep-head">
        <span className="ad-frep-n ad-num" aria-hidden>{n}</span>
        <b>{label}</b>
        {onRemove ? <span className="ad-frep-del"><AdButton variant="danger" size="sm" icon={<Trash />} onClick={onRemove}>حذف</AdButton></span> : null}
      </div>
      <div className="ad-frep-fields">{children}</div>
    </div>
  );
}

/**
 * **حقلُ الصورة** في النماذج: حقلُ الرفع المعتمد (`AdUpload`، ٢٠٢٦-١١-١٣) — منطقةُ إفلاتٍ متقطّعةُ الحدّ وهو فارغ، والصورةُ وحدها
 * وهو ممتلئ. كان قبله لوحًا كحليًّا كبيرًا للفارغ (`plate`) أو صندوقًا مختومًا (`stamp`)، ورُفضا.
 */
export function AdImageField({ label, icon, required, value, onFile, onClear, busy, shape = "wide", help, error, accept, alt, bare }: {
  label: string;
  icon: ReactNode;
  /** الإلزاميُّ بنجمته، وما سواه «(اختياريّ)» كسائر الحقول (`FieldMark`) — العلامةُ ثابتةٌ في الهويّة */
  required?: boolean;
  value: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  busy?: boolean;
  shape?: "wide" | "square";
  help?: string;
  error?: string;
  /** الصيغُ المقبولة من قانون المرفقات (`UPLOAD_RULES.*.accept`) */
  accept: string;
  alt: string;
  /** **الحقلُ هو القسم** (صورةُ الغلاف وصورةُ العمل): التسميةُ وعلامتُها عنوانُ القسم (`FormSection mark`)، والصورةُ جسمُه */
  bare?: boolean;
}) {
  const { dry } = useAdLab();
  return <AdUpload label={label} icon={icon} required={required} value={value} onFile={onFile} onClear={onClear} busy={busy}
    shape={shape} help={help} error={error} accept={accept} alt={alt} bare={bare} dry={dry} />;
}
