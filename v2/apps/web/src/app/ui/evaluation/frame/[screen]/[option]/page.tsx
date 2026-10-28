import { notFound } from "next/navigation";
import { LabFrame, type Option, type Screen } from "../../../_lab/LabFrame";

/** نافذةُ مقترحٍ واحد — تُفتح من `/ui/evaluation` في `iframe` بعرض الجهاز، ولا تُقصَد وحدها. */
export default async function EvaluationFrame({
  params,
  searchParams,
}: {
  params: Promise<{ screen: string; option: string }>;
  searchParams: Promise<{ state?: string; look?: string; open?: string }>;
}) {
  const { screen, option } = await params;
  const { state, look, open } = await searchParams;
  if (!["rate", "room", "mine"].includes(screen) || !["a", "b"].includes(option)) notFound();
  return <LabFrame screen={screen as Screen} option={option as Option} state={state ?? ""} look={look} open={open ? Number(open) : undefined} />;
}
