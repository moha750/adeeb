"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Field, SectionCard } from "@adeeb/design-system";
import { Globe, LinkSimple, QrCode, TextAa } from "@phosphor-icons/react";
import { ArrowLeft } from "@/app/_components/glyphs";
import { QR_TITLE_MAX, checkTarget, qrShortUrl } from "@/lib/qrLinks";
import { PageHeader } from "../../../_components/PageHeader";
import { createQrLink } from "../actions";
import { defaultQrSpec } from "../defaults";

/**
 * **الخطوةُ الأولى: اسمٌ ورابط** (قرارُ المالك ٢٠٢٦-٠٨-٢٢).
 *
 * كان المحرّرُ هو ما يستقبلك، والاسمُ والرابطُ حقلين فيه بين الألوان والأشكال. فانقسم
 * البابُ خطوتين: **البيانات ثمّ الشكل**. وليست ترتيبًا أجمل وحسب، بل هي ما يجعل المعاينةَ
 * صادقة:
 *
 * الرمزُ القصيرُ يُولَد هنا، فيدخل المصمِّمُ على **رمزٍ حيٍّ يُمسح فيعمل**، وعددُ وحداته هو
 * عددُ وحدات المطبوع لا يزيد ولا ينقص مهما طالت الوجهة. وقبل هذا كانت المعاينةُ إمّا رمزًا
 * نائبًا لا وجهةَ له، وإمّا رمزًا يحمل الوجهةَ نفسَها فيكثُف بطولها ثمّ يتبدّل عند الحفظ.
 *
 * **والصفُّ يُنشأ هنا قبل أن يُصمَّم**: من كتب اسمًا ورابطًا ثمّ انصرف خلّف رمزًا بهيئته
 * الأولى في «رموزي»، يُحذف بيده كأيّ رمز.
 */
export function NewQrView() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = target.trim();
  // الحَكَمُ نفسُه الذي يحرس الخادم، فلا رسالتان لعيبٍ واحد
  const link = trimmed ? checkTarget(trimmed) : null;
  const linkError = link && !link.ok ? link.message : null;
  const ready = !!title.trim() && !!link?.ok;

  const start = async () => {
    if (!link?.ok) return;
    setBusy(true);
    setError(null);
    // الوصفةُ الأولى هيئةُ الهويّة، ونصُّها يكتبه الخادمُ رابطًا قصيرًا بعد توليد الرمز
    const res = await createQrLink({ title, target: link.url, spec: defaultQrSpec(qrShortUrl("")) });
    if (res.ok && res.id) {
      router.push(`/dashboard/tools/qr/${res.id}/design`);
      return;
    }
    setBusy(false);
    setError(res.message);
  };

  return (
    <>
      <PageHeader title="باركود جديد" crumbLeaf="باركود جديد" />

      <div className="card-grid mt-4">
        <SectionCard headerVariant="soft" icon={<QrCode />} title="اسمُ الباركود ووجهتُه">
          <Field
            label="اسم الباركود"
            icon={<TextAa />}
            innerIcon={<QrCode />}
            placeholder="اكتب اسم الباركود"
            value={title}
            onChange={(e) => { setTitle(e.target.value.slice(0, QR_TITLE_MAX)); setError(null); }}
            helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
            required
          />

          <div className="mt-4">
            <Field
              label="وجهة الباركود"
              icon={<LinkSimple />}
              innerIcon={<Globe />}
              placeholder="https://adeeb.club"
              dir="ltr"
              value={target}
              onChange={(e) => { setTarget(e.target.value); setError(null); }}
              error={linkError ?? undefined}
              helper="انسخ الرابط وألصقه هنا كاملًا."
              required
            />
          </div>

          {error ? (
            <div className="mt-4">
              <Alert tone="danger" title="تعذّر إنشاء الباركود">{error}</Alert>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" size="md" disabled={!ready} loading={busy} onClick={() => void start()}>
              ابدأ بتصميم الباركود <ArrowLeft size={18} />
            </Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
