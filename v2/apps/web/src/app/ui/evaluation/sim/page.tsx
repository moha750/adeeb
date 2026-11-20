import { SimLab } from "../_sim/SimLab";

// يُرسَل للمجلس الإداريّ رابطًا (٢٠٢٦-١١-٢٠)، فلا يُفهرَس: تجربةٌ بأسماءٍ متخيَّلة لا صفحةٌ من الموقع
export const metadata = { title: "جرّب تقييم القيادات، نادي أدِيب", robots: { index: false, follow: false } };

/** محاكي تقييم القيادات: دورةٌ كاملة تُعاش من عين كلّ طرف قبل الرفع (طلبُ محمد ٢٠٢٦-١٠-٢٧). */
export default function EvaluationSimPage() {
  return <SimLab />;
}
