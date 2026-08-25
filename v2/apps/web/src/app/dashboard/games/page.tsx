import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";
import { getRooms } from "./data";
import { GamesView } from "./GamesView";

export default async function GamesPage() {
  const denied = await denyUnless("/dashboard/games");
  if (denied) return denied;

  const { rows, error } = await getRooms();

  if (error) {
    return (
      <>
        <PageHeader title="خمّن الكلمة" />
        <Alert tone="warning" title="تعذّر جلبُ الغرف">
          {error}
        </Alert>
      </>
    );
  }

  return <GamesView rows={rows} />;
}
