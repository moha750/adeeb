import { describe, expect, it } from "vitest";
import { KIND_SHAPE, LEVELS, SECTIONS, catalogEntries } from "../notifications/catalog";
import { internalHref, renderNote } from "../notifications/render";
import type { Address, Gender } from "../notifications/types";

/**
 * حارسُ الدليل (`v2/NOTIFICATIONS-SYSTEM.md` §٧): كلُّ مدخلٍ يُرسَم بعيّنته للجنسين ولمن لا جنسَ له،
 * فلا يخلو نصّ، ولا يخرج رابطٌ عن الموقع، ولا يُكتب عنوانٌ بشكلٍ لا تعرفه القاعدة.
 * والدليلُ يبدأ فارغًا: الحارسُ يقف على كلّ ما يُضاف إليه في التبويبات.
 */

const GENDERS: Gender[] = ["male", "female", null];

/** توأمُ فروع `notification_recipients` في القاعدة: شكلٌ لا يُعرف هناك يُسقط التوزيع. */
function isAddress(a: Address): boolean {
  const o = a as Record<string, unknown>;
  if ("user" in o) return typeof o.user === "string" && /^[0-9a-f-]{36}$/i.test(o.user);
  if ("seat" in o) {
    return (
      typeof o.seat === "string" &&
      o.seat.length > 0 &&
      (o.committee === undefined || Number.isInteger(o.committee)) &&
      (o.department === undefined || Number.isInteger(o.department))
    );
  }
  if ("capability" in o) return typeof o.capability === "string" && o.capability.length > 0;
  if ("committee" in o) return Number.isInteger(o.committee);
  if ("standing" in o) return o.standing === "member" || o.standing === "volunteer";
  return false;
}

describe("دليل الإشعارات", () => {
  it("كلُّ مدخلٍ صحيحُ المفتاح والقسم، ومخاطَبوه مفاتيحُهم فريدة", () => {
    for (const [key, kind] of catalogEntries()) {
      expect(key, key).toMatch(KIND_SHAPE);
      expect(SECTIONS[kind.section], key).toBeDefined();
      expect(kind.when.trim(), key).not.toBe("");
      expect(kind.audiences.length, key).toBeGreaterThan(0);
      const keys = kind.audiences.map((a) => a.key);
      expect(new Set(keys).size, key).toBe(keys.length);
      for (const a of kind.audiences) expect(LEVELS[a.level], `${key}/${a.key}`).toBeDefined();
    }
  });

  it("كلُّ مخاطَبٍ يُرسَم بعيّنته للجنسين: عنوانٌ قائم، ورابطٌ داخليّ، وعناوينُ تعرفها القاعدة", () => {
    for (const [key, kind] of catalogEntries()) {
      for (const a of kind.audiences) {
        const to = a.to(kind.sample);
        expect(to.length, `${key}/${a.key}`).toBeGreaterThan(0);
        for (const addr of to) expect(isAddress(addr), `${key}/${a.key} ${JSON.stringify(addr)}`).toBe(true);
        for (const g of GENDERS) {
          const note = renderNote(key, a.key, kind.sample, g);
          expect(note.title.trim(), `${key}/${a.key}/${g}`).not.toBe("");
          expect(note.title, `${key}/${a.key}/${g}`).not.toBe("إشعار");
          expect(note.href, `${key}/${a.key}/${g}`).not.toBeNull();
        }
      }
    }
  });
});

describe("رسم الإشعار", () => {
  it("نوعٌ ليس في الدليل يُرسَم بعنوانه الاحتياطيّ بلا وِجهة، ولا يرمي", () => {
    const note = renderNote("gone.kind", "x", {}, "female", "قُبل طلبُك");
    expect(note.title).toBe("قُبل طلبُك");
    expect(note.href).toBeNull();
    expect(renderNote("gone.kind", "x", null, null).title).toBe("إشعار");
  });

  it("الرابطُ داخليٌّ أو لا شيء", () => {
    expect(internalHref("/me")).toBe("/me");
    expect(internalHref("/dashboard/volunteering?id=3")).toBe("/dashboard/volunteering?id=3");
    expect(internalHref("//evil.example")).toBeNull();
    // المتصفّحُ يقرأ الخطَّ العكسيّ `/` ويَنزع الفراغاتِ الخفيّة: كلاهما بابٌ إلى خارج الموقع
    expect(internalHref("/\\evil.example")).toBeNull();
    expect(internalHref("/\t/evil.example")).toBeNull();
    expect(internalHref("/me\\..\\x")).toBeNull();
    expect(internalHref("/me#volunteering")).toBe("/me#volunteering");
    expect(internalHref("https://evil.example")).toBeNull();
    expect(internalHref("")).toBeNull();
    expect(internalHref(null)).toBeNull();
  });

  it("صيغةُ المفتاح توأمُ قيد القاعدة", () => {
    expect(KIND_SHAPE.test("volunteering.accepted")).toBe(true);
    expect(KIND_SHAPE.test("elections.vote_opened")).toBe(true);
    expect(KIND_SHAPE.test("volunteering")).toBe(false);
    expect(KIND_SHAPE.test("Volunteering.Accepted")).toBe(false);
    expect(KIND_SHAPE.test("تطوع.قبول")).toBe(false);
  });
});
