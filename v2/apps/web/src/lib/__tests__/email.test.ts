import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { explainEmailError } from "../email/errors";
import { EMAIL_KIND_SHAPE, emailKindEntries, emailKindOf } from "../email/kinds";
import { MAIL_MOODS, SITE, absoluteUrl, esc, renderLayout, senderName } from "../email/layout";
import { catalogEntries } from "../notifications/catalog";
import { renderNoteEmail } from "../notifications/render";

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
    // الرمزُ رقمٌ واحدٌ متّصلٌ يُحدَّد بلمسةٍ ويُنسخ نظيفًا، في الرسالة ونصّها البديل.
    expect(code.html).toContain(">305805<");
    expect(code.text).toContain("305805");
    expect(code.html).toContain("أدِيبتنا سارة");
    const rec = emailKindOf("auth.recovery")!.render({ name: null, gender: null, type: "recovery", hash: "pkce_abc", token: "1", redirect: "https://adeeb.club/reset-password", site: null });
    const u = new URL(rec.cta!.href);
    expect(u.pathname).toBe("/auth/v1/verify");
    expect(u.searchParams.get("token")).toBe("pkce_abc");
    expect(u.searchParams.get("type")).toBe("recovery");
    expect(u.searchParams.get("redirect_to")).toBe("https://adeeb.club/reset-password");
    expect(rec.paragraphs[0]).toBe("مرحبًا بك،");
  });

  it("كلُّ جدولٍ يصرّح باتّجاهه، فلا يقلبه Gmail حين يُسقط اتّجاهَ الصفحة", () => {
    const { html } = renderLayout(emailKindOf("auth.code")!.render(emailKindOf("auth.code")!.sample));
    const tables = html.match(/<table role="presentation"[^>]*>/g) ?? [];
    expect(tables.length).toBeGreaterThan(3);
    for (const t of tables) expect(t, t).toMatch(/\bdir="(rtl|ltr)"/);
  });

  it("اسمُ المُرسِل الجهةُ ثمّ النادي، ورسالةٌ بلا جهةٍ باسم النادي", () => {
    const code = emailKindOf("auth.code")!;
    expect(senderName(code.render(code.sample))).toBe("قسم نظم المعلومات، نادي أدِيب");
    expect(senderName({ subject: "x", title: "x", paragraphs: [] })).toBeNull();
  });

  it("الرابطُ الداخليّ يصير كاملًا على الموقع، والكاملُ يبقى", () => {
    expect(absoluteUrl("/dashboard")).toBe(`${SITE}/dashboard`);
    expect(absoluteUrl("https://adeeb.club/x")).toBe("https://adeeb.club/x");
  });
});

describe("ثوبُ ديبو", () => {
  it("لكلّ وجهٍ يلبسه البريدُ ملفُّه PNG (يخبزه scripts/mail-art.mjs)", () => {
    for (const mood of Object.keys(MAIL_MOODS)) {
      expect(fs.existsSync(path.join(__dirname, "../../../public/deebo/mail", `${mood}.png`)), mood).toBe(true);
    }
  });

  it("كلُّ رسالةٍ تحمل وجهَ ديبو والجهةَ والتوقيع، والوجهُ من المعروف", () => {
    for (const [key, kind] of emailKindEntries()) {
      const c = kind.render(kind.sample);
      if (c.mood) expect(MAIL_MOODS[c.mood], key).toBeDefined();
      const { html } = renderLayout(c);
      expect(html, key).toContain("/deebo/mail/");
      expect(html, key).toContain(esc(c.unit?.trim() || "نادي أدِيب"));
    }
  });

  it("بريدُ كلّ إشعارٍ يُرسَم للجنسين: تحيّةٌ بالاسم، وجهةُ القسم، وبياناتٌ لا تخلو قيمُها", () => {
    const note = emailKindOf("notify.note")!;
    for (const [key, kind] of catalogEntries()) {
      for (const a of kind.audiences.filter((x) => x.email)) {
        for (const g of ["male", "female", null] as const) {
          const d = renderNoteEmail(key, a.key, kind.sample, g, "سارة محمد");
          const c = note.render(d);
          expect(c.paragraphs[0], `${key}/${a.key}`).toContain("سارة محمد");
          expect(d.unit, `${key}/${a.key}`).toBeTruthy();
          for (const f of d.facts ?? []) {
            expect(f.label.trim(), `${key}/${a.key}`).not.toBe("");
            expect(f.value.trim(), `${key}/${a.key}`).not.toBe("");
          }
          if (d.mood) expect(MAIL_MOODS[d.mood], `${key}/${a.key}`).toBeDefined();
        }
      }
    }
  });
});


describe("سببُ التعثّر بالعربيّة (سجلّ البريد)", () => {
  it("يقول ردودَ المزوّد ووقائعَ الصادر جملةً عربيّة", () => {
    expect(explainEmailError(null)).toBeNull();
    expect(explainEmailError("expired")).toBe("فات أجلُها قبل أن تخرج");
    expect(explainEmailError("503: upstream ؛ expired")).toBe("فات أجلُها قبل أن تخرج");
    expect(explainEmailError("RESEND_API_KEY غيرُ مضبوطٍ في الخادم")).toBe("مفتاحُ المزوّد غيرُ مضبوطٍ في الخادم");
    expect(explainEmailError("network: fetch failed")).toBe("انقطع الاتّصالُ بالمزوّد");
    expect(explainEmailError("render: x")).toBe("تعذّر رسمُها من قالبها");
    expect(explainEmailError("429: rate limit")).toBe("المزوّدُ مزدحم");
    expect(explainEmailError("502: bad gateway")).toBe("المزوّدُ متعطّلٌ مؤقّتًا");
    expect(explainEmailError('401: {"message":"API key is invalid"}')).toBe("رفض المزوّدُ المفتاح");
    expect(explainEmailError('403: {"message":"The adeeb.club domain is not verified"}')).toBe("النطاقُ غيرُ موثَّقٍ عند المزوّد");
    expect(explainEmailError('422: {"message":"Invalid `to` field"}')).toBe("عنوانُ المستلم غيرُ صالح");
    expect(explainEmailError("418: teapot")).toBe("ردّها المزوّدُ (418)");
  });
});
