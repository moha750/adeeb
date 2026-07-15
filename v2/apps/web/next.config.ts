import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // ترجمة حزم الـmonorepo المكتوبة بـ TS/TSX ضمن بناء التطبيق
  transpilePackages: ["@adeeb/design-system", "@adeeb/core"],
  // جذر مساحة العمل = v2 (يمنع Next من التقاط جذر المستودع القديم بسبب lockfile قديم)
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
