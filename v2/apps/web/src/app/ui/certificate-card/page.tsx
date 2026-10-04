"use client";

import { useState } from "react";
import { Container, Segmented } from "@adeeb/design-system";
import { CertificateCard } from "../../dashboard/volunteering/certificates/CertificateCard";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import type { IssuedCertRow } from "../../dashboard/volunteering/data";

/**
 * **معرضُ كرت شهادة المتطوّع — معرضُ المُقَرّ.** أقرّ المالكُ «الختم» ٢٠٢٦-١٠-٠١ من هيئتين وُضعتا هنا جنبًا
 * إلى جنب، وأُعدمت «الورقة» بأصنافها. والعيّنةُ على أحوال السجلّ لا على الحقول: ساريةٌ عاديّة، وساريةٌ صحّح
 * صاحبُها اسمَه بعد الإصدار (فتُرسَم بالمصحَّح) وطال عنوانُ فرصتها وبلا لجنة، ومُبطَلتان: بسببٍ قصيرٍ وبسببٍ طويل (يُقرأ في نافذة «تفاصيل الإبطال»).
 * والأسماءُ مختلَقة.
 */
const SAMPLE: IssuedCertRow[] = [
  {
    id: "c1", userId: "u1", oppId: "o1", name: "ريم عبدالله الدوسري", avatar: null, gender: "female",
    serial: "ADEEB-VOL-2026-0012-7F3A9C", holderName: "ريم عبدالله الدوسري", paperName: "ريم عبدالله الدوسري",
    opportunity: "منظّمة لمعرض اليوم الوطني", committee: "لجنة الفعاليّات",
    servedFrom: "2026-09-28", servedTo: "2026-09-29", served: "",
    issuedBy: "نورة سعد القحطاني", issuedAt: "1 أكتوبر 2026",
    status: "active", revokedBy: null, revokedAt: null, revokeReason: null, hours: 12, distinction: null,
  },
  {
    id: "c2", userId: "u2", oppId: "o2", name: "عبدالرحمن بن عبدالعزيز آل الشيخ", avatar: null, gender: "male",
    serial: "ADEEB-VOL-2026-0013-B41E07", holderName: "عبدالرحمن بن عبدالعزيز ال الشيخ", paperName: "عبدالرحمن بن عبدالعزيز آل الشيخ",
    opportunity: "مصوّرٌ فوتوغرافيٌّ لتغطية أمسية الشعر في مسرح الجامعة الكبير", committee: null,
    servedFrom: "2026-10-01", servedTo: "2026-10-01", served: "",
    issuedBy: "نورة سعد القحطاني", issuedAt: "1 أكتوبر 2026",
    status: "active", revokedBy: null, revokedAt: null, revokeReason: null, hours: 12, distinction: null,
  },
  {
    id: "c3", userId: "u3", oppId: "o1", name: "سارة خالد العتيبي", avatar: null, gender: "female",
    serial: "ADEEB-VOL-2026-0009-5CD2E1", holderName: "سارة خالد العتيبي", paperName: "سارة خالد العتيبي",
    opportunity: "سفيرة لمعرض اليوم الوطني", committee: "لجنة العلاقات العامّة",
    servedFrom: "2026-09-30", servedTo: "2026-10-01", served: "",
    issuedBy: "نورة سعد القحطاني", issuedAt: "30 سبتمبر 2026",
    status: "revoked", revokedBy: "فهد ناصر الشمري", revokedAt: "1 أكتوبر 2026",
    revokeReason: "صدرت باسم فرصةٍ غير التي شاركت فيها", hours: 12, distinction: null,
  },
  {
    id: "c4", userId: "u4", oppId: "o3", name: "يوسف ماجد الحربي", avatar: null, gender: "male",
    serial: "ADEEB-VOL-2026-0007-A90F3B", holderName: "يوسف ماجد الحربي", paperName: "يوسف ماجد الحربي",
    opportunity: "منظّم لورشة الكتابة الإبداعيّة", committee: "لجنة الأدب",
    servedFrom: "2026-09-14", servedTo: "2026-09-14", served: "",
    issuedBy: "نورة سعد القحطاني", issuedAt: "15 سبتمبر 2026",
    status: "revoked", revokedBy: "فهد ناصر الشمري", revokedAt: "20 سبتمبر 2026",
    revokeReason: "صدرت قبل أن يُراجَع سجلُّ الحضور، ثمّ تبيّن أنّه غادر الورشة بعد ساعتها الأولى ولم يُكمل المهامّ المسندة إليه، فحُجبت بعد مراجعة قائد اللجنة", hours: 4, distinction: null,
  },
];

const noop = () => {};

export default function CertificateCardPage() {
  const [width, setWidth] = useState<"desk" | "phone">("desk");
  const grid = (
    <div className="card-grid card-grid-2col">
      {SAMPLE.map((c) => <CertificateCard key={c.id} c={c} onDownload={noop} onRecord={noop} onRevoke={noop} />)}
    </div>
  );

  // نافذةُ «تفاصيل الإبطال» تعرض خلايا العرض (`Cell`)، وهي تطلب مزوّدَ الإشعارات كما في اللوحة
  return (
    <ToastProvider>
    <main className="py-16">
      <Container>
        <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Design System, Certificate Card</p>
        <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">كرت شهادة المتطوّع</h1>
        <p className="mt-2 max-w-2xl text-content-muted">
          «الختم»: كرتُ «السجلّ» في شهادات المتطوّعين. رأسٌ بتدرّج الهويّة ونقشِها وحالُه لافتةٌ زجاجيّة، ثمّ حقائقُ مثنّاةٌ
          برقاقات أيقونات، ورقمُ التحقّق ختمٌ في سطرٍ كامل، والتنزيلُ زرّان في الذيل، والمُبطَلةُ تقول سببَها في ذيلها.
        </p>

        <div className="mt-8">
          <p className="mb-3 font-latin text-xs font-bold uppercase tracking-[0.18em] text-content-muted">العرض</p>
          <Segmented items={[{ value: "desk", label: "الحاسوب" }, { value: "phone", label: "الجوّال" }]} value={width} onValueChange={(v) => setWidth(v as "desk" | "phone")} />
        </div>

        <div className="mt-8">
          {width === "phone" ? <div className="cvlab">{grid}</div> : grid}
        </div>
      </Container>
    </main>
    </ToastProvider>
  );
}
