import "server-only";

import { connect, constants } from "node:http2";
import { dropToken } from "./store";

/**
 * قناةُ الدفع إلى أبل — **النبضةُ التي تجعل التحديث لحظيًّا**.
 *
 * الجهاز لا يسأل من تلقاء نفسه؛ ننبّهه بدفعةٍ **صامتةٍ خاوية** (`{}`) فيذهب هو إلى
 * خدمتنا يطلب النسخة الجديدة. فالدفعةُ لا تحمل بيانات البطاقة، تحمل خبرَ أنّ فيها جديدًا.
 *
 * **وبشهادتنا نفسِها لا بمفتاحٍ ثانٍ**: أبل تقبل المصادقة بشهادة العميل (mTLS)، وشهادةُ
 * `Pass Type ID` تصلح لها — فلا مفتاح `.p8` نُنشئه ولا متغيّرَ بيئةٍ سادس. و`apns-topic`
 * هو معرّفُ نوع البطاقة نفسُه.
 *
 * **وHTTP/2 شرطٌ لا خيار** — أبل أغلقت الواجهة الثنائيّة القديمة. و`node:http2` مدمجٌ،
 * فلا حزمة.
 */

const APNS = "https://api.push.apple.com:443";

/** ما جرى لكلّ رمز — يُعرَض في الصفحة كما هو، فالفشل الصامت أسوأ من الفشل المعلن. */
export type PushResult = { token: string; status: number; reason?: string };

/**
 * يدفع إلى رموزٍ عدّة على **اتّصالٍ واحد** — هذا نصفُ فائدة HTTP/2، ولولاه لصافحنا أبل
 * مرّةً لكلّ جهاز.
 *
 * ولا يرمي: يرجع ما جرى لكلّ رمز. فالمعاينة تُري النتيجة ولا تسقط.
 */
export async function pushToDevices(tokens: string[], topic: string): Promise<PushResult[]> {
  if (tokens.length === 0) return [];

  const key = process.env.WALLET_PASS_KEY_PEM?.replace(/\\n/g, "\n");
  const cert = process.env.WALLET_PASS_CERT_PEM?.replace(/\\n/g, "\n");
  if (!key || !cert) {
    return tokens.map((t) => ({ token: t, status: 0, reason: "لا شهادة على الخادم" }));
  }

  return await new Promise<PushResult[]>((resolve) => {
    const out: PushResult[] = [];
    let settled = false;

    /** مخرجٌ واحد: أوّلُ من يبلغه يُنهي الاتّصال — نجاحًا أو عطبًا أو مهلة. */
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        client.close();
      } catch {
        /* مغلقٌ سلفًا */
      }
      resolve(out);
    };

    // مهلةٌ صلبة: المعاينة تُعرَض حيًّا، ولا يُنتظَر خادمٌ صامتٌ أكثر من عشر ثوانٍ.
    const timer = setTimeout(() => {
      for (const t of tokens) if (!out.some((r) => r.token === t)) out.push({ token: t, status: 0, reason: "انتهت المهلة" });
      finish();
    }, 10_000);

    const client = connect(APNS, { key, cert, passphrase: process.env.WALLET_PASS_KEY_PASSPHRASE });

    client.on("error", (e) => {
      for (const t of tokens) if (!out.some((r) => r.token === t)) out.push({ token: t, status: 0, reason: e.message });
      finish();
    });

    client.on("connect", () => {
      let done = 0;
      for (const token of tokens) {
        const req = client.request({
          [constants.HTTP2_HEADER_METHOD]: "POST",
          [constants.HTTP2_HEADER_PATH]: `/3/device/${token}`,
          // **الموضوع وحده — ولا ترويسةَ سواه.** هذا هو الشكل الذي توثّقه أبل لتحديث
          // البطاقات، وكلُّ زيادةٍ عليه اجتهادٌ يضرّ:
          //
          // · كان هنا `apns-expiration: 0` — ومعناه «سلّمها الآن أو **أهملها**». وأبل
          //   تردّ ٢٠٠ (قَبِلتُها) ثمّ تُسقطها صامتةً إن كان الجهاز غيرَ متاحٍ تلك اللحظة
          //   بالذات — شاشةٌ مطفأة أو شبكةٌ تتنقّل. فيرى الدافعُ نجاحًا ولا يصل شيء.
          //   **وهذا ما وقع فعلًا** (٢٠٠ من أبل، ولا تحديثَ في الجهاز). وبإسقاطها تحفظها
          //   أبل وتُعيد المحاولة.
          // · وكان `apns-priority: 10` — وهي أولويّةُ ما يُوقظ الشاشة، ودفعتُنا **صامتة**
          //   بحمولةٍ خاوية. الخلط بينهما ممّا تعاقب عليه أبل بالخنق (throttling).
          "apns-topic": topic,
        });

        let body = "";
        let status = 0;
        req.on("response", (h) => {
          status = Number(h[constants.HTTP2_HEADER_STATUS] ?? 0);
        });
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          // أبل تشرح رفضها في `reason` — تُنقَل كما هي فالتشخيص من فمها لا من ظنّنا.
          let reason: string | undefined;
          try {
            reason = body ? (JSON.parse(body).reason as string) : undefined;
          } catch {
            reason = body.slice(0, 120) || undefined;
          }
          out.push({ token, status, reason });
          // ٤١٠ = حُذفت البطاقة من ذلك الجهاز؛ رمزُه ميّتٌ فيُسقَط.
          if (status === 410 || reason === "BadDeviceToken") void dropToken(token);
          done += 1;
          if (done === tokens.length) finish();
        });
        req.on("error", (e) => {
          out.push({ token, status: 0, reason: e.message });
          done += 1;
          if (done === tokens.length) finish();
        });
        req.end("{}"); // حمولةٌ خاوية — انظر رأس الملفّ
      }
    });
  });
}
