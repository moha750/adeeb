import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";

/**
 * عميلُ الخدمة لنظام الإشعارات — الكتابةُ كلُّها بمفتاح الخدمة (الصندوقُ لا يُكتب من المتصفّح،
 * والواقعةُ لا تُقرأ منه). وغيابُ المفاتيح يرجع `null` فيمضي الحدثُ بلا إشعار: الإشعارُ إضافةٌ
 * على الحدث لا شرطٌ له.
 */
export type NotificationsDb = NonNullable<ReturnType<typeof createAdeebServiceClient>>;

export function notificationsDb(): NotificationsDb | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/** قوائمُ `in()` في دفعاتٍ لا تطول حتّى يرفضها العنوان. */
export function chunks<T>(xs: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));
}
