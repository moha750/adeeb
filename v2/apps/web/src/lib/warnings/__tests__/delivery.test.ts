/**
 * مِعيارُ تسليم الإشعار — **القاعدةُ المقيسة هي منعُ الإرسال المكرّر**: من أُرسل إليه لا
 * يُرسَل إليه ثانيةً، ومن ماتت مطالبتُه لا يبقى محبوسًا فيها أبدًا.
 */
import { describe, expect, it } from "vitest";
import {
  DELIVERY_RANK, STALE_CLAIM_MINUTES, advancesTo, deliveryLabel, deliveryTone, maySend, sendBlockedWhy,
} from "../delivery";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

describe("maySend", () => {
  it("يأذن لمن لم يُرسَل بعد", () => {
    expect(maySend(null)).toBe(true);
    expect(maySend("pending")).toBe(true);
  });

  it("يأذن بإعادة ما فشل", () => {
    expect(maySend("failed")).toBe(true);
  });

  it("**يمنع** ما خرج فعلًا : مُرسَلًا كان أو واصلًا أو مقروءًا", () => {
    expect(maySend("sent")).toBe(false);
    expect(maySend("delivered")).toBe(false);
    expect(maySend("read")).toBe(false);
  });

  it("يمنع المطالَبَ الحديث ويأذن للمتروك", () => {
    expect(maySend("processing", minutesAgo(1))).toBe(false);
    expect(maySend("processing", minutesAgo(STALE_CLAIM_MINUTES - 1))).toBe(false);
    expect(maySend("processing", minutesAgo(STALE_CLAIM_MINUTES + 1))).toBe(true);
    // بلا طابعٍ لا يُخمَّن : الأصلُ المنع
    expect(maySend("processing")).toBe(false);
    expect(maySend("processing", "ليس تاريخًا")).toBe(false);
  });
});

describe("مفردات التسليم", () => {
  it("تقول الحالَ عربيًّا، والمجهولُ يُقال كما هو", () => {
    expect(deliveryLabel("read")).toBe("قُرئ");
    expect(deliveryLabel("something_new")).toBe("something_new");
  });

  it("تُنغّم الوصولَ سارًّا والفشلَ خطرًا", () => {
    expect(deliveryTone("delivered")).toBe("success");
    expect(deliveryTone("read")).toBe("success");
    expect(deliveryTone("failed")).toBe("danger");
    expect(deliveryTone("pending")).toBe("neutral");
  });

  it("تقول لماذا عُطّل الزرّ", () => {
    expect(sendBlockedWhy("processing")).toContain("جارٍ");
    expect(sendBlockedWhy("delivered")).toContain("مرّتين");
  });
});

/**
 * **ترتيبُ الحال** — القاعدةُ التي أقرّها المالك في ٢٠٢٦-٠٨-٢١، ومصدرُها أنّ YCloud لا
 * تضمن ترتيبَ أحداث `whatsapp.message.updated`. وهذا المِعيارُ هو الحارسُ على التوأم في
 * `supabase/functions/whatsapp-webhook/index.ts`.
 */
describe("advancesTo", () => {
  it("«أُرسل» يقبل الفشلَ والوصولَ والقراءة", () => {
    expect(advancesTo("sent", "failed")).toBe(true);
    expect(advancesTo("sent", "delivered")).toBe(true);
    expect(advancesTo("sent", "read")).toBe(true);
  });

  it("«لم يصل» يقبل الوصولَ والقراءة : فشلٌ تأخّر عن حقيقة الوصول", () => {
    expect(advancesTo("failed", "delivered")).toBe(true);
    expect(advancesTo("failed", "read")).toBe(true);
  });

  it("«وصل» لا يقبل إلّا القراءة", () => {
    expect(advancesTo("delivered", "read")).toBe(true);
    expect(advancesTo("delivered", "sent")).toBe(false);
  });

  it("**الفشلُ المتأخّر لا يُنزِل ما وصل ولا ما قُرئ**", () => {
    expect(advancesTo("delivered", "failed")).toBe(false);
    expect(advancesTo("read", "failed")).toBe(false);
  });

  it("«قُرئ» نهائيّةٌ لا يعلوها شيء", () => {
    for (const s of ["pending", "processing", "sent", "failed", "delivered", "read"]) {
      expect(advancesTo("read", s)).toBe(false);
    }
  });

  it("لا حالَ تتقدّم على نفسها، ولا ترجع إلى ما دونها", () => {
    for (const s of Object.keys(DELIVERY_RANK)) expect(advancesTo(s, s)).toBe(false);
    expect(advancesTo("sent", "processing")).toBe(false);
    expect(advancesTo("processing", "pending")).toBe(false);
  });

  it("حالٌ لا تُعرَف لا تُكتب", () => {
    expect(advancesTo("sent", "expired")).toBe(false);
    expect(advancesTo("unknown", "read")).toBe(false);
  });

  it("والمِطالبةُ تتقدّم على الانتظار، والإرسالُ عليها", () => {
    expect(advancesTo("pending", "processing")).toBe(true);
    expect(advancesTo("processing", "sent")).toBe(true);
  });
});
