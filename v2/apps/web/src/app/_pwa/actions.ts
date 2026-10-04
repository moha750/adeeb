"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { createAdeebServiceClient } from "@adeeb/core";
import { getSessionAdmin, getSessionClaims } from "@/lib/auth";
import { isPushEndpoint } from "@/lib/push/webpush";
import { pushConfigured, pushToUsers } from "@/lib/push/send";

/**
 * **اشتراكُ الجهاز في إشعارات أدِيب** — حفظُه وحذفُه وتجربتُه (٢٠٢٦-١٠-٠٣).
 *
 * صاحبُ الاشتراك **صاحبُ الجلسة** (`getSessionAdmin`) لا الهويّةُ المُعارة: من عاين عضوًا
 * لا يُسجَّل جوّالُه باسم ذلك العضو. والصفُّ يحمل معرّفَ الجلسة، فإن خرج صاحبُها من الجهاز
 * سقط الاشتراك عند أوّل إرسال (`push_targets`). انظر الترحيل `20261003034539_push_01_subscriptions`.
 */

export type PushActionResult = { ok: boolean; message: string };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/** ما يسلّمه المتصفّح من `PushSubscription.toJSON()` — والعنوانُ مقيَّدٌ بخدمات الدفع المعروفة. */
const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isPushEndpoint),
  keys: z.object({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}={0,2}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{16,32}={0,2}$/),
  }),
});

const SIGNED_OUT = "سجّل دخولك أوّلًا لتصلك إشعاراتُ حسابك.";
const NO_SERVER = "إعداد الخادم ناقص. أبلغ الإدارة.";

export async function savePushSubscription(raw: unknown): Promise<PushActionResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: SIGNED_OUT };
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "هذا المتصفّح سلّم اشتراكًا لا نعرفه." };
  const sb = service();
  if (!sb) return { ok: false, message: NO_SERVER };

  const claims = await getSessionClaims();
  const sessionId = (claims as { session_id?: string } | null)?.session_id ?? null;
  const ua = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  const { endpoint, keys } = parsed.data;

  // `endpoint` فريد: إن كان الجهازُ لحسابٍ آخر انتقل الصفُّ إلى من دخله الآن.
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_id: me.id,
      session_id: sessionId,
      user_agent: ua,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, message: "تعذّر حفظ اشتراك هذا الجهاز. حاول مجدّدًا." };
  return { ok: true, message: "ستصلك إشعاراتُ أَدِيب على هذا الجهاز." };
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: SIGNED_OUT };
  const sb = service();
  if (!sb) return { ok: false, message: NO_SERVER };
  const { error } = await sb.from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", me.id);
  if (error) return { ok: false, message: "تعذّر إيقاف الإشعارات. حاول مجدّدًا." };
  return { ok: true, message: "أُوقفت الإشعارات على هذا الجهاز." };
}

/** مهلةٌ قبل الإرسال التجريبيّ — كي يقفل صاحبُ الجوّال شاشتَه فيرى الإشعار حيث سيراه حقًّا. */
const TEST_DELAY_MS = 6000;

/**
 * إشعارٌ تجريبيٌّ إلى **هذا الجهاز وحده** — لا إلى سائر أجهزة الحساب.
 *
 * **يجيب فورًا ويرسل بعد الجواب** (`after`): الأفعالُ الخادميّة من صفحةٍ واحدة تُنفَّذ تباعًا،
 * فلو نام هذا ستَّ ثوانٍ لَوقف كلُّ فعلٍ بعده في الصفحة. ولأنّ صاحبه يُطلب منه قفلُ الشاشة،
 * وآيفون يجمّد التطبيقَ المقفول، فجوابٌ مؤجَّلٌ قد لا يصل أصلًا. فما يمكن التحقّقُ منه يُتحقَّق
 * منه قبل الجواب (المفاتيح، وأنّ الجهاز مسجَّلٌ لصاحبه)، والإرسالُ نفسُه يُرى على الشاشة أو لا يُرى.
 */
export async function sendTestPush(endpoint: string): Promise<PushActionResult> {
  const me = await getSessionAdmin();
  if (!me) return { ok: false, message: SIGNED_OUT };
  if (!pushConfigured()) return { ok: false, message: "الإشعارات غير مهيّأة على الخادم بعد." };
  const sb = service();
  if (!sb) return { ok: false, message: NO_SERVER };
  const { data } = await sb
    .from("push_subscriptions").select("id").eq("endpoint", endpoint).eq("user_id", me.id).maybeSingle();
  if (!data) return { ok: false, message: "هذا الجهاز غير مسجَّلٍ لحسابك. فعّل الإشعارات من جديد." };

  after(async () => {
    await new Promise((r) => setTimeout(r, TEST_DELAY_MS));
    await pushToUsers(
      [me.id],
      { title: "أَدِيب", body: "هكذا تصلك أخبارُ أَدِيب: على شاشة القفل، كأيّ تطبيق.", url: "/me", tag: "adeeb-test" },
      { onlyEndpoint: endpoint, urgency: "high" },
    );
  });
  return { ok: true, message: "سيصلك خلال ثوانٍ. اقفل الشاشة الآن لتراه حيث سيصلك." };
}
