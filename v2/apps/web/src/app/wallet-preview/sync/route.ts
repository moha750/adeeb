/**
 * **المزامنة** — البابُ الذي يُكتب منه كلُّ تغييرٍ في الأختام: يحفظ الحالة في القاعدة ثمّ
 * يدفع نبضةً صامتةً إلى كلّ جهازٍ سجّل هذه البطاقة.
 *
 * `POST /wallet-preview/sync` — **وله لسانان يخدمان مستدعِيَين**:
 *
 * | الجسم | مَن يستعمله | لماذا |
 * |---|---|---|
 * | `{ member, mode, … }` | لوحُ التجربة في الصفحة | يضبط **قيمةً مطلقة** (اقفز · صفّر) |
 * | `{ serial, action }` | صفحةُ المسح عند الباب | يطلب **فعلًا** يُطبَّق على المقروء |
 *
 * **والنظامان يمرّان من هنا معًا**: الرقمُ التسلسليّ يقول لأيّهما هو (`modeOfSerial`)،
 * فأفعالُ الأختام (`stamp` · `claim`) لبطاقةِ أختام، وأفعالُ النقاط (`earn:<فعل>` ·
 * `redeem:<مكافأة>`) لبطاقةِ نقاط. ولا يُقبَل فعلُ نظامٍ على بطاقةِ الآخر.
 *
 * **والفرق ليس ترفًا**: الماسحُ لا يعرف الحالة الراهنة ولا ينبغي أن يرسلها — لو أرسل
 * «اجعلها ٦» وكان ماسحٌ آخرُ قد ختم قبله بثانية، لَمحا ختمَه. فالفعلُ يُقرأ من القاعدة
 * ويُطبَّق عليها، فلا يضيع ختمٌ بين ماسحَين.
 *
 * **ويردّ ما جرى لكلّ جهازٍ بصدق** (`devices` · `pushed` · `failures`): الدفعةُ الصامتة
 * تفشل صامتةً بطبعها، وأسوأُ ما في عرضٍ حيٍّ أن يضغط المالك ولا يدري: أوصلت أم لا؟
 *
 * **ولا حراسةَ عليه** — والوعيُ بذلك مقصود: بياناتُه أربعُ بطاقاتٍ وهميّة في جدولٍ مؤقّت،
 * وأقصى ما يفعله عابثٌ أن يبدّل عددَ أختامٍ متخيَّلة. حراسةٌ حقيقيّة موضعُها النظامُ
 * الحقيقيّ، وهناك يكون الختمُ فعلًا له قدرةٌ وسجلّ.
 */

import { NextResponse } from "next/server";
import { pushToDevices } from "../apns";
import {
  affordable,
  earnByKey,
  GOAL,
  isComplete,
  memberById,
  memberBySerial,
  type Mode,
  modeOfSerial,
  rewardByKey,
  serialFor,
  TOP_COST,
} from "../demo";
import { patchObject } from "../google";
import { getCard, setCard, tokensFor } from "../store";

export const runtime = "nodejs";

type Body = {
  member?: string;
  mode?: Mode;
  stamps?: number;
  cycles?: number;
  points?: number;
  redemptions?: number;
  serial?: string;
  /** `stamp` · `claim` للأختام، و`earn:<فعل>` · `redeem:<مكافأة>` للنقاط. */
  action?: string;
};

/** رقعةُ الصفّ — لا تحمل إلّا أعمدةَ النظام المعنيّ (انظر `setCard`). */
type Patch = { stamps?: number; cycles?: number; points?: number; redemptions?: number };

export async function POST(req: Request): Promise<Response> {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "جسمٌ غير صالح." }, { status: 400 });
  }

  let serial: string;
  let patch: Patch;

  if (body.serial) {
    // ── لسانُ الفعل (صفحة المسح) ──
    const holder = memberBySerial(body.serial);
    const mode = modeOfSerial(body.serial);
    if (!holder || !mode) return NextResponse.json({ error: "بطاقةٌ غير معروفة." }, { status: 404 });
    serial = serialFor(holder, mode);

    // الحالةُ تُقرأ الآن لا تُؤخَذ من المستدعي — انظر رأس الملفّ.
    const card = await getCard(serial);

    if (mode === "points") {
      const now = { points: card?.points ?? holder.points, redemptions: card?.redemptions ?? holder.redemptions };
      const [verb, key = ""] = (body.action ?? "").split(":");

      if (verb === "redeem") {
        const reward = rewardByKey(key);
        if (!reward) return NextResponse.json({ error: "مكافأةٌ غير معروفة." }, { status: 400 });
        // لا تُصرَف مكافأةٌ لا يبلغها الرصيد — والحارسُ هنا لا في الواجهة وحدها.
        if (now.points < reward.cost) {
          return NextResponse.json({ error: "الرصيد لا يكفي هذه المكافأة." }, { status: 409 });
        }
        // **يُخصَم ثمنُها ولا يُصفَّر الرصيد** — وهذا فرقُ النقاط عن الأختام: ما زاد يبقى.
        patch = { points: now.points - reward.cost, redemptions: now.redemptions + 1 };
      } else {
        const earn = earnByKey(key);
        if (verb !== "earn" || !earn) return NextResponse.json({ error: "فعلٌ غير معروف." }, { status: 400 });
        patch = { points: Math.min(TOP_COST, now.points + earn.points) };
      }
    } else {
      const now = { stamps: card?.stamps ?? holder.stamps, cycles: card?.cycles ?? holder.cycles };

      if (body.action === "claim") {
        // لا تُصرَف مكافأةُ بطاقةٍ لم تكتمل — والحارسُ هنا لا في الواجهة وحدها.
        if (!isComplete(now.stamps)) {
          return NextResponse.json({ error: "البطاقة لم تكتمل بعد." }, { status: 409 });
        }
        patch = { stamps: 0, cycles: now.cycles + 1 };
      } else if (body.action === "stamp") {
        // الختمُ عند الاكتمال لا يزيد شيئًا — العاشرةُ سقفٌ حتى تُصرَف المكافأة.
        patch = { stamps: Math.min(GOAL, now.stamps + 1), cycles: now.cycles };
      } else {
        return NextResponse.json({ error: "فعلٌ غير معروف." }, { status: 400 });
      }
    }
  } else {
    // ── لسانُ القيمة المطلقة (لوح التجربة) ──
    const holder = memberById(body.member ?? "");
    const mode: Mode = body.mode ?? "stamps";
    serial = serialFor(holder, mode);

    // تُقصّ إلى مداها فلا يصنع طلبٌ مشوَّهٌ بطاقةً مستحيلة (والقاعدة تحرسها ثانيةً بـ`check`).
    const whole = (v: unknown, max: number): number => Math.min(max, Math.max(0, Math.trunc(Number(v) || 0)));

    patch =
      mode === "points"
        ? { points: whole(body.points, TOP_COST), redemptions: whole(body.redemptions, 999) }
        : { stamps: whole(body.stamps, GOAL), cycles: whole(body.cycles, 999) };
  }

  const card = await setCard(serial, patch);
  if (!card) {
    return NextResponse.json({ error: "تعذّر حفظ الحالة. تحقّق من مفتاح الخدمة." }, { status: 503 });
  }

  const tokens = await tokensFor(serial);
  const topic = process.env.WALLET_PASS_TYPE_ID;

  /**
   * **المحفظتان تُبلَّغان معًا وبالتوازي**: أبل بدفعةٍ صامتة يجلب بعدها الجهازُ نسخته،
   * وقوقل بـ`PATCH` على الكائن عندها. ولا تنتظر إحداهما الأخرى — بطؤُهما يُجمَع لا يُخفى.
   *
   * **وفشلُ إحداهما لا يُسقط الأخرى**: من حمل البطاقة في أندرويد لا يخسر تحديثَه لأنّ
   * أبل تعثّرت، والعكس.
   */
  const holder = memberBySerial(serial);
  const mode = modeOfSerial(serial);
  const origin = new URL(req.url).origin;

  const [results, google] = await Promise.all([
    topic ? pushToDevices(tokens, topic) : Promise.resolve([]),
    holder && mode
      ? patchObject(
          { ...holder, stamps: card.stamps, cycles: card.cycles, points: card.points, redemptions: card.redemptions },
          mode,
          origin,
        )
      : Promise.resolve(null),
  ]);

  return NextResponse.json(
    {
      serial: card.serial,
      stamps: card.stamps,
      cycles: card.cycles,
      points: card.points,
      redemptions: card.redemptions,
      // ما يكفيه رصيدُه الآن — تعرضه صفحةُ المسح بلا حسابٍ ثانٍ عندها
      canRedeem: affordable(card.points).map((r) => r.key),
      // زمنُ التغيير — به تعرف الصفحةُ أنّ هذا أحدثُ ممّا عندها (`useLiveCards`)
      updatedAt: card.updatedAt,
      devices: tokens.length,
      pushed: results.filter((r) => r.status === 200).length,
      // خبرُ قوقل مستقلٌّ عن خبر أبل — محفظتان لا واحدة
      google,
      // الفاشلة وحدها تُعرَض — والناجحة يكفيها عددُها
      failures: results.filter((r) => r.status !== 200).map((r) => ({ status: r.status, reason: r.reason })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
