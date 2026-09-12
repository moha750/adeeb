"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardBody, SectionCard } from "@adeeb/design-system";
import { Globe, Palette, Pause, Play, QrCode } from "@phosphor-icons/react";
import { DownloadSimple, PencilSimple, Trash, Warning } from "@/app/_components/glyphs";
import { ConfirmDialog } from "../../_components/ConfirmDialog";
import { EditTargetModal } from "./EditTargetModal";
import { PageHeader } from "../../_components/PageHeader";
import { useToast } from "../../_components/ToastProvider";
import { targetHost } from "@/lib/qrLinks";
import { qrPng, qrSvg } from "@/lib/qr";
import { QrPreview } from "./QrToolView";
import { downloadBlob } from "@/lib/download";
import { deleteQrLink, setQrLinkActive, updateQrLink } from "./actions";
import { killText } from "./copy";
import { QrSchedules } from "./QrSchedules";
import { QrTabs } from "./QrTabs";
import { QrShares } from "./QrShares";
import type { QrOwnerBrief } from "./oversight/data";
import type { QrLinkRow, QrSchedule, QrShare } from "./data";

const PREVIEW = 220;

/**
 * **الهامشُ الأبيض داخل صورة الباركود** — منطقةُ الصمت: أربعُ وحداتٍ من نحو سبعٍ وثلاثين،
 * أي ‏٢٤px من ‏٢٢٠. والمحاذاةُ تُقاس **بالحبر لا بالصندوق**: صفوفٌ تحاذي حافّةَ الصورة تبدو
 * أعلى من الباركود بمقدارها (المالك ٢٠٢٦-٠٩-٠٦).
 */
const INK_INSET = Math.round((PREVIEW * 4) / 37);

/**
 * **إعداداتُ باركودٍ واحد** — بابُ الإدارة، وأخوه `QrStatsView` بابُ القراءة.
 *
 * وانفصلا صفحتين ٢٠٢٦-٠٩-٠٥: صارت الصفحةُ الواحدةُ تحمل أرقامًا تُقرأ ووجهةً وتصميمًا
 * وجدولًا وحذفًا تُدار، فطالت واختلط ما يُنظَر بما يُفعَل. والصفحةُ عنوانٌ يُربَط به،
 * فمنسدلُ القائمة يُرسل «تعديل الوجهة» إلى هنا مباشرةً.
 */
export function QrSettingsView({
  link,
  schedules,
  shares = [],
  candidates = [],
  canManage = false,
  openShare = false,
}: {
  link: QrLinkRow | null;
  schedules: QrSchedule[];
  shares?: QrShare[];
  candidates?: QrOwnerBrief[];
  canManage?: boolean;
  /** فُتحت الصفحةُ من «المشاركة» في القائمة: تُفتح نافذةُ الشركاء فورًا. */
  openShare?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [kill, setKill] = useState(false);
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
        <PageHeader title="الباركود" crumbLeaf="الباركود" />
        <Alert tone="warning" title="لم يُعثر على الباركود">
          إمّا أنّه حُذف، وإمّا أنّه ليس من رموزك. عُد إلى قائمة رموزك.
        </Alert>
      </>
    );
  }

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
      {/* **الورقةُ اسمُ الباركود لا اسمُ الصفحة** (المالك ٢٠٢٦-٠٩-٠٥): صار تحت الرأس مبدّلٌ
          يقول «الإحصاء» أو «الإعدادات» مضيئًا، فورقةٌ في الفتات تقول ما يقوله تكرارٌ. والاسمُ
          يُسقَط من الفتات لأنّه عينُ العنوان، فيبقى أثرُه: «مولّد الباركود» رابطًا قبله. */}
      <PageHeader title={link.title} crumbLeaf={link.title} />
      <QrTabs id={link.id} on="settings" />


      <div className="card-grid mt-4">
        <SectionCard
          className="card-full"
          headerVariant="soft"
          icon={<QrCode />}
          title="الباركود ووجهتُه"
        >
          {/**
            * **الصفوفُ تتوسّط حبرَ الباركود** (المالك ٢٠٢٦-٠٩-٠٦): لا صدرَ العمود (فزرُّ
            * التنزيل تحته يزيحها)، ولا صدرَ الرسم (فتبدأ من أعلاه وتنتهي دونه). فالكتلةُ
            * تُحبَس في شريطٍ ارتفاعُه ارتفاعُ الحبر (بلا منطقة الصمت) وتتوسّطه، فمنتصفُها
            * منتصفُه.
            */}
          <div className="flex flex-wrap items-start justify-center gap-6">
            {/* **لا فجوةَ بين الباركود وزرِّه** (المالك ٢٠٢٦-٠٨-٣١): الباركود يحمل منطقةَ صمتٍ
                (٤ وحدات من ٣٧) تساوي ٢٤px بيضاء تحت حبره، فأيُّ فجوةٍ تُضاف تُقرأ مضاعفة. */}
            <div className="flex shrink-0 flex-col items-center">
              {svg ? (
                <QrPreview svg={svg} max={PREVIEW} />
              ) : (
                <p className="txt">لا وصفةَ رسمٍ محفوظةٌ لهذا الباركود، فلا معاينةَ له.</p>
              )}
              <Button variant="primary" size="md" loading={busy} disabled={!link.spec} onClick={() => void download()}>
                <DownloadSimple /> نزّل الباركود
              </Button>
            </div>

            <div
              className="flex min-w-[300px] flex-1 items-center"
              style={{ marginBlock: INK_INSET, minHeight: PREVIEW - INK_INSET * 2 }}
            >
              <div className="lrow w-full">
                {/* الوجهةُ **مضيفُها لا رابطُها**: روابطُ النماذج تبلغ مئةَ محرفٍ فتبتلع الصفَّ،
                    والكاملُ يُقرأ ويُحرَّر في نافذة التعديل. */}
                <div className="lrow-i">
                  <span className="lrow-ic"><Globe /></span>
                  <span className="lrow-tx">
                    <b>الوجهة</b>
                    {/* القيمةُ تلبس ثوبَ أخواتها (خافتةٌ) وإن كانت رابطًا: الصفوفُ الثلاثةُ
                        قائمةٌ واحدة، ولونٌ في صفٍّ منها يجعله نشازًا. والنقرُ باقٍ. */}
                    {/* **الوجهةُ تبدأ من جهة النصّ**: `dir="ltr"` على العنصر الكتليّ يجعل
                        سطرَه كلَّه لاتينيًّا فيلتصق النصُّ بالطرف المقابل ويصير سطرًا
                        شاردًا في صفٍّ عربيّ. والصوابُ `bdi` داخليّةٌ تعزل اتّجاهَ
                        الرابط وحدَه ويبقى موضعُه موضعَ إخوته (٢٠٢٦-٠٩-٠٧). */}
                    <a
                      className="font-latin"
                      href={link.targetUrl}
                      title={link.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <bdi dir="ltr">{targetHost(link.targetUrl)}</bdi>
                    </a>
                  </span>
                  <span className="lrow-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="lrow-sel"
                      onClick={() => { setTitle(link.title); setTarget(link.targetUrl); setEditing(true); }}
                    >
                      <PencilSimple /> تعديل
                    </Button>
                  </span>
                </div>

                <div className="lrow-i">
                  <span className="lrow-ic"><Palette /></span>
                  <span className="lrow-tx">
                    <b>التصميم</b>
                    <span>شكلٌ ولونٌ وإطار</span>
                  </span>
                  <span className="lrow-end">
                    {/* بابُ الشكل: الخطوةُ الثانيةُ تبقى مفتوحةً بعد الإنشاء، فالتصميمُ يُراجَع متى شئت */}
                    <Link href={`/dashboard/tools/qr/${link.id}/design`} className="abtn abtn-ghost abtn-sm lrow-sel">
                      <Palette /> تعديل
                    </Link>
                  </span>
                </div>

                <div className="lrow-i">
                  <span className="lrow-ic">{link.active ? <Play /> : <Pause />}</span>
                  <span className="lrow-tx">
                    <b>الحالة</b>
                    <span>{link.active ? "يعمل الآن" : "موقوفٌ الآن"}</span>
                  </span>
                  <span className="lrow-end">
                    <Button variant="ghost" size="sm" className="lrow-sel" loading={pending} onClick={toggle}>
                      {link.active ? <><Pause /> إيقاف</> : <><Play /> تشغيل</>}
                    </Button>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* **بطاقةُ الشركاء للمالك وحدَه**: الشريكُ لا يرى في الجدول إلّا صفَّه هو (تحرسه
          السياسة)، وبطاقةٌ تعرض عليه اسمَه شريكًا لنفسه لغوٌ. */}
      {canManage ? (
        <QrShares linkId={link.id} rows={shares} candidates={candidates} canManage autoOpen={openShare} />
      ) : null}

      <QrSchedules linkId={link.id} fallback={link.targetUrl} rows={schedules} />

      {/**
        * **كرتُ آخرِ ما يُفعَل بالباركود** (اختارها المالك من `\/ui\/qr-end` ٢٠٢٦-٠٨-٣١ من بين
        * أربع هيئات): كرتٌ منغَّمٌ بالخطر بلا رأس، أيقونةُ تنبيهٍ وسطرٌ يجمع الأثرين وزرّان.
        * وسبقتها هيئةٌ بصفَّين لكلٍّ سطرُ أثرِه فرآها ثقيلةً بصريًّا.
        *
        * **وفيه الحذفُ وحدَه**: الإيقافُ فعلٌ يرجع، فسكن مع أفعال الباركود، وبقي الكرتُ لِما
        * لا رجعةَ فيه. فهدأ إلى سطرٍ وزرٍّ واحد، ولا يقرأ القارئُ خطرًا حيث لا خطر.
        *
        * **وللمالك وحدَه** (صُحّح ٢٠٢٦-٠٩-٠٦): الحذفُ ونقلُ الملكيّة والمشاركةُ ثلاثةٌ لا
        * تُشارَك، والقاعدةُ تردّ الشريكَ — لكنّ زرًّا أحمرَ يُعرَض ثمّ يُردّ عطبٌ لا حراسة.
        */}
      {canManage ? (
      <div className="card-grid mt-4">
        <Card className="card-full" tone="danger">
          <CardBody>
            <div className="flex items-start gap-3">
              <span className="acard-chip shrink-0"><Warning /></span>
              <div className="min-w-0">
                <b className="txt">حذفُ الباركود</b>
                <p className="fld-help mt-1">
                  يُحذف الباركود ومسحاتُه كلُّها بلا رجعة، وكلُّ ملصقٍ مطبوعٍ يُصبح باركودًا
                  ميّتًا. والإيقافُ يكفي إن أردتَ تعطيلَه فحسب.
                </p>
                {/* لا `btn-row` لزرٍّ واحد: قانونُ الصفّ يجعل الوحيدَ يملأ سطرَه، وشريطٌ أحمر
                    بعرض الكرت تهويلٌ لا يليق بفعلٍ يُطلَب هادئًا. فيبقى الزرُّ بعرض حبره.
                    ومصمتٌ بأمر المالك ٢٠٢٦-٠٨-٣١: البابُ يُفتح ولا يُخفى، ونافذةُ التأكيد حارسُه. */}
                <div className="mt-3 flex">
                  <Button variant="danger" size="md" disabled={pending} onClick={() => setKill(true)}>
                    <Trash /> حذف الباركود
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      ) : null}
      <EditTargetModal
        open={editing}
        title={title}
        target={target}
        pending={pending}
        onTitle={setTitle}
        onTarget={setTarget}
        onClose={() => setEditing(false)}
        onSave={() =>
          startPending(async () => {
            const res = await updateQrLink(link.id, { title, target });
            if (res.ok) { toast.success(res.message); setEditing(false); router.refresh(); } else toast.error(res.message);
          })
        }
      />

      {/* نصُّ التأكيد نصُّ الكرت نفسُه: التبعةُ واحدةٌ فلا تُقال بلفظين. */}
      <ConfirmDialog
        open={kill}
        onClose={() => setKill(false)}
        tone="danger"
        icon={<Trash />}
        title="حذف الباركود؟"
        text={killText(link.title)}
        confirmLabel="حذف"
        loading={pending}
        onConfirm={() =>
          startPending(async () => {
            const res = await deleteQrLink(link.id);
            if (!res.ok) return toast.error(res.message);
            toast.success(res.message);
            setKill(false);
            // بعد الحذف لا صفحةَ يُرجَع إليها: الغرفةُ هي الوجهة، و`replace` تمنع العودةَ بالسهم
            // إلى باركودٍ لم يعُد موجودًا.
            router.replace("/dashboard/tools/qr");
          })
        }
      />
    </>
  );
}
