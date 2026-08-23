"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AreaChart, BarList, Badge, Button, Field, Modal, SectionCard, Stat, type BarItem } from "@adeeb/design-system";
import { ChartLineUp, Copy, DeviceMobile, Globe, LinkSimple, Palette, Pause, Play, QrCode, Robot, TextAa, Users } from "@phosphor-icons/react";
import { DownloadSimple, PencilSimple } from "@/app/_components/glyphs";
import { PageHeader } from "../../_components/PageHeader";
import { useToast } from "../../_components/ToastProvider";
import { formatThousands as fmt } from "@/app/_components/format";
import { deviceName } from "@/lib/devices";
import { fmtDate } from "@/lib/dates";
import { qrPng, qrSvg } from "@/lib/qr";
import { QrPreview } from "./QrToolView";
import { qrShortUrl } from "@/lib/qrLinks";
import { downloadBlob } from "@/lib/download";
import { setQrLinkActive, updateQrLink } from "./actions";
import type { QrStats } from "./data";

const U_SCAN = { one: "مسحة", two: "مسحتان", few: "مسحات" };
const PREVIEW = 220;

/**
 * **إحصاءُ رمزٍ واحد.**
 *
 * ويُقال فيها رقمان لا رقم: **المسحات** و**الزائرون الفريدون**. فمسحةٌ واحدةٌ يعيدها
 * صاحبُها ثلاثًا ليست ثلاثةَ أشخاص، ومن يقرأ رقمًا واحدًا يظنّها كذلك. و«الفريد» هنا
 * تقريبٌ لا يقين: البصمةُ تدور كلّ يوم، فمن مسح أمسِ واليوم يُعَدّ اثنين.
 *
 * **ومسحاتُ الآلات تُقال ولا تُخفى**: استبعادُها من الرقم صوابٌ، وكتمانُ عددِها إيهامٌ
 * بأنّ الرمزَ لم يره إلّا بشر.
 */
export function QrStatsView({ stats }: { stats: QrStats }) {
  const { link } = stats;
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  const svg = useMemo(() => {
    if (!link?.spec) return null;
    try {
      return qrSvg({ ...link.spec, size: PREVIEW });
    } catch {
      return null;
    }
  }, [link]);

  if (!link) {
    return (
      <>
        <PageHeader title="الباركود" />
        <Alert tone="warning" title="لم يُعثر على الباركود">
          إمّا أنّه حُذف، وإمّا أنّه ليس من رموزك. عُد إلى قائمة رموزك.
        </Alert>
      </>
    );
  }

  const short = qrShortUrl(link.code);

  const devices: BarItem[] = stats.devices.map((d) => ({ label: deviceName(d.key), value: d.count }));
  const referrers: BarItem[] = stats.referrers.map((r) => ({ label: r.host, value: r.count }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(short);
      toast.success("نُسخ رابطُ الباركود.");
    } catch {
      toast.error("تعذّر النسخ.");
    }
  };

  const download = async () => {
    if (!link.spec) return;
    setBusy(true);
    try {
      downloadBlob(await qrPng(link.spec), `${link.title}.png`, "qr.png");
    } catch {
      toast.error("تعذّر رسمُ الصورة.");
    }
    setBusy(false);
  };

  const toggle = () => {
    startPending(async () => {
      const res = await setQrLinkActive(link.id, !link.active);
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.message);
    });
  };

  return (
    <>
      <PageHeader title={link.title} />

      {stats.error ? <Alert tone="warning" title="نقصٌ في القراءة">{stats.error}</Alert> : null}

      <div className="card-grid mt-4">
        <SectionCard headerVariant="soft" icon={<QrCode />} title="الباركود ووجهتُه">
          {svg ? (
            <QrPreview svg={svg} max={PREVIEW} />
          ) : (
            <p className="txt">لا وصفةَ رسمٍ محفوظةٌ لهذا الباركود، فلا معاينةَ له.</p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <p className="txt">رابطه: <b className="font-latin" dir="ltr">{short}</b></p>
            <p className="txt">وجهته: <b className="font-latin" dir="ltr">{link.targetUrl}</b></p>
            <p className="txt">
              حالته: <Badge tone={link.active ? "success" : "neutral"} size="sm">{link.active ? "يعمل" : "موقوف"}</Badge>
            </p>
          </div>

          <div className="mt-4 btn-row">
            <Button variant="ghost" size="md" onClick={() => void copy()}><Copy /> نسخ الرابط</Button>
            <Button variant="ghost" size="md" loading={busy} disabled={!link.spec} onClick={() => void download()}>
              <DownloadSimple /> تنزيل الصورة
            </Button>
            <Button variant="ghost" size="md" loading={pending} onClick={toggle}>
              {link.active ? <><Pause /> إيقاف</> : <><Play /> إعادة التشغيل</>}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => { setTitle(link.title); setTarget(link.targetUrl); setEditing(true); }}
            >
              <PencilSimple /> تعديل الوجهة
            </Button>
            {/* بابُ الشكل: الخطوةُ الثانيةُ تبقى مفتوحةً بعد الإنشاء، فالتصميمُ يُراجَع متى شئت */}
            <Link href={`/dashboard/tools/qr/${link.id}/design`} className="abtn abtn-ghost abtn-md">
              <Palette /> عدّل التصميم
            </Link>
          </div>
        </SectionCard>

        <SectionCard headerVariant="soft" icon={<ChartLineUp />} title="ماذا جرى في ثلاثين يومًا">
          <div className="stat-grid">
            <Stat icon={<ChartLineUp />} value={fmt(link.scanCount)} label="مسحةٌ منذ إنشائه" tone="success" />
            <Stat icon={<Users />} value={fmt(stats.uniques)} label="زائرٌ فريدٌ تقريبًا" />
            <Stat icon={<Robot />} value={fmt(stats.bots)} label="مسحةُ آلةٍ مستبعَدة" />
          </div>

          <div className="mt-4">
            <AreaChart
              labels={stats.daily.map((d) => fmtDate(`${d.day}T12:00:00Z`))}
              series={[{ name: "المسحات", values: stats.daily.map((d) => d.count) }]}
            />
          </div>
        </SectionCard>

        <SectionCard headerVariant="soft" icon={<DeviceMobile />} title="من أيّ جهاز">
          <BarList items={devices} unit={U_SCAN} empty={<p className="txt">لا مسحاتٍ بعد.</p>} />
        </SectionCard>

        <SectionCard headerVariant="soft" icon={<Globe />} title="من أين جاؤوا">
          <BarList
            items={referrers}
            unit={U_SCAN}
            empty={
              <p className="txt">
                لا مُحيلَ معروفًا. وهذا هو المتوقَّع: من يمسح ملصقًا بكاميرته يأتي بلا مُحيل،
                والمُحيلُ يظهر حين يُنقَر الرابطُ من صفحةٍ أو رسالة.
              </p>
            }
          />
        </SectionCard>
      </div>

      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        size="md"
        title="تعديل الباركود"
        description="الوجهةُ تتبدّل والباركود المطبوعُ لا يتغيّر، فمن يمسحه بعد الحفظ يصل إلى الوجهة الجديدة."
        footer={
          <>
            <Button
              variant="primary"
              size="md"
              loading={pending}
              onClick={() => startPending(async () => {
                const res = await updateQrLink(link.id, { title, target });
                if (res.ok) { toast.success(res.message); setEditing(false); router.refresh(); } else toast.error(res.message);
              })}
            >
              حفظ
            </Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setEditing(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field
            label="اسم الباركود"
            icon={<TextAa />}
            innerIcon={<QrCode />}
            placeholder="اكتب اسم الباركود"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            helper="تكتبه لك أنت لتعرفه بين باركوداتك، ولا يظهر لمن يمسحه."
            required
          />
          <Field
            label="الوجهة"
            icon={<LinkSimple />}
            innerIcon={<Globe />}
            placeholder="https://adeeb.club"
            dir="ltr"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            helper="حيثما يصل من يمسح الباركود."
            required
          />
        </div>
      </Modal>
    </>
  );
}
