import { getCurrentAdmin } from "@/lib/auth";
import { getMyScope } from "@/lib/myScope";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getOrgData } from "../members/structure/orgData";
import { buildRoster, buildSeats, adminUnit, type Unit } from "./model";
import { UnitRoom } from "@/app/_ad/rooms/UnitRoom";
import { AdRoomError } from "@/app/_ad/states";
import { UNIT_ROOM } from "@/app/_ad/rooms/unit.meta";
import { roomView } from "@/app/_ad/view-server";
import { requestNow } from "@/app/_ad/now";
import { roomMetadata } from "@/app/_ad/metadata";

export const metadata = roomMetadata(UNIT_ROOM);

/**
 * غرفةُ الإدارات الإداريّة — **تعيينُ أعضائها وتوزيعُ إشرافهم**.
 *
 * وكانت غرفةَ إدارةٍ واحدةٍ هي التي يقودها الداخل، فصارت (20260819) غرفةَ **ما يبلُغه
 * تعيينُه**: القائدُ يبلغ إدارتَه وحدها فلا يرى فرقًا، والرئيسان (النادي والتنفيذيّ) يبلغان
 * الإدارتين فيختاران — وسلطتُهما على ذلك قائمةٌ في `position_authority` من قبلُ، وإنّما
 * كان القفلُ يردّهما عند الباب.
 *
 * والقائمةُ من `scope.units` (وأصلُها `can_assign_role`) — الحَكَمُ نفسُه الذي يردّ الكتابة،
 * فلا شاشةَ تعرض ما لا تسمح به القاعدة.
 *
 * على قالب «قائمة السجلّات» (٢٠٢٦-١١-٠٣): الإداراتُ مواضعُ الغرفة (كانت مبدّلًا بروابط `?u=`)، فتُبنى كلُّها من الهيكلة
 * المجلوبة مرّةً — والرابطُ القديم `?u=` يبقى يفتح على إدارته. ولا مساراتٍ أبناءَ للمجلّد، فحالتا التحميل والخطأ بجانب الصفحة.
 */
export default async function UnitPage({ searchParams }: { searchParams: Promise<{ u?: string }> }) {
  const denied = await denyUnless("/dashboard/unit");
  if (denied) return denied;

  const admin = await getCurrentAdmin();
  if (!admin) return denied;

  // المدى أوّلًا — فمن لا إدارةَ يبلغها لا تُجلب له الهيكلةُ كلّها ليُقال له «لا شيء لك»
  const scope = await getMyScope(admin.id);
  if (scope.units.length === 0) {
    return (
      <UnitRoom
        units={[]}
        members={[]}
        initial={null}
        serverNow={await requestNow()}
        view={await roomView(UNIT_ROOM.viewKey, UNIT_ROOM.defaultView)}
      />
    );
  }

  // الإدارةُ المعروضة: ما طلبه الرابط إن كان في مداه، وإلّا مقعدُه، وإلّا أوّلُ ما يبلغ.
  const asked = Number((await searchParams).u);
  const current =
    scope.units.find((u) => u.id === asked) ??
    scope.units.find((u) => u.id === scope.unit?.id) ??
    scope.units[0];

  const org = await getOrgData();
  if (org.error) return <AdRoomError {...UNIT_ROOM} message={org.error} />;

  const unit = adminUnit(current.id, org.committees, org.roles);
  if (!unit) {
    return <AdRoomError {...UNIT_ROOM} message={`لا يُعرف من يُعدّ عضوًا في ${current.name}: \`member_role_name\` فارغ في القاعدة.`} />;
  }

  // **كلُّ إدارةٍ يبلغها موضعٌ في الغرفة**، من الهيكلة نفسِها (لا جلبَ زائد). وما لا تُصرّح بدور عضوها لا موضعَ لها:
  // لا يُعرف من يُعدّ عضوًا فيها (وإن طُلبت بالرابط قيل ذلك أعلاه).
  const units = scope.units
    .map((s) => (s.id === unit.id ? unit : adminUnit(s.id, org.committees, org.roles)))
    .filter((u): u is Unit => u !== null)
    .map((u) => ({
      unit: u,
      seats: u.supervises ? buildSeats(u, org.committees, org.supervision, org.profiles) : [],
      roster: buildRoster(u, org.committees, org.userRoles, org.supervision, org.profiles),
    }));

  return (
    <UnitRoom
      units={units}
      members={org.members}
      initial={unit.id}
      serverNow={await requestNow()}
      view={await roomView(UNIT_ROOM.viewKey, UNIT_ROOM.defaultView)}
    />
  );
}
