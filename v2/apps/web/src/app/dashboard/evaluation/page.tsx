import { denyUnless } from "@/app/dashboard/_shell/guard";
import { getEvaluationViewer } from "@/lib/evaluation/authz";
import { getCorrectionPeople, getCycles, getDepartments, getReturnCommittees, getTargets } from "./data";
import { RoomView } from "./RoomView";

// عنوانُ التبويب اسمُ الغرفة (محمد ٢٠٢٦-١١-٠٣)، وكانت «بوّابة أدِيب» وحدها (٢٠٢٦-١١-٢٠)
export const metadata = { title: "إدارة التقييم، بوّابة أدِيب" };

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
    // من يرى من قيّم ولا يرى تقييماتهم (قائدا الموارد والضمان) تُنزع عنه الشقوقُ القليلة (الكشف، ٢٠٢٦-١١-٢٣)
    pick ? getTargets(pick.id, canViewResults, !!viewer?.seesParticipation && !viewer.seesBallots) : Promise.resolve({ data: [], error: null }),
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
