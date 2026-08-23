import { describe, expect, it } from "vitest";
import {
  QR_ALPHABET,
  QR_CODE_LEN,
  checkTarget,
  deviceFrom,
  isBotAgent,
  isQrCode,
  newQrCode,
  qrPath,
  qrShortUrl,
  referrerHost,
} from "@/lib/qrLinks";

const ORIGIN = "https://adeeb.club";

describe("رمزُ الرابط القصير", () => {
  it("يخرج بالطول المقرَّر ومن الأبجديّة وحدها", () => {
    for (let i = 0; i < 200; i++) {
      const code = newQrCode();
      expect(code).toHaveLength(QR_CODE_LEN);
      for (const ch of code) expect(QR_ALPHABET).toContain(ch);
      expect(isQrCode(code)).toBe(true);
    }
  });

  it("لا يحمل محرفًا ملتبِسًا: صفرًا ولا واحدًا ولا o ولا l ولا i", () => {
    for (const ch of "01oli") expect(QR_ALPHABET).not.toContain(ch);
  });

  it("يردّ ما ليس على شكله: طولًا زائدًا أو ناقصًا أو محرفًا خارج الأبجديّة", () => {
    expect(isQrCode("abc")).toBe(false);
    expect(isQrCode("abcdefgh")).toBe(false);
    expect(isQrCode("abcde0f")).toBe(false); // صفر
    expect(isQrCode("ABCDEFG")).toBe(false); // كبيرة
    expect(isQrCode("")).toBe(false);
    expect(isQrCode("abcde f")).toBe(false);
  });

  it("يبني الرابط بلا شرطتين ولو انتهى الأصلُ بشرطة", () => {
    expect(qrPath("abcdefg")).toBe("/q/abcdefg");
    expect(qrShortUrl("abcdefg", ORIGIN)).toBe("https://adeeb.club/q/abcdefg");
    expect(qrShortUrl("abcdefg", "https://adeeb.club/")).toBe("https://adeeb.club/q/abcdefg");
  });
});

describe("تصديقُ الوجهة", () => {
  it("يقبل http و https", () => {
    expect(checkTarget("https://adeeb.club/news", ORIGIN)).toMatchObject({ ok: true });
    expect(checkTarget("http://example.com", ORIGIN)).toMatchObject({ ok: true });
  });

  it("يقصّ الفراغ حول الوجهة", () => {
    const r = checkTarget("  https://example.com/a  ", ORIGIN);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.url).toBe("https://example.com/a");
  });

  it("**يردّ ما ليس بروتوكولَ ويب**: تلك هي ثغرةُ التحويل المفتوح", () => {
    expect(checkTarget("javascript:alert(1)", ORIGIN).ok).toBe(false);
    expect(checkTarget("data:text/html;base64,PHNjcmlwdD4=", ORIGIN).ok).toBe(false);
    expect(checkTarget("file:///etc/passwd", ORIGIN).ok).toBe(false);
    expect(checkTarget("ftp://example.com", ORIGIN).ok).toBe(false);
  });

  it("يردّ الفارغَ وما ليس رابطًا وما نقص اسمُ موقعه", () => {
    expect(checkTarget("", ORIGIN).ok).toBe(false);
    expect(checkTarget("   ", ORIGIN).ok).toBe(false);
    expect(checkTarget("adeeb.club", ORIGIN).ok).toBe(false); // بلا بروتوكول
    expect(checkTarget("https://localhost", ORIGIN).ok).toBe(false); // بلا نقطة
  });

  it("يردّ رمزًا يشير إلى رمزٍ من رموزنا: دورةٌ لا تنتهي", () => {
    expect(checkTarget("https://adeeb.club/q/abcdefg", ORIGIN).ok).toBe(false);
    // وموقعٌ آخرُ له مسارٌ مشابهٌ ليس دورة
    expect(checkTarget("https://example.com/q/abcdefg", ORIGIN).ok).toBe(true);
    // وصفحاتُنا الأخرى تُقبَل: القيدُ على بابِ الرموز وحده
    expect(checkTarget("https://adeeb.club/news", ORIGIN).ok).toBe(true);
  });

  it("يردّ الطويلَ الذي لا يسعه العمود", () => {
    expect(checkTarget(`https://example.com/${"a".repeat(2100)}`, ORIGIN).ok).toBe(false);
  });
});

describe("فصلُ الآلة عن الإنسان", () => {
  it("يَسِمُ معايناتِ الروابط والزوّاحف", () => {
    expect(isBotAgent("WhatsApp/2.23.20")).toBe(true);
    expect(isBotAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotAgent("Twitterbot/1.0")).toBe(true);
    expect(isBotAgent("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isBotAgent("curl/8.4.0")).toBe(true);
    expect(isBotAgent("TelegramBot (like TwitterBot)")).toBe(true);
  });

  it("يَسِمُ من جاء بلا بصمةِ عميل: كلُّ كاميرا تعرّف نفسَها", () => {
    expect(isBotAgent(null)).toBe(true);
    expect(isBotAgent("")).toBe(true);
  });

  it("ولا يَسِمُ هاتفًا حقيقيًّا", () => {
    expect(isBotAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")).toBe(false);
    expect(isBotAgent("Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")).toBe(false);
  });
});

describe("الجهازُ من بصمة العميل", () => {
  it("يفرّق الجوّالَ من اللوحيّ من الحاسوب", () => {
    expect(deviceFrom("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")).toBe("mobile");
    expect(deviceFrom("Mozilla/5.0 (Linux; Android 14; SM-S918B) Chrome/120 Mobile Safari/537.36")).toBe("mobile");
    expect(deviceFrom("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1")).toBe("tablet");
    expect(deviceFrom("Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome/120 Safari/537.36")).toBe("tablet");
    expect(deviceFrom("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120")).toBe("desktop");
    expect(deviceFrom("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120")).toBe("desktop");
  });

  it("والمجهولُ يبقى مجهولًا ولا يُعَدّ حاسوبًا", () => {
    expect(deviceFrom(null)).toBe("unknown");
    expect(deviceFrom("شيءٌ لا يُعرَف")).toBe("unknown");
  });
});

describe("المُحيل", () => {
  it("يُختصَر إلى اسم موقعه بلا www", () => {
    expect(referrerHost("https://www.google.com/search?q=adeeb")).toBe("google.com");
    expect(referrerHost("https://x.com/adeeb/status/1")).toBe("x.com");
  });

  it("وما ليس رابطًا لا يُخترَع له اسم", () => {
    expect(referrerHost(null)).toBeNull();
    expect(referrerHost("ليس رابطًا")).toBeNull();
  });
});
