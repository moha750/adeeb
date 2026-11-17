"use client";

/**
 * غرفةُ «شهاداتي» على قالب «الحساب» (٢٠٢٦-١١-٠٤) — السلوكُ سلوكُ `dashboard/_portal/CertificatesRoom.tsx` المعتمد: شهاداتُه كلُّها
 * بنوعيها (التطوّع والخبرة)، والورقةُ الحقيقيّةُ تُرسَم من لقطتها (`draw`)، وتُنزَّل PDF وصورة، ويُنسخ رابطُ التحقّق برقمها، وكلمةُ المشرف
 * كما طُبعت. وبلا شهادة: للمتطوّع «تطوّعي»، وللصديق دعوةٌ إلى التطوّع، وللعضو أنّ شهادةَ خبرته من الموارد البشريّة.
 *
 * والفرقُ في الشكل: **كلُّ شهادةٍ تذكرةُ ورقتها** (`AdCard.paper`، محمد ٢٠٢٦-١١-٠٤: تذكرةُ الكعب المقصوص «الأضعف») — الورقةُ كاملةً
 * بنسبتها رأسَ التذكرة، ثمّ شارتاها (نوعُها و«بتميّز») وعنوانُها وسطورُها، ورقمُها المرجعيّ رقمُ الكرت، وأفعالُها كشهادات الإدارة.
 * والنوعان مجموعتان بعنوان المجموعة الواحد (`AdGroupTitle`)، و«افتح الشهادة» نافذةٌ بالورقة كبيرة.
 */
import { useEffect, useState } from "react";
import { Button, Modal } from "@adeeb/design-system";
import { Briefcase, CalendarDots, Certificate as CertIcon, Clock, Copy, FilePdf, HandHeart, Hash, Quotes, SealCheck, Sparkle } from "@phosphor-icons/react";
import { CaretLeft, DownloadSimple, Eye } from "@/app/_components/glyphs";
import { verifyUrl } from "@/lib/certificates/text";
import { useToast } from "@/app/dashboard/_components/ToastProvider";
import { draw, download } from "@/app/dashboard/_portal/CertificatesRoom";
import type { CertKind, PortalCert } from "@/app/dashboard/_portal/certificates";
import { counted } from "@/app/dashboard/_portal/time";
import { AdActs, AdBadge, AdCard, AdGroupTitle, AdNote, type AdFigure, type AdMeta } from "../primitives";
import { AccountRoom, AdLine, AdSection } from "../account";
import { fmtDayFull } from "../format";

const KINDS: { kind: CertKind; label: string; badge: string; icon: React.ReactNode }[] = [
  { kind: "vol", label: "التطوّع", badge: "شهادة تطوّع", icon: <HandHeart /> },
  { kind: "exp", label: "الخبرة", badge: "شهادة خبرة", icon: <Briefcase /> },
];

/** صورةُ الورقة غلافًا: تُرسَم مرّةً لكلّ رقم (والنافذةُ تقرأ الصورةَ نفسَها)، وقبل وصولها قماشُ الكعب. */
function useShot(paper: PortalCert["paper"]) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    draw(paper).then((u) => { if (alive) setSrc(u); }, () => { /* يبقى القماش، والتنزيلُ يقول خطأه */ });
    return () => { alive = false; };
  }, [paper]);
  return src;
}

function Ticket({ c, onOpen, onGet, onCopy, busy }: {
  c: PortalCert; onOpen: () => void; onGet: (as: "png" | "pdf") => void; onCopy: () => void; busy: string | null;
}) {
  const shot = useShot(c.paper);
  const kind = KINDS.find((k) => k.kind === c.kind)!;
  const meta: AdMeta[] = [
    ...(c.issuedOn ? [{ icon: <SealCheck />, text: `صدرت في ${fmtDayFull(`${c.issuedOn}T12:00:00`)}` }] : []),
    ...(c.kind === "vol" && c.hours ? [{ icon: <Clock />, text: counted(c.hours, "ساعةُ تطوّعٍ واحدة", "ساعتا تطوّع", "ساعات تطوّع", "ساعة تطوّع") }] : []),
    ...(c.kind === "exp" ? [{ icon: <CalendarDots />, text: c.date }] : []),
    ...(c.quote ? [{ icon: <Quotes />, text: `«${c.quote}»`, clip: true }] : []),
  ];
  const figures: AdFigure[] = [{ icon: <Hash />, value: c.serial, label: "الرقم المرجعيّ", ltr: true }];
  return (
    <AdCard
      seed={c.id}
      paper
      cover={shot}
      chips={<><AdBadge icon={kind.icon}>{kind.badge}</AdBadge>{c.star ? <AdBadge icon={<Sparkle />}>بتميّز</AdBadge> : null}</>}
      title={c.title}
      onOpen={onOpen}
      meta={meta}
      figures={figures}
      foot={
        <AdActs
          primary={{ label: "تنزيل PDF", icon: <FilePdf />, busy: busy === `${c.id}-pdf`, onClick: () => onGet("pdf") }}
          ops={[
            { key: "open", label: "افتح الشهادة", icon: <Eye />, onClick: onOpen },
            { key: "png", label: "تنزيل صورة", icon: <DownloadSimple />, disabled: busy !== null, onClick: () => onGet("png") },
            { key: "copy", label: "نسخ رابط التحقّق", icon: <Copy />, onClick: onCopy },
          ]}
        />
      }
    />
  );
}

/** الورقةُ كبيرةً في نافذتها — من الرسم نفسِه الذي في الغلاف. */
function Paper({ c }: { c: PortalCert }) {
  const shot = useShot(c.paper);
  // eslint-disable-next-line @next/next/no-img-element -- صورةٌ يرسمها المتصفّح (رابطُ blob)، لا ملفٌّ يُحسَّن
  return shot ? <img className="ad-cert-paper" src={shot} alt={`شهادة ${c.title}`} /> : <span className="ad-cert-paper" aria-hidden />;
}

export function MyCertificatesRoom({ certs, volunteer, member, error }: { certs: PortalCert[]; volunteer: boolean; member: boolean; error: string | null }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const cur = openId ? certs.find((c) => c.id === openId) ?? null : null;

  const get = async (c: PortalCert, as: "png" | "pdf") => {
    if (busy) return;
    setBusy(`${c.id}-${as}`);
    try {
      await download(c.paper, as);
      toast.success("نُزّلت الشهادة.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الشهادة.");
    } finally {
      setBusy(null);
    }
  };
  const copy = async (c: PortalCert) => {
    try {
      await navigator.clipboard.writeText(verifyUrl(c.serial));
      toast.success("نُسخ رابطُ التحقّق.");
    } catch {
      toast.error("تعذّر النسخ. انسخ الرقم يدويًّا.");
    }
  };

  if (!certs.length) {
    return (
      <AccountRoom navPath="/dashboard/certificates" title="شهاداتي">
        {error ? <AdNote tone="bad">{error}</AdNote> : null}
        {/* لكلٍّ ما يُصدر له: المتطوّعُ شهادةَ مشاركة، والعضوُ شهادةَ خبرة، وصديقُ أدِيب يُدعى إلى التطوّع */}
        <AdSection icon={<CertIcon />} title="لا شهادةَ لك بعد"
          sub={member ? "تصدر شهادةُ خبرتك من الموارد البشريّة، وتجدها هنا" : volunteer ? "تصدر شهادةُ المشاركة بعد كلّ فرصةٍ تحضرها، وتجدها هنا" : "شهاداتُ أدِيب تصدر لمن يتطوّع فيه ولأعضاء لجانه"}>
          {member ? null : volunteer
            ? <AdLine icon={<HandHeart />} k="تطوّعي" v="الفرصُ المفتوحة الآن" act={{ icon: <CaretLeft />, text: "فتح", label: "الفرص المفتوحة" }} href="/dashboard/volunteer" />
            : <AdLine icon={<HandHeart />} k="التطوّع" v="انضمّ إلى متطوّعي أدِيب" act={{ icon: <CaretLeft />, text: "انضمّ", label: "الانضمام إلى المتطوّعين" }} href="/join" />}
        </AdSection>
      </AccountRoom>
    );
  }

  const groups = KINDS.map((k) => ({ ...k, items: certs.filter((c) => c.kind === k.kind) })).filter((g) => g.items.length);
  const grid = (items: PortalCert[]) => (
    <div className="ad-grid">
      {items.map((c) => (
        <Ticket key={c.id} c={c} busy={busy} onOpen={() => setOpenId(c.id)} onGet={(as) => void get(c, as)} onCopy={() => void copy(c)} />
      ))}
    </div>
  );

  return (
    <AccountRoom navPath="/dashboard/certificates" title="شهاداتي">
      {error ? <AdNote tone="bad">{error}</AdNote> : null}
      {/* النوعان مجموعتان بعنوانهما حين يجتمعان؛ ونوعٌ واحدٌ شبكةٌ بلا عنوان (الغرفةُ نفسُها عنوانُه) */}
      {groups.length > 1
        ? groups.map((g) => (
            <section key={g.kind} className="ad-acc-group">
              <AdGroupTitle icon={g.icon}>{g.label}</AdGroupTitle>
              {grid(g.items)}
            </section>
          ))
        : grid(certs)}

      <Modal
        open={!!cur}
        onClose={() => setOpenId(null)}
        size="lg"
        title={cur?.title ?? ""}
        description={cur ? cur.meta.join("، ") : undefined}
        footer={cur ? (
          <>
            <Button variant="primary" size="md" loading={busy === `${cur.id}-pdf`} disabled={busy !== null && busy !== `${cur.id}-pdf`} onClick={() => void get(cur, "pdf")}>
              <FilePdf aria-hidden /> تنزيل PDF
            </Button>
            <Button variant="ghost" size="md" loading={busy === `${cur.id}-png`} disabled={busy !== null && busy !== `${cur.id}-png`} onClick={() => void get(cur, "png")}>
              <DownloadSimple aria-hidden /> تنزيل صورة
            </Button>
            <Button variant="ghost" size="md" onClick={() => void copy(cur)}><Copy aria-hidden /> نسخ رابط التحقّق</Button>
          </>
        ) : null}
      >
        {cur ? <Paper c={cur} /> : null}
      </Modal>
    </AccountRoom>
  );
}
