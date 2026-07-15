import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "./_shell/DashboardShell";
import { AccessDenied } from "./_shell/AccessDenied";
import { ToastProvider } from "./_components/ToastProvider";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "لوحة أديب",
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login"); // احتياط — الـmiddleware يحرس أصلًا
  if (!admin.isAdmin) return <AccessDenied name={admin.fullName} />;

  // حارس الهوية: كاشف العناصر الخام يعمل في اللوحة وقت التطوير فقط (مُطفأ في الإنتاج)
  const guardrail = process.env.NODE_ENV === "development";

  return (
    // اتّجاه RTL موروث من <html dir="rtl"> — لا حاجة لمزوّد اتجاه بعد إزالة Radix
    <ToastProvider>
      <DashboardShell user={{ fullName: admin.fullName, avatar: admin.avatarUrl, roleName: admin.roleName }}>
        {guardrail ? <div data-guardrail style={{ display: "contents" }}>{children}</div> : children}
      </DashboardShell>
    </ToastProvider>
  );
}
