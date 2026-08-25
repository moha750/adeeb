import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../../_components/PageHeader";
import { getBankWords } from "./data";
import { WordsView } from "./WordsView";

export default async function WordsPage() {
  const denied = await denyUnless("/dashboard/games/words");
  if (denied) return denied;

  const { rows, categories, error } = await getBankWords();

  if (error) {
    return (
      <>
        <PageHeader title="بنك الكلمات" />
        <Alert tone="warning" title="تعذّر جلبُ البنك">
          {error}
        </Alert>
      </>
    );
  }

  return <WordsView rows={rows} categories={categories} />;
}
