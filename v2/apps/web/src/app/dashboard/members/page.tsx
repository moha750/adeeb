import { redirect } from "next/navigation";

// «كل الأعضاء» أُزيل — المسار الأساس يحوّل لأوّل قسم (نشط).
export default function MembersPage() {
  redirect("/dashboard/members/active");
}
