import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getMyQrLinks, getQrLink } from "@/app/dashboard/tools/qr/data";
import { QrDesignLab } from "./QrDesignLab";

/**
 * مختبر (لا يُرفع، ٢٠٢٦-١١-١٦): **تصميمُ الباركود على المنضدة** بباركودٍ حقيقيّ من باركوداتك (`?id=`، وبلاه أوّلُها)، والحفظُ فيه لا يكتب شيئًا.
 * والحاليُّ للمقارنة: `/dashboard/tools/qr/<id>/design`. و`?s=off` حالُ الموقوف، و`?new=1` حالُ من وصل من «باركود جديد».
 */
export const metadata = { title: "تصميم الباركود: المنضدة" };

export default async function QrDesignLabPage({ searchParams }: { searchParams: Promise<{ id?: string; s?: string; new?: string }> }) {
  const denied = await denyUnless("/dashboard/tools/qr");
  if (denied) return denied;
  const { id, s, new: fresh } = await searchParams;
  const pick = id ?? (await getMyQrLinks()).rows[0]?.id;
  if (!pick) return <p>لا باركود.</p>;
  const { link, error } = await getQrLink(pick);
  if (error || !link) return <p>{error ?? "لا باركود بهذا المعرّف."}</p>;
  return <QrDesignLab fresh={fresh === "1"} link={s === "off" ? { ...link, active: false } : link} />;
}
