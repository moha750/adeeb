// تبويب «سِجلّ ترشُّحي» لترشّحٍ واحد — ثلاثةُ أقسام، بتنفيذٍ مصمَّم (لا بطاقاتٍ عاديّة):
//   ١) هيرو المعلومات: تدرّجُ الهوية ونقشُها + ميداليّةُ رقمٍ زجاجيّة (#) + منصبٌ بخطّ Lyon + حالةٌ زجاجيّة.
//   ٢) بيانُ ترشُّحك وملفُّه والتحكّم: عرضٌ كامل، وتعديلٌ/سحبٌ ما دام مُتاحًا.
//   ٣) رحلةُ ترشُّحك: الخطّ الزمنيّ كاملًا.
// متجاوبٌ بالكامل (flex-wrap + auto-fit، بلا عرضٍ ثابتٍ يفيض).
"use client";

import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, FileButton } from "@adeeb/design-system";
import { FileArrowDown, FileDashed, Note, Paperclip, Path } from "@phosphor-icons/react";
import { PencilSimple, Prohibit } from "@/app/_components/glyphs";
import { useToast } from "../../_components/ToastProvider";
import { useElectionApi } from "../actions-context";
import { JourneyBody } from "./JourneyBody";
import { toneVars } from "../journeyTone";
import type { CandidacyJourney as CJ } from "../member-data";

/** `cycle` اسمُ الدورة — مرساةُ الزمن، وبها يفترق ترشّحان لمنصبٍ واحدٍ في دورتين. */
export function CandidacyJourney({ c, cycle, onEdit, onWithdraw }: { c: CJ; cycle?: string; onEdit: () => void; onWithdraw: () => void }) {
  const toast = useToast();
  const api = useElectionApi();
  const showControls = c.canEdit || c.canWithdraw;

  // الملفُّ ملكُ صاحبه في دلو election-files، ويُفتح بمنفذ `openFile` الواحد (تبويبٌ في اللمسة ثمّ توقيع)
  const openFile = async () => {
    if (!c.fileUrl) return;
    if (!(await api.openFile(c.fileUrl))) toast.error("تعذّر فتح الملفّ، أعِد المحاولة.");
  };

  return (
    <section className="cjr" style={toneVars(c.statusTone)}>
      {/* ١ — هيرو المعلومات */}
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
              <FileButton block state="empty" icon={<FileDashed />} label="لا ملف انتخابي مرفوق" hint="بيانُك وحده ما يراه الناخبون" />
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
