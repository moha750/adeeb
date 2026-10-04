import "server-only";
import { createAdeebServiceClient } from "@adeeb/core";
import { sendWebPush, type VapidKeys } from "./webpush";

/**
 * **بابُ الإرسال الواحد** — كلُّ إشعارٍ يبلغ جوّالًا يمرّ من هنا. (٢٠٢٦-١٠-٠٣)
 *
 * يأخذ أصحابَ الإشعار (معرّفاتِ حسابات) لا أجهزتهم: من يرسل لا يعرف كم جهازًا لكلٍّ منهم،
 * ولا أيُّها ما زال حيًّا. و`push_targets` تكنس من خرج من جهازه قبل أن ترجع الأهداف،
 * وما ردّته خدمةُ الدفع ميّتًا (٤٠٤/٤١٠) يُحذف ههنا.
 *
 * **وغيابُ المفاتيح لا يكسر شيئًا** — يرجع `unconfigured` ويمضي الفعلُ الذي استدعاه. فالإشعارُ
 * إضافةٌ على الحدث لا شرطٌ له: قبولُ متطوّعٍ لا يفشل لأنّ جوّالَه لم يُنبَّه.
 */

/** ما يظهر على شاشة القفل. `url` مسارٌ داخليّ يُفتح عند النقر، و`tag` يجعل الأحدثَ يحلّ محلَّ سابقه. */
export type PushMessage = { title: string; body: string; url?: string; tag?: string };

export type PushOutcome = { sent: number; gone: number; failed: number; unconfigured?: true };

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  return url && key ? createAdeebServiceClient(url, key) : null;
}

/** المفاتيحُ من البيئة. والموضوعُ رابطُ الموقع: أبل تردّ الرمزَ بموضوعٍ محلّيّ أو مبتور. */
function vapid(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "https://adeeb.club";
  return publicKey && privateKey ? { publicKey, privateKey, subject } : null;
}

/** هل المفاتيحُ مضبوطة؟ يسأله من يريد أن يجيب فورًا قبل أن يؤجّل الإرسال. */
export function pushConfigured(): boolean {
  return vapid() !== null;
}

/** دفعاتٌ لا سيلٌ واحد: إرسالٌ إلى كلّ الأعضاء لا يفتح مئاتِ اتّصالٍ معًا، وقوائمُ `in()` لا تطول حتّى يرفضها العنوان. */
const BATCH = 50;
const chunks = <T,>(xs: T[]) => Array.from({ length: Math.ceil(xs.length / BATCH) }, (_, i) => xs.slice(i * BATCH, (i + 1) * BATCH));

/** المسارُ داخليٌّ أو لا شيء: الإشعارُ لا يصير رابطًا إلى موقعٍ آخر ولو كتبه مرسِلٌ بالخطأ. */
function safePath(url?: string): string {
  return url && url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

export async function pushToUsers(
  userIds: string[],
  msg: PushMessage,
  opts: { onlyEndpoint?: string; urgency?: "normal" | "high"; ttl?: number } = {},
): Promise<PushOutcome> {
  const keys = vapid();
  const sb = service();
  if (!keys || !sb) return { sent: 0, gone: 0, failed: 0, unconfigured: true };
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return { sent: 0, gone: 0, failed: 0 };

  const { data, error } = await sb.rpc("push_targets", { p_users: ids });
  if (error) return { sent: 0, gone: 0, failed: ids.length };
  let targets = (data ?? []) as Array<{ id: number; endpoint: string; p256dh: string; auth: string }>;
  if (opts.onlyEndpoint) targets = targets.filter((t) => t.endpoint === opts.onlyEndpoint);

  const payload = { title: msg.title, body: msg.body, url: safePath(msg.url), tag: msg.tag };
  const ok: number[] = [];
  const dead: number[] = [];
  let failed = 0;
  for (const batch of chunks(targets)) {
    const results = await Promise.allSettled(
      batch.map((t) => sendWebPush(t, payload, keys, { urgency: opts.urgency, ttl: opts.ttl })),
    );
    results.forEach((r, i) => {
      if (r.status === "fulfilled" && r.value.gone) dead.push(batch[i].id);
      else if (r.status === "fulfilled" && r.value.status >= 200 && r.value.status < 300) ok.push(batch[i].id);
      else failed++;
    });
  }

  // التنظيفُ والتأريخُ لا يُعطّلان الإرسال: فشلُهما يُترك، والإرسالُ قد تمّ.
  // و٤٠٣ لا يُكنَس عمدًا: قد يكون عطبًا في مفاتيحنا نحن، فيُمحى به كلُّ اشتراكٍ سليم.
  const now = new Date().toISOString();
  await Promise.all([
    ...chunks(dead).map((ids) => sb.from("push_subscriptions").delete().in("id", ids)),
    ...chunks(ok).map((ids) => sb.from("push_subscriptions").update({ last_success_at: now }).in("id", ids)),
  ]);

  return { sent: ok.length, gone: dead.length, failed };
}
