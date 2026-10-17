import { describe, expect, it } from "vitest";
import { EMAIL_KIND_SHAPE, emailKindEntries, emailKindOf } from "../email/kinds";
import { SITE, absoluteUrl, esc, renderLayout } from "../email/layout";

/**
 * حارسُ دليل البريد (`v2/EMAIL-SYSTEM.md`): كلُّ نوعٍ يُرسَم بعيّنته رسالةً تامّة، ولا يدخل الرسالةَ
 * وسمٌ من الحقائق، ولا يخرج نصٌّ مرئيٌّ بشَرطةٍ طويلة (قاعدةُ `no-separators` في المرئيّ).
 */
describe("دليل البريد", () => {
  it("كلُّ نوعٍ صحيحُ المفتاح ويُرسَم بعيّنته", () => {
    for (const [key, kind] of emailKindEntries()) {
      expect(key, key).toMatch(EMAIL_KIND_SHAPE);
      expect(kind.when.trim(), key).not.toBe("");
      const c = kind.render(kind.sample);
      expect(c.subject.trim(), key).not.toBe("");
      expect(c.title.trim(), key).not.toBe("");
      const { html, text } = renderLayout(c);
      expect(html, key).toContain('dir="rtl"');
      expect(text, key).toContain(c.title);
      for (const s of [c.subject, c.title, ...c.paragraphs, c.note ?? ""]) expect(s, key).not.toContain("—");
      if (c.cta) expect(html, key).toContain(`href="${esc(absoluteUrl(c.cta.href))}"`);
    }
  });

  it("ما كتبه بشرٌ يُهرَّب ولا يصير وسمًا", () => {
    const k = emailKindOf("notify.note")!;
    const { html } = renderLayout(k.render({ title: `صار <script>x</script> "مشرفًا"`, body: "عن <b>الإدارة</b> & غيرها", href: "/dashboard" }));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; غيرها");
  });

  it("رسائلُ المصادقة: الرمزُ بارز، ورابطُ التأكيد نقطةُ verify ببصمته ونوعه ووجهته", () => {
    const code = renderLayout(emailKindOf("auth.code")!.render({ name: "سارة", gender: "female", type: "magiclink", hash: null, token: "305805", redirect: null, site: null }));
    expect(code.html).toContain("305805");
    expect(code.html).toContain("أدِيبتنا سارة");
    const rec = emailKindOf("auth.recovery")!.render({ name: null, gender: null, type: "recovery", hash: "pkce_abc", token: "1", redirect: "https://adeeb.club/reset-password", site: null });
    const u = new URL(rec.cta!.href);
    expect(u.pathname).toBe("/auth/v1/verify");
    expect(u.searchParams.get("token")).toBe("pkce_abc");
    expect(u.searchParams.get("type")).toBe("recovery");
    expect(u.searchParams.get("redirect_to")).toBe("https://adeeb.club/reset-password");
    expect(rec.paragraphs[0]).toBe("مرحبًا بك،");
  });

  it("الرابطُ الداخليّ يصير كاملًا على الموقع، والكاملُ يبقى", () => {
    expect(absoluteUrl("/dashboard")).toBe(`${SITE}/dashboard`);
    expect(absoluteUrl("https://adeeb.club/x")).toBe("https://adeeb.club/x");
  });
});
