"use server";

import { cookies } from "next/headers";
import { LOGIN_OAUTH_COOKIE } from "@/lib/oauthIntent";

/**
 * **علامةُ «جاء ليدخل لا لينشئ»** — تُضرب قبل أن يغادر صاحبُها إلى قوقل أو أبل من بوّابة أدِيب.
 *
 * البوّابةُ لا تفتح حسابًا (قرار المالك ٢٠٢٦-١٠-١٨)، والمزوّدُ لا يعرف من أيّ بابٍ جاء الطلب:
 * ينشئ الحسابَ ثمّ يعود. فيُكتب ههنا **وقتُ الخادم** لحظةَ الضغط، وبابُ العودة يقارنه بميلاد
 * الحساب: من وُلد حسابُه بعد هذه اللحظة فقد وُلد في هذه الرحلة، أيْ لم يكن له حساب.
 *
 * ولمَ وقتُ الخادم لا ساعةُ المتصفّح؟ لأنّ ساعةَ الجهاز قد تتقدّم دقائق فيُحسب صاحبُ حسابٍ
 * قديمٍ جديدًا ويُمحى حسابُه. وكوكي `httpOnly` على مسار `/auth` وحده، يعيش ربع ساعة.
 */
export async function markLoginOAuth(): Promise<void> {
  (await cookies()).set(LOGIN_OAUTH_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth",
    maxAge: 15 * 60,
  });
}
