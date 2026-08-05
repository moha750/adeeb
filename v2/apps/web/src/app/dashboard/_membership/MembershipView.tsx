"use client";

// عميليّ لا خادميّ — **لا لتفاعلٍ فيه** بل لأنّ أيقونات Phosphor تُنشئ `createContext` عند
// تحميل الوحدة، وذلك ممنوعٌ في مكوّنٍ خادميّ. فالصفحة الخادميّة تجلب البيانات وحدها وتمرّرها،
// كما تفعل `EventsView` و`MembersView` — لا أيقونةَ تُستورَد في `page.tsx`.

import { useState } from "react";
import { Alert, Badge, Button, Card, CardBody, CardHeader } from "@adeeb/design-system";
import {
  Binoculars, Certificate as CertificateIcon, FilePdf, Path, ShieldWarning, Signpost,
} from "@phosphor-icons/react";
import { DownloadSimple } from "@/app/_components/glyphs";
import { EmptyState } from "../_components/EmptyState";
import { useToast } from "../_components/ToastProvider";
import { categoryLabel, dots, remainingText, warningTitle } from "@/lib/warnings/vocab";
import { downloadCertificate, downloadCertificatePdf } from "@/lib/certificates/letter";
import { certDate } from "@/lib/certificates/text";
import { Journey } from "./Journey";
import { MembershipCard } from "./MembershipCard";
import type { Membership } from "./data";

/**
 * طبقتان: **بطاقة العضويّة** (من أنت الآن)، ثمّ **مسيرتك** (كيف وصلت). ولا ثالثة تسرد
 * بياناتِ السجلّ — من أرادها فمكانُها ملفُّ العضو عند الإدارة، لا تُكرَّر هنا.
 */
export function MembershipView({ membership: m }: { membership: Membership }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  /** الورقة تُرسَم من **لقطتها** لا من حال صاحبها اليوم — فما نزّله أوّل مرّةٍ هو ما ينزّله الآن. */
  const download = async (c: Membership["certificates"][number], as: "png" | "pdf") => {
    setBusy(c.id);
    try {
      const paper = {
        name: c.holderName,
        position: c.positionTitle,
        gender: m.gender,
        from: c.periodFrom,
        to: c.periodTo,
        serial: c.serial,
      };
      await (as === "pdf" ? downloadCertificatePdf(paper) : downloadCertificate(paper));
      toast.success("نُزّلت الشهادة.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر توليد الشهادة.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mpage">
      <MembershipCard
        name={m.name}
        role={m.role}
        status={m.status}
        avatar={m.avatar}
        gender={m.gender}
        chain={m.chain}
        joined={m.joined}
        duration={m.duration}
      />

      {/* الإشراف تكليفٌ لا منصب — فله سطرُه، ولا يُحشر في السلسلة ولا في المسيرة. */}
      {m.supervising.length ? (
        <Card>
          <CardHeader
            variant="soft"
            icon={<Binoculars />}
            title="لجانٌ تشرف عليها"
            subtitle="تكليفٌ من إدارتك — يدور ويتبدّل، ولا يجعلك عضوًا فيها"
          />
          <CardBody>
            <div className="chip-row">
              {/* الفولاذيّ في الشارة اسمُه `info` — لا `brand` (تلك نغمة الكرت والإحصائيّة) */}
              {m.supervising.map((c) => <Badge key={c} tone="info" variant="soft">{c}</Badge>)}
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* إنذاراتي — لا تظهر إلّا لمن عليه إنذارٌ سارٍ. والشفافيّة قرارُ المالك: يرى السبب كما كُتب،
          فلا يبقى يسأل «كم عليّ؟» — والعاقبةُ مقولةٌ صراحةً قبل أن تقع. */}
      {m.warnings.length ? (
        <Card>
          <CardHeader
            variant="soft"
            icon={<ShieldWarning />}
            title="إنذاراتي"
            subtitle={`${dots(m.warnings.length, m.warningLimit)} · ${remainingText(m.warnings.length, m.warningLimit)}`}
          />
          <CardBody>
            {m.warnings.map((w) => (
              <Alert
                key={w.id}
                tone={w.ordinal >= m.warningLimit ? "danger" : "warning"}
                title={`${warningTitle(w.ordinal)} · ${categoryLabel(w.category)} · ${w.date}`}
              >
                {w.reason}
              </Alert>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {/* شهاداتي — يُنزّلها صاحبُها متى شاء بلا مراجعة أحد. وكلُّ ورقةٍ تُرسَم من **لقطتها**
          يومَ صدرت، فلا تتبدّل بتبدّل منصبه بعدها. */}
      {m.certificates.length ? (
        <Card>
          <CardHeader
            variant="soft"
            icon={<CertificateIcon />}
            title="شهاداتي"
            subtitle="شهادات الخبرة الصادرة لك — نزّلها متى احتجتها"
          />
          <CardBody>
            {m.certificates.map((c) => (
              <Alert key={c.id} tone="success" title={`${c.positionTitle} · ${c.serial}`}>
                {/* `viewbar` من المكتبة: صفٌّ يتباعد طرفاه ويلتفّ في الضيّق — ولا سطر CSS جديد */}
                <div className="viewbar">
                  <span>من {certDate(c.periodFrom)} إلى {certDate(c.periodTo)} — صدرت في {c.date}</span>
                  <span className="chip-row">
                    <Button variant="ghost" size="sm" loading={busy === c.id} onClick={() => void download(c, "pdf")}>
                      <FilePdf aria-hidden /> PDF
                    </Button>
                    <Button variant="ghost" size="sm" loading={busy === c.id} onClick={() => void download(c, "png")}>
                      <DownloadSimple aria-hidden /> صورة
                    </Button>
                  </span>
                </div>
              </Alert>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader variant="soft" icon={<Path />} title="مسيرتي في أديب" subtitle="انضمامك وما تلاه من مناصب" />
        <CardBody>
          {m.journey.length ? (
            <Journey stops={m.journey} />
          ) : (
            <EmptyState
              icon={<Signpost />}
              title="لا محطّات بعد"
              description="لم يُسجَّل لك تاريخ انضمامٍ ولا تعيينٌ في منصب."
            />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
