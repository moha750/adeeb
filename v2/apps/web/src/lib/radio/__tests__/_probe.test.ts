import { describe, it } from "vitest";
import { normalizeArabic } from "../arabicSearch";
describe("p", () => {
  it("q", () => {
    const cases = ["۹۹٪", "٩٩٪", "١٬٢٠٠", "٣٫٥"];
    for (const s of cases) {
      const out = normalizeArabic(s);
      // eslint-disable-next-line no-console
      console.log(`  [${[...s].map(c=>c.codePointAt(0)!.toString(16).toUpperCase()).join(" ")}] ⇒ «${out}» [${[...out].map(c=>c.codePointAt(0)!.toString(16).toUpperCase()).join(" ")}]`);
    }
  });
});
