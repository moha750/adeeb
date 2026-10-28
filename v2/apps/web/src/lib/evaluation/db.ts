import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * عميلُ الخدمة لتقييم القيادات. دوالُّ الغرفة والحكم والتصحيح كلُّها للخدمة وحدها (لا منحَ في القاعدة)،
 * فلا تُنادى إلّا من هنا بعد أن يسأل الخادمُ عن القدرة. وبلا مفتاحٍ يعود `null` فيُردّ الطلب (CLAUDE.md).
 */
export function evaluationService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  // تنقيةُ المفتاح من محارف دخيلة قد تلتصق عند اللصق (JWT لا يحوي إلّا هذه)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}
