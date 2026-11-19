import { describe, expect, it } from "vitest";
import { ballotOrder } from "@/lib/elections/ballotOrder";

const cands = ["c-1", "c-2", "c-3", "c-4", "c-5"].map((id) => ({ id }));

describe("ballotOrder", () => {
  it("يُبقي المرشّحين أنفسهم بلا نقصٍ ولا تكرار", () => {
    expect(ballotOrder(cands, "u-1").map((c) => c.id).sort()).toEqual(cands.map((c) => c.id));
  });
  it("ثابتٌ للناخب نفسه في كلّ مرّة", () => {
    expect(ballotOrder(cands, "u-1")).toEqual(ballotOrder(cands, "u-1"));
  });
  it("لا يتبع ترتيبَ المدخلات", () => {
    expect(ballotOrder([...cands].reverse(), "u-1")).toEqual(ballotOrder(cands, "u-1"));
  });
  it("يختلف بين الناخبين، فلا يتصدّر واحدٌ عند الجميع", () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => ballotOrder(cands, `u-${i}`)[0].id));
    expect(firsts.size).toBeGreaterThan(2);
  });
});
