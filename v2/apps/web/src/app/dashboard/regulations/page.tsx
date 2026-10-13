import Link from "next/link";
import { Alert, Badge, Card, CardHeader } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { RegIcon } from "@/app/regulations/_parts/RegIcon";
import { fmtDateOnly } from "@/lib/dates";
import { getRegEditor } from "@/lib/regulations/authz";
import { PageHeader } from "../_components/PageHeader";
import { getRoomIndex, type RoomRow } from "./data";

/**
 * غرفةُ تحرير الأنظمة (الدستور م٦٨): الوثائقُ السبع بحالها. لكلٍّ إصدارُها النافذ، وما جُدول نفاذُه، ومسودّتُها
 * إن كانت وكم موافقةً نالت. والتحريرُ في صفحة الوثيقة.
 */
export default async function RegulationsRoom() {
  const denied = await denyUnless("/dashboard/regulations");
  if (denied) return denied;
  const ed = await getRegEditor();
  if (!ed) {
    return (
      <>
        <PageHeader title="أنظمة أدِيب" />
        <Alert tone="warning" title="لا تملك صلاحية تحرير الأنظمة">هذه الغرفة لرئيس أدِيب والرئيس التنفيذي.</Alert>
      </>
    );
  }
  const r = await getRoomIndex(ed.sb);
  if ("error" in r) {
    return (
      <>
        <PageHeader title="أنظمة أدِيب" />
        <Alert tone="warning" title="تعذّر جلب الأنظمة">{r.error}</Alert>
      </>
    );
  }
  return (
    <>
      <PageHeader title="أنظمة أدِيب" />
      <div className="card-grid reg-sys-grid">
        {r.rows.map((d, i) => (
          <Link key={d.slug} href={`/dashboard/regulations/${d.slug}`} className={i === 0 ? "block rgx-lead" : "block"}>
            <Card interactive className="reg-sys">
              <CardHeader icon={<RegIcon slug={d.slug} />} title={d.title} subtitle={stateOf(d)} actions={draftBadge(d)} />
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function stateOf(d: RoomRow) {
  if (d.scheduled) return `الإصدار ${d.scheduled.no} يسري في ${fmtDateOnly(d.scheduled.effectiveFrom)}`;
  if (d.current) return `الإصدار ${d.current.no}، نافذ منذ ${fmtDateOnly(d.current.effectiveFrom)}`;
  return "لم يُنشر بعد";
}

function draftBadge(d: RoomRow) {
  if (!d.draft || !d.current) return null;
  const n = d.draft.approvals;
  return (
    <Badge tone={n === 2 ? "success" : "warning"}>
      {n === 2 ? "جاهز للنشر" : n === 1 ? "موافقة واحدة" : "مسودة"}
    </Badge>
  );
}
