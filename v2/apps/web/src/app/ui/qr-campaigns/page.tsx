"use client";

import { Container } from "@adeeb/design-system";
import { ToastProvider } from "../../dashboard/_components/ToastProvider";
import { CampaignsView } from "../../dashboard/tools/qr/campaigns/CampaignsView";
import { CampaignRoomView } from "../../dashboard/tools/qr/campaigns/[id]/CampaignRoomView";
import type { QrCampaignRow } from "../../dashboard/tools/qr/campaigns/data";
import type { QrLinkRow } from "../../dashboard/tools/qr/data";
import { sampleQrLink } from "../_qr/sample";

/**
 * **الحملةُ حاويةُ باركودات** — بابا الغرفة بمكوّنيهما الحيّين.
 *
 * عُرضت هنا ثلاثةُ أشكالٍ يوم ٢٠٢٦-٠٩-٢٤ (مجموعاتٌ في جدول، وغرفةٌ للحملة، وعمودٌ
 * ومرشِّح)، فاختار المالك **غرفةَ الحملة** وأمر بإسقاط الباقي. فأُعدم الشكلان كما تقتضي
 * القاعدة، وبقي هذا معرضَ ما نُفِّذ: الشاشتان الحقيقيّتان بصفوفٍ مصنوعة.
 *
 * والأفعالُ معطَّلةُ الأثر: الكتابةُ لا تبلغ قاعدةً (الأفعالُ الخادميّة تُردّ بلا جلسة).
 * الغرضُ **النظرُ** لا التشغيل.
 */

const iso = (d: number) => new Date(Date.UTC(2026, 8, d)).toISOString();

const link = (i: number, title: string, scans: number, active = true): QrLinkRow =>
  sampleQrLink({
    id: `demo-${i}`,
    code: `demo${i}xy`,
    title,
    targetUrl: "https://adeeb.club/x",
    active,
    scanCount: scans,
    campaignId: "c1",
    campaignName: "معرض اليوم الوطنيّ",
    createdAt: iso(2 + i),
    updatedAt: iso(20),
  });

/** ستّةُ ملصقاتٍ في ستّة مواضع، مرتَّبةً بالمسحات كما تردّها القراءةُ الحقيقيّة. */
const LINKS: QrLinkRow[] = [
  link(1, "ملصق بوّابة المعرض الرئيسيّة", 412),
  link(2, "منشور إنستغرام المثبّت", 301),
  link(3, "طاولة التسجيل عند المدخل", 260),
  link(4, "لوحة الإعلانات في بهو كلّيّة الآداب", 138),
  link(5, "شاشة القاعة الكبرى بين الفقرات", 74),
  link(6, "ظهر بطاقة الزائر", 46, false),
];

const SUM = LINKS.reduce((n, r) => n + r.scanCount, 0);

/** وحاويةٌ فارغةٌ بينها: حالٌ صحيحةٌ لا نقص، وهي أوّلُ ما يقع لمن أنشأ حملةً الآن. */
const CAMPAIGNS: QrCampaignRow[] = [
  { id: "c1", name: "معرض اليوم الوطنيّ", note: "ستّةُ مواضعَ في المعرض", ownerId: "demo-owner", createdAt: iso(1), links: LINKS.length, scans: SUM, topTitle: LINKS[0].title, access: "owner" },
  // **وحاويةٌ شُورِكتَ فيها** (م٢٠): تُقرأ ولا تُعاد تسميتُها، ووسمُها في خانة الاسم.
  { id: "c2", name: "عضويّة أدِيب", note: "بابُ الانضمام في ثلاثة مواضع", ownerId: "other", createdAt: iso(4), links: 3, scans: 275, topTitle: "رابط البايو في إنستغرام", access: "edit" },
  { id: "c3", name: "إذاعة أدِيب، الموسم الثاني", note: "لم تُوضَع فيها ملصقاتُها بعد", ownerId: "demo-owner", createdAt: iso(18), links: 0, scans: 0, topTitle: null, access: "owner" },
];

/** شريكان في الحاوية الأولى: واحدٌ يحرّر وآخرُ يقرأ. */
const SHARES = [
  { userId: "u1", name: "سارة القحطاني", access: "edit" as const },
  { userId: "u2", name: "فهد العتيبي", access: "read" as const },
];

const CANDIDATES = [
  { id: "u3", name: "نورة الدوسري" },
  { id: "u4", name: "عبدالله الشمري" },
];

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="mb-3 font-display text-2xl font-black text-content">{title}</h2>
      {children}
    </section>
  );
}

export default function QrCampaignsGallery() {
  return (
    <ToastProvider>
      <main className="py-16">
        <Container>
          <p className="font-latin text-xs font-bold uppercase tracking-[0.22em] text-secondary">Dashboard, QR Campaigns</p>
          <h1 className="mt-1 font-display text-3xl font-black text-content md:text-4xl">الحملةُ حاويةُ باركودات</h1>
          <p className="mt-2 max-w-[74ch] text-sm leading-7 text-content-muted">
            بابان في غرفة الباركود: قائمةُ الحملات، وغرفةُ حملةٍ بعينها. والغرفةُ تجيب
            سؤالين: كم مسحةً للحملة كلِّها، وأيُّ موضعٍ نجح. والأفعالُ هنا بلا أثرٍ في قاعدة.
          </p>

          <Sec title="بابُ الحملات">
            <CampaignsView rows={CAMPAIGNS} error={null} />
          </Sec>

          <Sec title="غرفةُ حملةٍ بعينها">
            <CampaignRoomView
              campaign={CAMPAIGNS[0]}
              links={LINKS}
              shares={SHARES}
              candidates={CANDIDATES}
              campaigns={CAMPAIGNS.map((c) => ({ id: c.id, name: c.name }))}
            />
          </Sec>

          <Sec title="والغرفةُ كما يراها شريكٌ يحرّر">
            {/* البنيةُ للمالك: لا «باركود جديد» ولا تعديلَ ولا حذفَ ولا إخراجَ من الحملة،
                وشارةُ الحال تقول منزلتَه، ولوحُ الشركاء يُقرأ ولا يُدار. */}
            <CampaignRoomView campaign={{ ...CAMPAIGNS[0], access: "edit" }} links={LINKS} shares={SHARES} />
          </Sec>

          <Sec title="وحاويةٌ لم تُملأ بعد">
            <CampaignRoomView campaign={CAMPAIGNS[2]} links={[]} />
          </Sec>
        </Container>
      </main>
    </ToastProvider>
  );
}
