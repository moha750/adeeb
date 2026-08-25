import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { getBankWords } from "../words/data";
import { NewGameView } from "./NewGameView";

export default async function NewGamePage() {
  const denied = await denyUnless("/dashboard/games");
  if (denied) return denied;

  // البنكُ يُقرأ هنا كي يؤشّر المضيفُ على كلماته بيده. والسحبُ العشوائيّ لا يمرّ من
  // هذه القائمة أبدًا: يقع في القاعدة، وإلّا غادرت الكلماتُ الخادمَ قبل أوانها.
  const { rows, categories, error } = await getBankWords();

  if (error) {
    return (
      <>
        <PageHeader title="غرفة جديدة" crumbLeaf="غرفة جديدة" />
        <Alert tone="warning" title="تعذّر جلبُ بنك الكلمات">
          {error}
        </Alert>
      </>
    );
  }

  return <NewGameView words={rows.filter((w) => w.active)} categories={categories} />;
}
