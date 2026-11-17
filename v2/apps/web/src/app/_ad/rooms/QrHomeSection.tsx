"use client";

/**
 * **بيتُ الباركود** (محمد ٢٠٢٦-١١-١٦: «حمّلها كصورة، ثمّ ماذا؟ أين يذهب؟… تجربةُ المستخدم تحتاج إعادة نظر»): كان الباركودُ الواحدُ مفرَّقًا
 * على ثلاث صفحات (الإحصاء، والإعدادات، والتصميم) ولا واحدةَ منها بيتُه، والتصميمُ ينتهي بزرّ تحميلٍ لا خطوةَ بعده. فصارت صفحتُه (صفحةُ
 * السجلّ بتذكرته وإحصائه) بيتَه، وأوّلُ ما فيها **الباركودُ نفسُه وما يُفعل به**: يُرى بشكله، ويُحمَّل للطباعة أو للمصمّم، ويُنسخ رابطُه،
 * وتُفتح وجهتُه، ويُعدَّل شكلُه. وإليها ينتهي الإنشاء («جاهز») والتصميمُ («تمّ»).
 *
 * و«افتح وجهته» تفتح الوجهةَ نفسَها لا رابطَ الباركود: فتحُ `/q/…` يُعَدّ مسحةً، فتجربتُه من هنا تُفسد عدَّه.
 */
import { useMemo, useState } from "react";
import { ArrowSquareOut, Check } from "@/app/_components/glyphs";
import { FileSvg, ImageSquare, LinkSimple, Palette, QrCode } from "@phosphor-icons/react";
import { qrPng, qrSvg, qrSvgBlob } from "@/lib/qr";
import { qrShortUrl, targetHost } from "@/lib/qrLinks";
import { downloadBlob } from "@/lib/download";
import { qrBacking } from "@/lib/qrBacking";
import { copyText } from "@/lib/clipboard";
import type { QrLinkRow } from "@/app/dashboard/tools/qr/data";
import { AdNote } from "../primitives";
import { AdLine } from "../account";

const SIDE = 360;

export function QrHomeSection({ link, canEdit, ready, designHref }: { link: QrLinkRow; canEdit: boolean; ready?: boolean; designHref?: string }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<"png" | "svg" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const short = qrShortUrl(link.code);
  const svg = useMemo(() => {
    if (!link.spec) return null;
    try { return qrSvg({ ...link.spec, size: SIDE }); } catch { return null; }
  }, [link.spec]);
  const target = link.kind === "file" ? link.fileUrl : link.targetUrl;

  const png = async () => {
    if (!link.spec) return;
    setBusy("png"); setErr(null);
    try { downloadBlob(await qrPng(link.spec), `${link.title}.png`, "qr.png"); }
    catch { setErr("تعذّر رسمُ الصورة. جرّب مرّةً أخرى، وإن تكرّر فأزِل الشعار من التصميم ثمّ أعِد المحاولة."); }
    setBusy(null);
  };
  const svgFile = () => {
    if (!link.spec) return;
    setErr(null);
    try { downloadBlob(qrSvgBlob(link.spec), `${link.title}.svg`, "qr.svg"); }
    catch { setErr("تعذّر إخراجُ الملفّ. جرّب مرّةً أخرى."); }
  };
  const copy = async () => {
    await copyText(short);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };
  const design = designHref ?? `/dashboard/tools/qr/${link.id}/design`;

  return (
    <>
      {ready ? (
        <AdNote tone="ok" title="باركودك جاهز" live>
          حمّله للطباعة، أو انسخ رابطه وأرسله لمن يصمّم. وجرّبه بمسحه من جوّالك قبل أن تطبعه.
        </AdNote>
      ) : null}
      {link.active ? null : (
        <AdNote tone="warn" title="الباركود موقوف">من يمسحه الآن يرى صفحةً تقول إنّه غير متاح. تشغيلُه من الإعدادات.</AdNote>
      )}
      {/* **الباركودُ بجانب ما يُفعل به** لا فوقه في وسط فراغ (قاعدةُ «لا كرتَ وبقيّتُه فراغ»): في العريض عمودان، وفي الضيّق الباركودُ ثمّ السطور */}
      <section className="ad-sec ad-qrh">
        <header className="ad-sec-head">
          <span className="ad-sec-ic" aria-hidden><QrCode /></span>
          <span className="ad-sec-t"><h2>الباركود</h2><p>كما يُطبع، وما تفعله به</p></span>
        </header>
        <div className="ad-qrh-body">
          {svg ? (
            <div className="ad-qrh-shot" data-back={qrBacking(link.spec)} role="img" aria-label={`باركود ${link.title}`} dangerouslySetInnerHTML={{ __html: svg }} />
          ) : (
            <div className="ad-qrh-none"><AdNote tone="info" title="لم يُصمَّم بعد">صمّمه فيُرى هنا ويُحمَّل.</AdNote></div>
          )}
          <ul className="ad-lines">
        <AdLine icon={<ImageSquare />} k="للطباعة والنشر" v="صورة عالية الجودة" act={{ text: busy === "png" ? "يُرسم…" : "نزّلها", label: "نزّل صورة الباركود", icon: <ImageSquare /> }}
          onClick={() => void png()} disabled={!svg || busy !== null} />
        <AdLine icon={<FileSvg />} k="للمصمّم" v="ملفّ بصيغة مفتوحة للتعديل" act={{ text: "نزّله", label: "نزّل ملفّ الباركود المفتوح", icon: <FileSvg /> }} onClick={svgFile} disabled={!svg} />
        <AdLine icon={<LinkSimple />} k="رابطه القصير" v={short.replace(/^https?:\/\//, "")} ltr
          act={{ text: copied ? "نُسخ" : "انسخ", label: "انسخ رابط الباركود", icon: copied ? <Check /> : <LinkSimple /> }} onClick={() => void copy()} />
        {target ? (
          <AdLine icon={<ArrowSquareOut />} k="وجهته" v={link.kind === "file" ? "الملفّ الذي يفتحه" : targetHost(link.targetUrl)} ltr={link.kind !== "file"}
            act={{ text: "افتحها", label: "افتح وجهة الباركود", icon: <ArrowSquareOut /> }} href={target} external />
        ) : null}
        {canEdit ? <AdLine icon={<Palette />} k="شكله" v="اللون والشعار والإطار" act={{ text: "عدّل الشكل", label: "عدّل شكل الباركود", icon: <Palette /> }} href={design} /> : null}
          </ul>
        </div>
      </section>
      {err ? <AdNote tone="bad" title="تعذّر التحميل">{err}</AdNote> : null}
    </>
  );
}
