import { describe, expect, it } from "vitest";
import { declareViewSubject, onViewSubject, viewSubjectOf } from "../viewSubject";

// سجلُّ موضوع الزيارة: الصفحةُ تُعلن، والمتتبّعُ يسأل أو يُصغي. والعطبُ الذي يحرسه هذا الملفّ أن تُنسب
// زيارةُ صفحةٍ إلى موضوع غيرها، أو أن يمحو خروجُ صفحةٍ إعلانَ التي بعدها.
const news = { kind: "news" as const, id: "cbab6e61-9f80-46d4-a2d7-fbf02fcc2fb9" };
const book = { kind: "book" as const, id: "3f8a1c2e-0b7d-4e5f-9a6b-1c2d3e4f5a6b" };

describe("viewSubject", () => {
  it("يجيب عن المسار المُعلَن وحده", () => {
    const off = declareViewSubject("/news/a", news);
    expect(viewSubjectOf("/news/a")).toEqual(news);
    expect(viewSubjectOf("/news/b")).toBeNull();
    off();
    expect(viewSubjectOf("/news/a")).toBeNull();
  });

  it("خروجُ صفحةٍ لا يمحو إعلانَ التي حلّت محلّها على المسار نفسه", () => {
    const offOld = declareViewSubject("/library/x", book);
    const fresh = { ...book };
    const offNew = declareViewSubject("/library/x", fresh);
    offOld();
    expect(viewSubjectOf("/library/x")).toBe(fresh);
    offNew();
    expect(viewSubjectOf("/library/x")).toBeNull();
  });

  it("يُبلغ المُصغين بالمسار والموضوع، ويكفّ عند الطلب", () => {
    const heard: string[] = [];
    const stop = onViewSubject((path, s) => heard.push(`${path}:${s.kind}`));
    const off1 = declareViewSubject("/s/abc", { kind: "survey", id: "76" });
    stop();
    const off2 = declareViewSubject("/s/def", { kind: "survey", id: "77" });
    expect(heard).toEqual(["/s/abc:survey"]);
    off1();
    off2();
  });

  it("مُصغٍ معطوبٌ لا يمنع الإعلان ولا غيرَه من المصغين", () => {
    const heard: string[] = [];
    const stopBad = onViewSubject(() => {
      throw new Error("x");
    });
    const stopGood = onViewSubject((path) => heard.push(path));
    const off = declareViewSubject("/news/c", news);
    expect(viewSubjectOf("/news/c")).toEqual(news);
    expect(heard).toEqual(["/news/c"]);
    stopBad();
    stopGood();
    off();
  });
});
