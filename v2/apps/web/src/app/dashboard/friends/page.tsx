import { Alert } from "@adeeb/design-system";
import { denyUnless } from "@/app/dashboard/_shell/guard";
import { PageHeader } from "../_components/PageHeader";
import { listFriends } from "./data";
import { FriendsView } from "./FriendsView";

export const metadata = { title: "أصدقاء أدِيب، بوّابة أدِيب" };

export default async function FriendsPage() {
  const denied = await denyUnless("/dashboard/friends");
  if (denied) return denied;

  const { rows, error } = await listFriends();
  if (error) {
    return (
      <>
        <PageHeader title="أصدقاء أدِيب" />
        <Alert tone="warning" title="تعذّر جلب الأصدقاء">{error}</Alert>
      </>
    );
  }
  return <FriendsView rows={rows} />;
}
