import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getEvaluationViewer } from "@/lib/evaluation/authz";
import { getCorrectionPeople, getCycles, getDepartments, getReturnCommittees, getTargets } from "./data";
import { RoomView } from "./RoomView";

/**
 * **إدارة التقييم** — بقفل النتائج (`view_leader_evaluation_results`: الرئيسان وقائدا الإدارتين). والتصحيحُ
 * واختيارُ لجنة المنسّق المستبعَد لصاحب `manage_leader_evaluation` وحده (الرئيسان وقائدُ الموارد)، تسأل عنه
 * الأفعالُ والقاعدةُ ثانيةً. والدورةُ المعروضة: `?cycle=` إن سُمّيت، وإلّا المفتوحةُ أو المغلقة، وإلّا آخرُ منتهية،
 * وإلّا القادمة.
 */
export default async function EvaluationRoomPage({ searchParams }: { searchParams: Promise<{ cycle?: string }> }) {
  const denied = await denyUnless("/dashboard/evaluation");
  if (denied) return denied;
  const viewer = await getEvaluationViewer();
  const { cycle: asked } = await searchParams;

  const { data: cycles, error } = await getCycles();
  const pick =
    cycles.find((c) => String(c.id) === asked) ??
    cycles.find((c) => c.status === "open" || c.status === "closed") ??
    cycles.find((c) => c.status === "executed") ??
    cycles[0] ??
    null;

  const canManage = viewer?.canManage ?? false;
  const canViewResults = viewer?.canViewResults ?? false;
  const [targets, departments, committees, people] = await Promise.all([
    pick ? getTargets(pick.id, canViewResults) : Promise.resolve({ data: [], error: null }),
    getDepartments(),
    canManage ? getReturnCommittees() : Promise.resolve({ data: [], error: null }),
    canManage ? getCorrectionPeople() : Promise.resolve([]),
  ]);

  return (
    <RoomView
      cycles={cycles}
      cycleId={pick?.id ?? null}
      targets={targets.data}
      departments={departments}
      committees={committees.data}
      people={people}
      canManage={canManage}
      canViewResults={canViewResults}
      error={error ?? targets.error}
    />
  );
}
