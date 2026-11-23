"use client";

/**
 * **معاينتا الأوراق** على الهويّة الجديدة (٢٠٢٦-١١-١٤): «نموذج شهادة الخبرة» و«نموذج الخطاب» (الإنذار). السلوكُ سلوكُ
 * `members/certificates/preview` و`members/warnings/preview` حرفًا: عيّناتٌ **متخيَّلة** تُرسَم في المتصفّح بالرسّام نفسِه الذي يعمل
 * عند الإصدار (`renderCertificate`، `renderWarningLetter`)، فما يُرى هو ما يُنزَّل؛ والخطابُ بمبدّل رتبته (الأوّل والثاني يقولان ما بقي،
 * والثالث يُعلن سحب العضويّة) ونصِّ رسالة واتساب تحته.
 *
 * والشكلُ **المعرض** (`AdCols asideFirst`): العيّناتُ سطورٌ في الجانب قبلُ، والمختارةُ ورقتُها في العمود العريض — كانت كروتًا متراصّة
 * بأوراقها كلّها (ثلاثُ شهاداتٍ عرضيّة، أو سبعةُ خطاباتٍ في عمودين) تحت رأس الصفحة القديم. والخطابُ طوليٌّ لكنّه لا يجلس في الجانب
 * كبطاقة عِرفان: بطاقةُ عِرفان خطُّها كبير، والخطابُ نصٌّ رسميٌّ كثيف لا يُقرأ بعرض ٢٨٠ بكسلًا (المراجع ٢٠٢٦-١١-١٤).
 */
import { useEffect, useRef, useState } from "react";
import { Certificate as CertIcon, IdentificationCard, WhatsappLogo } from "@phosphor-icons/react";
import { CaretLeft, DownloadSimple, Warning } from "@/app/_components/glyphs";
import { downloadCertificate, renderCertificate } from "@/lib/certificates/letter";
import type { Certificate } from "@/lib/certificates/text";
import { WARNING_CATEGORIES, warningTitle } from "@/lib/warnings/vocab";
import { renderWarningLetter } from "@/lib/warnings/letter";
import { warningWhatsappMessage, type WarningLetter } from "@/lib/warnings/message";
import { AdNote, AdSwitch, type AdPosition } from "../primitives";
import { AccountRoom, AdCols, AdLine, AdSection } from "../account";

/** الورقةُ صورةً بنسبتها، وقبل أن تُرسَم مكانُها بنسبتها نفسِها فلا يقفز ما تحتها */
function Paper({ src, shape, alt }: { src?: string; shape: "land" | "port"; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مولَّدةٌ في المتصفّح (blob) لا أصلٌ ثابت
  return src ? <img className="ad-paper-shot" data-shape={shape} src={src} alt={alt} /> : <span className="ad-paper-shot" data-shape={shape} role="img" aria-label="تُرسَم الورقة…" aria-busy />;
}

/**
 * يرسم كلَّ عيّنةٍ مرّةً ويحفظ روابطها، ويُطلقها حين تتبدّل الرتبةُ أو تُغلق الغرفة. والحلقةُ القديمةُ **تتوقّف** حين يُعاد الرسم
 * (المراجع ٢٠٢٦-١١-١٤): كانت تُكمل رسمَ ما بقي بعد التبديل، فكلُّ رابطٍ تصنعه بعد الإطلاق لا يُطلَق أبدًا — والقديمتان فيهما العيبُ نفسُه.
 */
function useShots<K extends string>(keys: K[], draw: (k: K) => Promise<Blob>, dep: unknown) {
  // الحالُ موسومةٌ بالرتبة التي رُسمت لها (`of`): فإذا تبدّلت الرتبةُ صار ما رُسم لغيرها كأن لم يكن — بلا مسحٍ داخل الأثر —
  // وخطأُ رتبةٍ لا يبقى على أخرى رُسمت سليمة (المراجع ٢٠٢٦-١١-١٤)
  type St = { of: unknown; shots: Partial<Record<K, string>>; error: string | null };
  const [st, setSt] = useState<St>({ of: dep, shots: {}, error: null });
  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    (async () => {
      try {
        for (const k of keys) {
          const blob = await draw(k);
          if (!alive) return;
          const url = URL.createObjectURL(blob);
          urls.push(url);
          setSt((s) => ({ of: dep, shots: { ...(s.of === dep ? s.shots : {}), [k]: url }, error: null }));
        }
      } catch (e) {
        const error = e instanceof Error ? e.message : "تعذّر رسم النموذج.";
        if (alive) setSt((s) => ({ of: dep, shots: s.of === dep ? s.shots : {}, error }));
      }
    })();
    return () => { alive = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
    // الرسمُ يتبع `dep` وحده (رتبةُ الخطاب)؛ والعيّناتُ ثابتة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dep]);
  return st.of === dep ? st : { shots: {} as Partial<Record<K, string>>, error: null };
}

/** في الضيّق تنزل الورقةُ تحت السطور، فالاختيارُ يأخذك إليها (كعِرفان) */
function useStage() {
  const stage = useRef<HTMLDivElement>(null);
  const go = () => { if (window.matchMedia("(max-width: 860px)").matches) stage.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  return { stage, go };
}

/* ═══ شهادةُ الخبرة ═══ */

/** ثلاثُ عيّناتٍ متخيَّلة تكشف ما يختلف فعلًا: أنثى بمسمًّى مؤنَّث، وذكرٌ بمسمًّى تامٍّ لا تُلحق به وحدة، ومسمًّى طويلٌ يمتحن الضغط */
const CERTS: { key: string; label: string; note: string; c: Certificate }[] = [
  { key: "f", label: "أنثى، قائدة لجنة", note: "المسمّى يُؤنَّث بجنس صاحبته كالضمائر (توحيد المسمّيات 2026-11-23)",
    c: { name: "سارة فاروق الحداد", position: "قائدة لجنة السفراء والتصوير", gender: "female", serial: "ADEEB-EXP-2026-0000-A1B2C3", from: "2024-10-17", to: "2025-08-29" } },
  { key: "m", label: "ذكر، مشرف", note: "المسمّى التامّ يُقال وحده: لا تُلحق به إدارتُه ولا لجانُه",
    c: { name: "عبدالله أحمد باجعيفر", position: "مشرف الموارد البشرية", gender: "male", serial: "ADEEB-EXP-2026-0000-D4E5F6", from: "2026-01-30", to: "2026-08-02" } },
  { key: "long", label: "امتحانُ الطول", note: "اسمٌ رباعيّ ومسمًّى طويل، يُضغط المقاس ولا يطفح على الزخرفة",
    c: { name: "عبدالرحمن عبدالعزيز محمد القحطاني", position: "منسّق قسم الإنتاج الإعلامي وقائد لجنة التقارير والأرشفة تكليفًا", gender: "male", serial: "ADEEB-EXP-2026-0000-7A8B9C", from: "2025-10-28", to: "2026-08-02" } },
];

export function CertificatePreviewRoom() {
  const [pick, setPick] = useState(CERTS[0].key);
  const [busy, setBusy] = useState(false);
  const { stage, go } = useStage();
  const { shots, error } = useShots(CERTS.map((s) => s.key), (k) => renderCertificate(CERTS.find((s) => s.key === k)!.c), null);
  const cur = CERTS.find((s) => s.key === pick)!;
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try { await downloadCertificate(cur.c); } finally { setBusy(false); }
  };
  return (
    <AccountRoom navPath="/dashboard/members/certificates" title="نموذج شهادة الخبرة">
      {/* نصُّ تنبيه الصفحة القديمة كما هو: هو ما يطمئنّ إليه صاحبُ القالب */}
      <AdNote tone="info" title="ما تراه هو ما يُنزَّل">
        كلّ ورقةٍ هنا مولَّدةٌ على قالبك بالرسّام الذي سيعمل عند الإصدار، والأسماء والأرقام المرجعيّة متخيَّلة (لا تُعرَف في صفحة التحقّق).
        والنصّ نصُّ ورقتك حرفًا بحرف، ومذكَّرُه مشتقٌّ منه. والمواضع مقيسةٌ على بكسلات القالب: الاسم يجلس فوق المسطرة، والفترة والدعاء فوق المسطرة الثانية.
      </AdNote>
      {error ? <AdNote tone="bad" title="تعذّر عرض النموذج">{error}</AdNote> : null}
      <AdCols asideFirst sticky aside={
        <AdSection icon={<CertIcon />} title="العيّنات" sub="ثلاثٌ تكشف ما يختلف فعلًا">
          {CERTS.map((s) => (
            <AdLine key={s.key} icon={<IdentificationCard />} v={s.label} current={s.key === pick}
              act={{ icon: <CaretLeft />, text: "عرض", label: "عرض" }} onClick={() => { setPick(s.key); go(); }} />
          ))}
        </AdSection>
      }>
        <div ref={stage} className="ad-paper-stage">
          <AdSection icon={<CertIcon />} title={cur.label} sub={cur.note}
            media={error ? undefined : <Paper src={shots[cur.key]} shape="land" alt={`شهادة خبرة، ${cur.label}`} />}>
            <AdLine icon={<DownloadSimple />} k="العيّنة" v="احفظها صورة" disabled={busy}
              act={{ icon: <DownloadSimple />, text: "تنزيل", label: "تنزيل" }} onClick={() => void save()} />
          </AdSection>
        </div>
      </AdCols>
    </AccountRoom>
  );
}

/* ═══ خطابُ الإنذار ═══ */

/** عيّنةٌ ثابتة — اسمٌ متخيَّل لا عضوٌ حقيقيّ، والسببُ يُكتب كما يكتبه المُصدِر في النافذة */
const SAMPLE = { name: "سارة الفيصل", gender: "female" as const, role: "قائد", committee: "لجنة التصميم", issuedAt: "2026-08-02T09:00:00Z", limit: 3 };
const REASON: Record<string, string> = {
  absence: "الغياب عن اجتماعَي اللجنة الأخيرين دون إشعار",
  lateness: "التأخّر عن موعد تسليم أعمال الحملة ثلاث مرّات",
  task_neglect: "لم تُسلَّم المهامّ المتّفق عليها رغم تذكيرين",
  unresponsive: "عدم الردّ على رسائل قائد اللجنة أسبوعين",
  conduct: "أسلوبٌ غير لائق في نقاش مجموعة العمل",
  policy: "استخدام هوية النادي في منشورٍ خارج قنواته الرسميّة",
  other: "الانسحاب من تنظيم الفعاليّة قبل موعدها بيوم",
};
const letterOf = (category: string, ordinal: number): WarningLetter => ({ ...SAMPLE, ordinal, activeCount: ordinal, category, reason: REASON[category] ?? "" });

export function WarningPreviewRoom() {
  const [ordinal, setOrdinal] = useState(1);
  const [pick, setPick] = useState<string>(WARNING_CATEGORIES[0].value);
  const { stage, go } = useStage();
  const { shots, error } = useShots(WARNING_CATEGORIES.map((c) => c.value), (k) => renderWarningLetter(letterOf(k, ordinal)), ordinal);
  const cur = WARNING_CATEGORIES.find((c) => c.value === pick) ?? WARNING_CATEGORIES[0];
  const ranks: AdPosition[] = [1, 2, 3].map((n) => ({ key: String(n), label: warningTitle(n) }));
  const what = ordinal >= 3 ? "بالغُ الحدّ: يُعلن سحب العضويّة" : `${warningTitle(ordinal)}: يقول ما بقي`;
  return (
    <AccountRoom navPath="/dashboard/members/warnings" title="نموذج الخطاب"
      head={<AdSwitch label="رتبة الإنذار" positions={ranks} position={String(ordinal)} onPosition={(k) => setOrdinal(Number(k))} />}>
      <AdNote tone="info" title="ما تراه هو ما يُنزَّل">
        كلّ ورقةٍ هنا مولَّدةٌ بالرسّام نفسه الذي يعمل عند الإصدار، على قالبك، والاسم والسبب عيّنةٌ متخيَّلة. ونصُّ الورقة هو نصّ رسالة واتساب حرفًا بحرف.
      </AdNote>
      {error ? <AdNote tone="bad" title="تعذّر عرض النموذج">{error}</AdNote> : null}
      <AdCols asideFirst sticky aside={
        <AdSection icon={<Warning />} title="التصنيفات" sub="سبعةٌ، لكلٍّ سببُه المتخيَّل">
          {WARNING_CATEGORIES.map((c) => (
            <AdLine key={c.value} icon={<Warning />} v={c.label} current={c.value === pick}
              act={{ icon: <CaretLeft />, text: "عرض", label: "عرض" }} onClick={() => { setPick(c.value); go(); }} />
          ))}
        </AdSection>
      }>
        <div ref={stage} className="ad-paper-stage">
          <AdSection icon={<Warning />} title={`${cur.label}، ${warningTitle(ordinal)}`} sub={what}
            media={error ? undefined : <Paper src={shots[cur.value]} shape="port" alt={`خطاب إنذار، ${cur.label}، ${warningTitle(ordinal)}`} />}>
            {/* نصُّ الورقة هو نصُّ رسالة واتساب حرفًا بحرف: يُقرأ هنا كما يصل */}
            <AdLine icon={<WhatsappLogo />} k="رسالة واتساب" v={warningWhatsappMessage(letterOf(cur.value, ordinal))} read />
          </AdSection>
        </div>
      </AdCols>
    </AccountRoom>
  );
}
