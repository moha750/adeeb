import { SimView } from "../../_sim/SimView";

/** عينُ الشخص المتقمَّص: تُفتح في `iframe` من `/ui/evaluation/sim`، ولا تُقصَد وحدها (بلا رسالةٍ لا ترسم شيئًا). */
export default function EvaluationSimView() {
  return <SimView />;
}
