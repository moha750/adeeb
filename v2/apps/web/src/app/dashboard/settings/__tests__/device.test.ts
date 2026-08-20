import { describe, expect, it } from "vitest";
import { describeDevice, deviceKind } from "../vocab";

/**
 * **قارئُ سلسلة الجهاز** — يقرؤه العضوُ ليجيب سؤالًا واحدًا: «أهذه جلستي من جوّالي أم من
 * حاسبٍ تركتُه مفتوحًا؟». فالمِعيارُ يحرس صدقَ الجواب لا دقّةَ التصنيف: ما لا يُعرَف يُقال
 * مجهولًا ولا يُخمَّن، وترتيبُ الفحص يُحفَظ لأنّ عكسَه يقلب اللوحيَّ حاسبًا والجوّالَ لوحيًّا.
 */

const UA = {
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  androidPhone: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
  androidTablet: "Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  windowsEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0",
  firefox: "Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0",
};

describe("describeDevice", () => {
  it("متصفّحٌ ونظامٌ في جملةٍ عربيّة", () => {
    expect(describeDevice(UA.mac)).toBe("Chrome على macOS");
    expect(describeDevice(UA.iphone)).toBe("Safari على iPhone");
    expect(describeDevice(UA.firefox)).toBe("Firefox على Linux");
  });

  // Edge وOpera يحملان `Chrome` في سلسلتهما — فترتيبُ الفحص هو الذي يفرّقهما
  it("Edge لا يُقرأ Chrome، وترتيبُ الفحص هو الحارس", () => {
    expect(describeDevice(UA.windowsEdge)).toBe("Edge على Windows");
  });

  it("ما لا يُعرَف يُقال مجهولًا ولا يُخمَّن", () => {
    expect(describeDevice(null)).toBe("جهازٌ غير معروف");
    expect(describeDevice("")).toBe("جهازٌ غير معروف");
    expect(describeDevice("curl/8.4.0")).toBe("جهازٌ غير معروف");
  });
});

describe("deviceKind", () => {
  it("الجوّالُ جوّال والحاسبُ حاسب", () => {
    expect(deviceKind(UA.iphone)).toBe("phone");
    expect(deviceKind(UA.androidPhone)).toBe("phone");
    expect(deviceKind(UA.mac)).toBe("desktop");
    expect(deviceKind(UA.windowsEdge)).toBe("desktop");
    expect(deviceKind(UA.firefox)).toBe("desktop");
  });

  /* اللوحيُّ هو موضعُ الزلل: سلسلةُ الآيباد تحمل `Mac OS X`، وسلسلةُ اللوحيّ الأندرويديّ
     تحمل `Android` بلا `Mobile`. فلو سبق الفحصُ العامُّ الخاصَّ لصار الأوّلُ حاسبًا والثاني
     جوّالًا — وهذا ما يحرسه هذان السطران. */
  it("اللوحيُّ لا يصير حاسبًا ولا جوّالًا", () => {
    expect(deviceKind(UA.ipad)).toBe("tablet");
    expect(deviceKind(UA.androidTablet)).toBe("tablet");
  });

  it("ما لا سلسلةَ له مجهولٌ لا حاسب", () => {
    expect(deviceKind(null)).toBe("unknown");
    expect(deviceKind("curl/8.4.0")).toBe("unknown");
  });
});
