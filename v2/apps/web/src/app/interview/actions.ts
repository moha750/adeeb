"use server";

import { createAdeebServiceClient } from "@adeeb/core";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BookingResult = { ok: boolean; message: string };

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return null;
  return createAdeebServiceClient(url, key);
}

/**
 * حجز فترة مقابلة — معرّف الطلب (UUID) رمزُ الوصول. الفرض كلّه في القاعدة:
 * book_interview_slot (SECURITY DEFINER، ذرّيّة) تقفل الفترة FOR UPDATE، وتمنع الحجز المزدوج
 * (فترةٌ أخرى محجوزة لنفس الطلب)، وتُنشئ/تحدّث membership_interviews. نتحقّق هنا من اعتماد الطلب أوّلًا (دفاع).
 */
export async function bookSlot(slotId: string, applicationId: string): Promise<BookingResult> {
  if (!UUID_RE.test(slotId) || !UUID_RE.test(applicationId)) return { ok: false, message: "طلبٌ غير صالح." };

  const sb = serviceClient();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص — أبلغ الإدارة." };

  const { data: app } = await sb.from("membership_applications").select("status").eq("id", applicationId).single();
  if (!app) return { ok: false, message: "لم نجد طلبك." };
  if (app.status !== "approved_for_interview") return { ok: false, message: "لا يمكن حجز موعدٍ لهذا الطلب حاليًّا." };

  const { data, error } = await sb.rpc("book_interview_slot", { p_slot_id: slotId, p_application_id: applicationId });
  if (error) return { ok: false, message: "تعذّر الحجز، حاول لاحقًا." };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.success) return { ok: false, message: row?.message || "تعذّر الحجز." };
  return { ok: true, message: row.message || "تمّ حجز موعدك بنجاح." };
}

/** إلغاء حجز فترة — عبر cancel_interview_booking (تُحرّر الفترة وتلغي المقابلة المرتبطة). */
export async function cancelBooking(slotId: string, applicationId: string): Promise<BookingResult> {
  if (!UUID_RE.test(slotId) || !UUID_RE.test(applicationId)) return { ok: false, message: "طلبٌ غير صالح." };

  const sb = serviceClient();
  if (!sb) return { ok: false, message: "إعداد الخادم ناقص — أبلغ الإدارة." };

  const { data, error } = await sb.rpc("cancel_interview_booking", { p_slot_id: slotId, p_application_id: applicationId });
  if (error) return { ok: false, message: "تعذّر إلغاء الحجز، حاول لاحقًا." };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.success) return { ok: false, message: row?.message || "تعذّر إلغاء الحجز." };
  return { ok: true, message: row.message || "أُلغي حجزك." };
}
