"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Container, Modal, Segmented } from "@adeeb/design-system";
import { DeviceMobile } from "@phosphor-icons/react";
import { PwaContent } from "@/app/_pwa/PwaContent";
import { usePwa, type Pwa, type PwaStage } from "@/app/_pwa/usePwa";

/**
 * **مختبرُ «أَدِيب على جوّالك»: التثبيتُ والإشعارات** (٢٠٢٦-١٠-٠٣).
 *
 * المنطقُ حيٌّ لا رسم: «جهازك» يقرأ هذا الجهازَ فعلًا، فيُفعِّل ويُرسل إشعارًا تجريبيًّا حقيقيًّا.
 * وبقيّةُ المراحل معاينةٌ بأفعالٍ صامتة كي تُرى كلُّها من حاسوب.
 *
 * وكان السؤالُ للمالك سؤالَ وعاءٍ لا محتوى: المحتوى واحدٌ (`PwaContent`)، والخياران في أين
 * يلقاه صاحبُ الحساب ومتى. **فاعتمدهما معًا** (٢٠٢٦-١٠-٠٣): النافذةُ «ب» تستقبل مرّةً على
 * الجوّال (`PwaIntro`)، والبطاقةُ «أ» بيتٌ دائمٌ في الحساب والإعدادات (`PwaCard`). فبقيت هذه
 * الصفحةُ معرضًا لهما بكلّ مراحلهما.
 */

const VIEWS = [
  { value: "live", label: "جهازك" },
  { value: "ios-install", label: "آيفون قبل التثبيت" },
  { value: "ready", label: "جاهزٌ للتفعيل" },
  { value: "on", label: "مفعّلة" },
  { value: "denied", label: "محجوبة" },
  { value: "ios-update", label: "نظامٌ قديم" },
];

const noop = () => {};

function preview(stage: PwaStage, platform: Pwa["platform"]): Pwa {
  return {
    stage,
    platform: platform ?? "ios",
    canInstall: stage === "ready" && platform !== "ios",
    busy: null,
    note: null,
    enable: noop,
    disable: noop,
    test: noop,
    install: noop,
  };
}

export default function AppInstallLab() {
  const live = usePwa();
  const [view, setView] = useState("live");
  const [open, setOpen] = useState(false);
  const pwa = view === "live" ? live : preview(view as PwaStage, live.platform);

  return (
    <main className="py-16">
      <Container className="max-w-3xl">
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Install</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">أَدِيب على جوّالك</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          افتح هذه الصفحة من جوّالك: «جهازك» يقرأ جوّالك فعلًا، ومنه تفعّل الإشعارات وترسل إشعارًا تجريبيًّا
          يصل شاشةَ القفل. وبقيّةُ المراحل معاينةٌ لما يراه غيرُك.
        </p>

        {/* ستُّ مراحل لا يسعها عرضُ جوّال: الشريطُ يتمرّر وحدَه ولا يمدّ الصفحة. */}
        <div className="mt-8 max-w-full overflow-x-auto">
          <Segmented items={VIEWS} value={view} onValueChange={setView} aria-label="المرحلة المعروضة" />
        </div>

        <section className="mt-12">
          <h2 className="mb-2 font-display text-2xl font-black text-content">أ: البطاقة، بيتٌ دائم</h2>
          <p className="mb-4 max-w-2xl text-sm text-content-muted">
            في صفحة الحساب وإعدادات اللوحة. لا تقاطع أحدًا: يجدها من يبحث عنها، ومنها يُوقَف ويُجرَّب.
          </p>
          <Card>
            <CardHeader
              variant="soft"
              icon={<DeviceMobile />}
              title="أَدِيب على جوّالك"
              subtitle="تطبيقٌ على شاشتك الرئيسيّة، وإشعاراتٌ على شاشة القفل"
            />
            <CardBody>
              <div className="flex flex-col gap-4">
                <PwaContent pwa={pwa} />
              </div>
            </CardBody>
          </Card>
        </section>

        <section className="mt-14">
          <h2 className="mb-2 font-display text-2xl font-black text-content">ب: نافذةُ الاستقبال، مرّةً على الجوّال</h2>
          <p className="mb-4 max-w-2xl text-sm text-content-muted">
            تظهر وحدها أوّلَ مرّةٍ يدخل فيها من جوّال (قبل التثبيت لتعلّمه الخطوات، وبعده لتطلب الإذن)، ثمّ
            لا تعود إن أغلقها.
          </p>
          <Button variant="ghost" onClick={() => setOpen(true)}>
            <DeviceMobile /> افتح النافذة
          </Button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="أَدِيب على جوّالك"
            description="تطبيقٌ على شاشتك الرئيسيّة، وإشعاراتٌ على شاشة القفل"
            footer={
              <Button variant="ghost" onClick={() => setOpen(false)}>
                ليس الآن
              </Button>
            }
          >
            <PwaContent pwa={pwa} />
          </Modal>
        </section>
      </Container>
    </main>
  );
}
