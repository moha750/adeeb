import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getSessionAdmin } from "@/lib/auth";
import { getMyQrLinks, getQrLink, getQrSchedules, getQrShares } from "@/app/dashboard/tools/qr/data";
import { getQrShareCandidates } from "@/app/dashboard/tools/qr/shares";
import { QrSettingsRoom } from "@/app/_ad/rooms/QrSettingsRoom";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٦): **إعداداتُ الباركود** على قالب «حسابي» بباركودٍ حقيقيّ من باركوداتك (`?id=`، وبلاه أوّلُها)، وكلُّ فعلٍ فيه
 * يُقال ولا يُكتب. والحاليّةُ للمقارنة: `/dashboard/tools/qr/<id>/settings`.
 */
export const metadata = { title: "إعدادات الباركود: المختبر" };

export default async function QrSettingsLab({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;
  const { id: asked } = await searchParams;
  const id = asked ?? (await getMyQrLinks()).rows[0]?.id;
  if (!id) return <p>لا باركود.</p>;
  const [link, schedules, shares, candidates, me] = await Promise.all([getQrLink(id), getQrSchedules(id), getQrShares(id), getQrShareCandidates(), getSessionAdmin()]);
  if (!link.link) return <p>{link.error ?? "لا باركود بهذا المعرّف."}</p>;
  return <QrSettingsRoom dry homeHref={`/dashboard/ad/qr-home?id=${id}`} designHref={`/dashboard/ad/qr-design?id=${id}`} link={link.link} schedules={schedules.rows} shares={shares.rows} candidates={candidates}
    canManage={!!me && link.link.ownerId === me.id} />;
}
