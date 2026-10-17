import { describe, expect, it } from "vitest";
import { avatarFace, GENDER_FIGURE } from "@/lib/avatarFace";

/** سلسلةُ وجهِ مَن لا صورةَ له: الصورةُ تغلب، فالجنس، فأيقونةُ المستخدم. ولا أحرفَ أبدًا. */
describe("avatarFace", () => {
  it("الصورةُ تغلب الجنسَ", () => {
    expect(avatarFace("/a.jpg", "female")).toEqual({ kind: "photo", url: "/a.jpg" });
  });

  it("بلا صورة: رسمُ الجنس", () => {
    expect(avatarFace(null, "male")).toEqual({ kind: "figure", url: GENDER_FIGURE.male });
    expect(avatarFace("", "female")).toEqual({ kind: "figure", url: GENDER_FIGURE.female });
  });

  it("بلا صورة ولا جنس: أيقونةُ المستخدم", () => {
    expect(avatarFace()).toEqual({ kind: "icon" });
    expect(avatarFace(null, null)).toEqual({ kind: "icon" });
  });

  it("جنسٌ غريبٌ لا يُفهرَس به: أيقونةُ المستخدم", () => {
    expect(avatarFace(null, "toString")).toEqual({ kind: "icon" });
    expect(avatarFace(null, "ذكر")).toEqual({ kind: "icon" });
  });
});
