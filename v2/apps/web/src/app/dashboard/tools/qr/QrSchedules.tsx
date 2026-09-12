"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, IconButton, Modal } from "@adeeb/design-system";
import { CalendarBlank, Globe, LinkSimple, TextAa } from "@phosphor-icons/react";
import { Plus, Trash } from "@/app/_components/glyphs";
import { EmptyState } from "../../_components/EmptyState";
import { useToast } from "../../_components/ToastProvider";
import { fmtDate } from "@/lib/dates";
import { checkTarget, targetHost } from "@/lib/qrLinks";
import { addQrSchedule, deleteQrSchedule } from "./actions";
import type { QrSchedule } from "./data";

/**
 * **وجهةٌ بجدولٍ زمنيّ** — الملصقُ يُطبَع مرّةً ويوصّل إلى شيئين في وقتين.
 *
 * علّتُه فعاليّةٌ لها ثلاثةُ أعمار: قبلها **تسجيل**، وبعدها **استبيان**، وبعد أسبوعٍ
 * **ألبوم**. وكان ذلك يقتضي من يقف عند منتصف الليل ليبدّل الوجهة بيده.
 *
 * **والوجهةُ الأصليّةُ تبقى الأصل**: النوافذُ استثناءٌ مؤقّت، ومن لا نافذةَ سارية له اليوم
 * يذهب ماسحُه إلى الوجهة المكتوبة في الباركود. فمن لا يجدول لا يتغيّر عليه شيء.
 *
 * **والوقتُ بتوقيت الرياض** لا بساعة الجهاز (درسُ `lib/dates`): يُكتَب في الشاشة محلّيًّا
 * ويُختَم في الفعل بإزاحة ‏+03:00 الثابتة، فلا تختلف النافذةُ باختلاف من كتبها.
 */
export function QrSchedules({ linkId, fallback, rows }: { linkId: string; fallback: string; rows: QrSchedule[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startPending] = useTransition();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [note, setNote] = useState("");

  const trimmed = target.trim();
  const link = trimmed ? checkTarget(trimmed) : null;
  const linkError = link && !link.ok ? link.message : null;
  const ready = !!link?.ok && (!!startsAt || !!endsAt);

  /** السارية الآن: أوّلُ نافذةٍ بدأت ولم تنتهِ في القائمة المرتّبة بالبداية تنازليًّا. */
  const now = Date.now();
  const liveId = rows.find(
    (r) => (!r.startsAt || Date.parse(r.startsAt) <= now) && (!r.endsAt || Date.parse(r.endsAt) > now),
  )?.id;

  const add = () =>
    startPending(async () => {
      const res = await addQrSchedule(linkId, {
        target: trimmed,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        note: note || null,
      });
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      setOpen(false);
      setTarget(""); setStartsAt(""); setEndsAt(""); setNote("");
      router.refresh();
    });

  const remove = (id: string) =>
    startPending(async () => {
      const res = await deleteQrSchedule(id, linkId);
      if (!res.ok) return toast.error(res.message);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <>
      <div className="card-grid mt-4">
        <Card className="card-full">
          <CardHeader
            variant="soft"
            icon={<CalendarBlank />}
            title="وجهةٌ بجدول"
            actions={
              <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                <Plus size={16} /> أضف نافذة
              </Button>
            }
          />
          <CardBody>
            {rows.length ? (
              /* صفُّ القائمة المصقول (اعتمده المالك ٢٠٢٦-٠٩-٠٧): مرساةٌ وسطران وحذفٌ ظاهر. */
              <div className="lrow">
                {rows.map((r) => (
                  <div className="lrow-i" key={r.id}>
                    <span className="lrow-ic"><CalendarBlank /></span>
                    <span className="lrow-tx">
                      <b>
                        <bdi className="font-latin" dir="ltr">{targetHost(r.targetUrl)}</bdi>
                        {r.id === liveId ? <> <Badge tone="success" size="sm">سارية الآن</Badge></> : null}
                      </b>
                      <span>
                        {r.startsAt ? `من ${fmtDate(r.startsAt)}` : "من الآن"}
                        {r.endsAt ? ` إلى ${fmtDate(r.endsAt)}` : " بلا نهاية"}
                        {r.note ? `، ${r.note}` : ""}
                      </span>
                    </span>
                    <span className="lrow-end">
                      <IconButton
                        tone="danger"
                        size="lg"
                        aria-label="حذف النافذة"
                        disabled={pending}
                        onClick={() => remove(r.id)}
                      >
                        <Trash />
                      </IconButton>
                    </span>
                  </div>
                ))}
                <p className="fld-help mt-2">
                  وخارجَ هذه النوافذ يذهب الماسحُ إلى{" "}
                  <bdi className="font-latin" dir="ltr">{targetHost(fallback)}</bdi>
                </p>
              </div>
            ) : (
              <EmptyState
                variant="soft"
                icon={<CalendarBlank />}
                title="لا نوافذ بعد"
                description="أضِف نافذةً فيوصّل الملصقُ نفسُه إلى وجهةٍ في وقتها ثمّ يعود إلى وجهته الأصليّة."
              />
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
        title="نافذةُ وجهة"
        description="وجهةٌ تسري بين وقتين ثمّ تنتهي، والملصقُ المطبوعُ لا يتغيّر. والأوقاتُ بتوقيت الرياض."
        footer={
          <>
            <Button variant="primary" size="md" loading={pending} disabled={!ready} onClick={add}>أضف النافذة</Button>
            <Button variant="ghost" size="md" disabled={pending} onClick={() => setOpen(false)}>إلغاء</Button>
          </>
        }
      >
        <div className="form-grid">
          <Field
            className="form-full"
            label="الوجهة في هذه النافذة"
            icon={<LinkSimple />}
            innerIcon={<Globe />}
            placeholder="https://adeeb.club/register"
            dir="ltr"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={linkError ?? undefined}
            helper="حيثما يصل من يمسح الباركود أثناء هذه المدّة."
            required
          />
          <Field
            className="form-full"
            label="تبدأ"
            type="datetime-local"
            icon={<CalendarBlank />}
            innerIcon={<CalendarBlank />}
            placeholder=""
            dir="ltr"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            helper="اتركها فارغةً لتسري من الآن."
            optional
          />
          <Field
            className="form-full"
            label="تنتهي"
            type="datetime-local"
            icon={<CalendarBlank />}
            innerIcon={<CalendarBlank />}
            placeholder=""
            dir="ltr"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            helper="اتركها فارغةً فتبقى إلى أن تحذفها."
            optional
          />
          <Field
            className="form-full"
            label="ملاحظة"
            icon={<TextAa />}
            innerIcon={<TextAa />}
            placeholder="مثال: نافذة التسجيل"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 120))}
            helper="تكتبها لنفسك لتعرف لماذا أنشأتها."
            optional
          />
          {!startsAt && !endsAt ? (
            <div className="form-full">
              <Alert tone="info" title="نافذةٌ بلا وقتين">
                نافذةٌ بلا بدايةٍ ولا نهايةٍ تعني تبديلَ الوجهة إلى الأبد، وذلك يُفعَل من «تعديل وجهة الباركود» لا من هنا.
              </Alert>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
