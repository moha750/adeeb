import { denyUnless } from "../_shell/guard";

/** معرض المكوّنات صفحةٌ عميليّة، فقفلها يُوضع في تخطيطها الخادميّ — لا فرق في الأثر. */
export default async function ComponentsLayout({ children }: { children: React.ReactNode }) {
  const denied = await denyUnless("/dashboard/components");
  if (denied) return denied;
  return <>{children}</>;
}
