// تبويب «سِجلّ ترشُّحي» لترشّحٍ واحد — ثلاثةُ أقسام، بتنفيذٍ مصمَّم (لا بطاقاتٍ عاديّة):
//   ١) هيرو المعلومات: تدرّجُ الهوية ونقشُها + ميداليّةُ رقمٍ زجاجيّة (#) + منصبٌ بخطّ Lyon + حالةٌ زجاجيّة.
//   ٢) بيانُ ترشُّحك وملفُّه والتحكّم: عرضٌ كامل، وتعديلٌ/سحبٌ ما دام مُتاحًا.
//   ٣) رحلةُ ترشُّحك: الخطّ الزمنيّ كاملًا.
// متجاوبٌ بالكامل (flex-wrap + auto-fit، بلا عرضٍ ثابتٍ يفيض).
"use client";

import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, FileButton } from "@adeeb/design-system";
import { CaretDown, CaretUp, Clock, FileArrowDown, FileDashed, FlagCheckered, Note, Paperclip, Path, PencilSimple, Prohibit, Scales, Trophy, XCircle } from "@phosphor-icons/react";
import { useToast } from "../../_components/ToastProvider";
import { createClient } from "@/lib/supabase/client";
import { JourneyBody } from "./JourneyBody";
import { toneVars } from "./journeyTone";
import type { CandidacyJourney as CJ } from "../member-data";

/** أيقونةُ المآل في الرأس المطويّ — الرسمُ يقول ما تقوله الشارة، فيُفهم قبل القراءة. */
const foldIcon = (c: CJ) =>
  c.statusLabel === "فائز" ? <Trophy /> :
  c.statusLabel === "مرفوض" ? <XCircle /> :
  c.statusLabel === "منسحب" ? <Prohibit /> :
  c.statusLabel === "لم يُوفَّق" ? <FlagCheckered /> :
  c.statusLabel === "يحتاج تعديلًا" ? <PencilSimple /> :
  c.statusLabel === "معتمَد" ? <Scales /> : <Clock />;

/**
 * `cycle` مرساةٌ زمنيّة اختياريّة (اسمُ الدورة) — من ترشّح للمنصب نفسِه مرّتين لا يفرّق بينهما بلا هذا.
 *
 * **`foldable` (معاينةٌ لم تُقَرّ) — رأسٌ واحدٌ بحالتين لا رأسان:** حين تكثر الترشّحات يصير
 * كلُّ ترشّحٍ صفًّا مطويًّا؛ ومتى فُتح **ترقّى الصفُّ نفسُه هيرو** (تدرّجُ الهوية ونقشُها
 * وميداليّةُ الرقم) وانفتح المحتوى تحته. فلا يزول المقبضُ من تحت اليد، ولا يتكرّر اسمُ المنصب
 * في رأسين. وزرُّ الطيّ يسكن الرأسَ في حالتيه (`.acard-hfull` مطويًّا · `.cjr-hero-fold` مفتوحًا).
 */
export function CandidacyJourney({ c, cycle, foldable, open = true, onToggle, onEdit, onWithdraw }: {
  c: CJ; cycle?: string;
  foldable?: boolean; open?: boolean; onToggle?: () => void;
  onEdit: () => void; onWithdraw: () => void;
}) {
  const toast = useToast();
  const showControls = c.canEdit || c.canWithdraw;
  const folded = !!foldable && !open;

  // فتحُ الملفّ المرفق برابطٍ موقَّعٍ مؤقّت (الملفّ ملكُ صاحبه في دلو election-files)
  const openFile = async () => {
    if (!c.fileUrl) return;
    try {
      const sb = createClient();
      const { data, error } = await sb.storage.from("election-files").createSignedUrl(c.fileUrl, 60);
      if (error || !data?.signedUrl) throw error ?? new Error("no url");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("تعذّر فتح الملفّ، أعِد المحاولة.");
    }
  };

  // زرُّ الطيّ — نصُّه وسهمُه يقولان الحال، و`aria-expanded` يقولها لقارئ الشاشة
  const foldBtn = (className: string, variant: "ghost" | "inverse-ghost") => (
    <Button
      className={className}
      variant={variant}
      size="sm"
      aria-expanded={!folded}
      onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
    >
      {folded ? <CaretDown aria-hidden /> : <CaretUp aria-hidden />}
      {folded ? "عرض الرحلة" : "طيُّ الرحلة"}
    </Button>
  );

  // مطويًّا: الصفُّ وحدَه (وصفٌ ثمّ زرٌّ ممتدّ) — والصفُّ كلُّه هدفُ نقر
  if (folded) {
    return (
      <Card interactive onClick={onToggle} style={toneVars(c.statusTone)}>
        <div className="acard-header acard-header-soft acard-header-stack">
          <span className="acard-chip">{foldIcon(c)}</span>
          <div className="acard-htexts">
            <h3 className="acard-htitle">{c.position}</h3>
            <span className="acard-hsub">{cycle ? `${cycle}، رقمك الانتخابي ${c.number}` : `رقمك الانتخابي ${c.number}`}</span>
          </div>
          <div className="acard-hactions"><Badge tone={c.statusTone} dot>{c.statusLabel}</Badge></div>
          {foldBtn("acard-hfull", "ghost")}
        </div>
      </Card>
    );
  }

  return (
    <section className="cjr" style={toneVars(c.statusTone)}>
      {/* ١ — هيرو المعلومات: هو الصفُّ نفسُه وقد ترقّى، وزرُّ الطيّ في ذيله */}
      <div className="cjr-hero">
        <div className="cjr-hero-top">
          <span className="cjr-medal"><span className="cjr-medal-cap">رقمك الانتخابي</span><b>#{c.number}</b></span>
          <div className="cjr-hero-main">
            <span className="cjr-hero-eyebrow">المنصب المتقدَّم له</span>
            <h2 className="cjr-hero-title">{c.position}</h2>
            {cycle ? <span className="cjr-hero-eyebrow">{cycle}</span> : null}
          </div>
          <div className="cjr-hero-status">
            <span className="cjr-hero-eyebrow">حالة ترشحك</span>
            <Badge variant="glass" dot>{c.statusLabel}</Badge>
          </div>
        </div>
        {foldable ? foldBtn("cjr-hero-fold", "inverse-ghost") : null}
      </div>

      {/* رسالةُ الحالة تنبيهًا بنغمتها (تحت الهيرو، عرضًا كاملًا) */}
      <Alert tone={c.statusTone}>{c.next}</Alert>

      {/* الجسم عمودان: يمينًا الرحلة (البطل الثاني)، ويسارًا البيانُ والملفُّ والتحكّم — يتكدّسان على الجوّال */}
      <div className="cjr-body">
        {/* الرحلة — يمين (أوّلُ الشبكة في RTL) */}
        <Card>
          <CardHeader variant="soft" icon={<Path />} title="رحلة ترشُّحك" subtitle="ما جرى على ترشّحك بالترتيب" />
          <CardBody><JourneyBody c={c} /></CardBody>
        </Card>

        {/* البيانُ والملفُّ والتحكّم — يسار */}
        <Card>
          <CardHeader variant="soft" icon={<Note />} title="بيان ترشُّحك وملفّه" subtitle="معمًّى بلا اسمك، هذا ما يراه الناخبون" />
          <CardBody>
            <p className="cjr-stmt">{c.statement}</p>
            {c.fileName ? (
              <FileButton block state="ready" icon={<Paperclip />} label={c.fileName} hint="اضغط لتنزيل ملفّك" trailing={<FileArrowDown />} onClick={openFile} />
            ) : (
              /* الفراغُ حالةٌ في المكوّن نفسِه لا نصٌّ شاردٌ بجانبه */
              <FileButton block state="empty" icon={<FileDashed />} label="لا ملفَّ مرفوق" hint="بيانُك وحده ما يراه الناخبون" />
            )}
          </CardBody>
          {showControls ? (
            <CardFooter className="cjr-foot">
              <div className="cjr-controls-btns">
                {c.canEdit ? <Button variant="primary" size="md" onClick={onEdit}><PencilSimple aria-hidden />تعديل الترشّح</Button> : null}
                {c.canWithdraw ? <Button variant="ghost" size="md" onClick={onWithdraw}><Prohibit aria-hidden />سحب الترشّح</Button> : null}
              </div>
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </section>
  );
}
