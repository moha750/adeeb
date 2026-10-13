"use client";

import { DownloadSimple, Star } from "@/app/_components/glyphs";
import { useEffect, useRef, useState } from "react";
import { Alert, Badge, Card, CardHeader, CarouselNav } from "@adeeb/design-system";
import {
  Briefcase, CalendarBlank, Certificate as CertIcon, Clock, Copy, FilePdf, HandHeart, Image as ImageIcon, Quotes, SealCheck,
} from "@phosphor-icons/react";
import { verifyUrl } from "@/lib/certificates/text";
import { useToast } from "../_components/ToastProvider";
import { CaretAct, Row, type Ico } from "./Row";
import type { CertKind, PortalCert } from "./certificates";
import { counted } from "./time";

/**
 * **غرفةُ «شهاداتي»** — المعتمَدةُ في المختبر («راضٍ كلَّ الرضا»، المالك ٢٠٢٦-١٠-١٣).
 * معرضٌ: القائمةُ كرتٌ معنونٌ واحد تقسمه عناوينُ الأنواع، والمختارةُ كرتٌ معلّقٌ فيه الورقةُ ثمّ سطورُها
 * (موثّقة برقمها ونسخُ رابطها، وكلمةُ المشرف، وتنزيلُها صورةً وPDF).
 * ونوعُ «حضور الفعاليّات» مخفيٌّ حتى يصل قالبُه (قرار المالك: «نفعلها» بقوالبَ جديدة).
 */

const GROUPS: { kind: CertKind; label: string; Icon: Ico; say: (items: PortalCert[]) => string }[] = [
  { kind: "vol", label: "التطوّع", Icon: HandHeart, say: (xs) => {
    const h = xs.reduce((n, c) => n + (c.hours ?? 0), 0);
    return h ? `مجموعُها ${counted(h, "ساعةُ تطوّعٍ واحدة", "ساعتا تطوّع", "ساعات تطوّع", "ساعة تطوّع")}` : "مشاركاتُك في فرص أدِيب";
  } },
  { kind: "exp", label: "الخبرة", Icon: Briefcase, say: () => "عملُك في لجان أدِيب" },
];

/** الورقةُ الحقيقيّة: تُرسَم مرّةً لكلّ رقم (المصغّرةُ والكبيرةُ صورةٌ واحدة)، وراسمُ الورق يُحمَّل عند الطلب. */
const drawn = new Map<string, Promise<string>>();
function draw(paper: PortalCert["paper"]): Promise<string> {
  const key = paper.c.serial;
  let p = drawn.get(key);
  if (!p) {
    p = (async () => {
      const blob = paper.as === "participation"
        ? await (await import("@/lib/certificates/participation")).renderParticipation(paper.c, "image/jpeg")
        : await (await import("@/lib/certificates/letter")).renderCertificate(paper.c, "image/jpeg");
      return URL.createObjectURL(blob);
    })();
    drawn.set(key, p);
  }
  return p;
}

function Shot({ paper, alt }: { paper: PortalCert["paper"]; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    draw(paper).then((u) => { if (alive) setSrc(u); }, () => { /* تبقى المساحةُ فارغة، والتنزيلُ يقول خطأه */ });
    return () => { alive = false; };
  }, [paper]);
  // eslint-disable-next-line @next/next/no-img-element -- صورةٌ مرسومةٌ في المتصفّح (blob) لا ملفٌّ يُحسَّن
  return src ? <img className="acr-shot" src={src} alt={alt} /> : <span className="acr-shot" aria-hidden />;
}

async function download(paper: PortalCert["paper"], as: "png" | "pdf") {
  if (paper.as === "participation") {
    const m = await import("@/lib/certificates/participation");
    await (as === "pdf" ? m.downloadParticipationPdf(paper.c) : m.downloadParticipation(paper.c));
  } else {
    const m = await import("@/lib/certificates/letter");
    await (as === "pdf" ? m.downloadCertificatePdf(paper.c) : m.downloadCertificate(paper.c));
  }
}

export function CertificatesRoom({ certs, volunteer, member, error }: { certs: PortalCert[]; volunteer: boolean; member: boolean; error: string | null }) {
  const toast = useToast();
  const [sel, setSel] = useState(certs[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const stage = useRef<HTMLElement>(null);

  if (!certs.length) {
    return (
      <div className="acc-main">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Card>
          {/* لكلٍّ ما يُصدر له: المتطوّعُ شهادةَ مشاركة، والعضوُ شهادةَ خبرة، وصديقُ أدِيب يُدعى إلى التطوّع */}
          <CardHeader variant="soft" icon={<CertIcon aria-hidden />} title="لا شهادةَ لك بعد"
            subtitle={member ? "تصدر شهادةُ خبرتك من الموارد البشريّة، وتجدها هنا" : volunteer ? "تصدر شهادةُ المشاركة بعد كلّ فرصةٍ تحضرها، وتجدها هنا" : "شهاداتُ أدِيب تصدر لمن يتطوّع فيه ولأعضاء لجانه"} />
          {member ? null : volunteer
            ? <Row Icon={HandHeart} k="تطوّعي" v="الفرصُ المفتوحة الآن" act={CaretAct("الفرص المفتوحة")} href="/dashboard/volunteer" />
            : <Row Icon={HandHeart} k="التطوّع" v="انضمّ إلى متطوّعي أدِيب" act={CaretAct("الانضمام إلى المتطوّعين", "انضمّ")} href="/join" />}
        </Card>
      </div>
    );
  }

  // ترتيبُ التصفّح بالسهمين هو ترتيبُ القائمة نفسُه (بالنوع)
  const ORDER = GROUPS.flatMap((g) => certs.filter((c) => c.kind === g.kind));
  const cur = ORDER.find((c) => c.id === sel) ?? ORDER[0];
  const at = ORDER.indexOf(cur);
  const step = (d: number) => { const n = ORDER[at + d]; if (n) setSel(n.id); };
  // على الجوّال المختارةُ فوق القائمة: من اختار من أسفلها يُرفَع إليها فيرى ما اختار
  const pick = (id: string) => {
    setSel(id);
    if (window.matchMedia("(max-width: 860px)").matches) stage.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const get = async (as: "png" | "pdf") => {
    setBusy(as);
    try {
      await download(cur.paper, as);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الشهادة.");
    } finally {
      setBusy(null);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl(cur.serial));
      toast.success("نُسخ رابطُ التحقّق.");
    } catch {
      toast.error("تعذّر النسخ. انسخ الرقم يدويًّا.");
    }
  };

  return (
    <>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="acr-room">
        <Card className="acr-list">
          <CardHeader variant="soft" icon={<CertIcon aria-hidden />} title="شهاداتك" subtitle={counted(certs.length, "شهادةٌ واحدة", "شهادتان", "شهادات", "شهادة")} />
          <nav aria-label="شهاداتك">
            {GROUPS.map((g) => {
              const items = certs.filter((c) => c.kind === g.kind);
              if (!items.length) return null;
              return (
                <div key={g.kind} className="acr-group">
                  <h3>
                    <span className="acr-gic" aria-hidden><g.Icon /></span>
                    <span className="acr-gtx">{g.label}<small>{g.say(items)}</small></span>
                    <em>{items.length}</em>
                  </h3>
                  {items.map((c) => (
                    <button key={c.id} type="button" className="acc-row acr-pick" aria-current={c.id === cur.id} onClick={() => pick(c.id)}>
                      <Shot paper={c.paper} alt="" />
                      <span className="acc-kv">
                        <span className="acr-title"><b>{c.title}</b>{c.star ? <Badge size="sm" tone="warning" icon={<Star />}>بتميّز</Badge> : null}</span>
                        <span className="acr-facts">
                          {c.hours ? <Badge size="sm" tone="info" icon={<Clock />}>{counted(c.hours, "ساعة", "ساعتان", "ساعات", "ساعة")}</Badge> : null}
                          <Badge size="sm" tone="info" icon={<CalendarBlank />}>{c.date}</Badge>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </Card>

        <section ref={stage} className="acr-stage" aria-live="polite">
          <Card>
            <CardHeader variant="soft" icon={<SealCheck aria-hidden />} title={cur.title} subtitle={cur.meta.join("، ")} />
            <div className="acr-easel">
              <Shot key={cur.id} paper={cur.paper} alt={`شهادة ${cur.title}`} />
              {ORDER.length > 1
                ? <CarouselNav onPrev={() => step(-1)} onNext={() => step(1)} prevDisabled={at === 0} nextDisabled={at === ORDER.length - 1} />
                : null}
            </div>
            <Row Icon={SealCheck} k="موثّقة برقمها" v={cur.serial} ltr tone="ok" sub="من يفتح رابطها يتحقّق منها"
              act={{ Icon: Copy, label: "نسخ رابط التحقّق", text: "نسخ" }} onClick={copy} />
            {cur.quote ? <Row Icon={Quotes} k="كلمةُ المشرف" v={`«${cur.quote}»`} sub="كما طُبعت في شهادتك" /> : null}
            <Row Icon={ImageIcon} k="صورة" v="بجودة الطباعة" sub="للمشاركة في حساباتك"
              act={{ Icon: DownloadSimple, label: "تنزيلها صورة", text: busy === "png" ? "يُجهَّز…" : "تنزيل" }} disabled={busy !== null} onClick={() => get("png")} />
            <Row Icon={FilePdf} k="PDF" v="للطباعة والإرسال"
              act={{ Icon: DownloadSimple, label: "تنزيلها PDF", text: busy === "pdf" ? "يُجهَّز…" : "تنزيل" }} disabled={busy !== null} onClick={() => get("pdf")} />
          </Card>
        </section>
      </div>
    </>
  );
}
