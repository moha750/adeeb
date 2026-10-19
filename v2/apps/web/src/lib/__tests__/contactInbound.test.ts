import { describe, expect, it } from "vitest";
import { messageIdFrom, replyAddressFor, stripQuoted } from "@/lib/contact/inbound";
import { CLUB_EMAIL } from "@/lib/clubContact";

const ID = "3f2a9c1e-4b7d-4e2a-9c1e-0a1b2c3d4e5f";
const D = "reply.adeeb.club";

describe("ردُّ المُرسِل على ردّنا", () => {
  it("العنوانُ خاصٌّ بالرسالة إن ضُبط النطاق، وإلّا بريدُ النادي", () => {
    expect(replyAddressFor(ID, D)).toBe(`r+${ID}@${D}`);
    expect(replyAddressFor(ID, null)).toBe(CLUB_EMAIL);
    expect(replyAddressFor("ليس-معرّفًا", D)).toBe(CLUB_EMAIL);
  });

  it("يُعرف المعرّفُ من المستلمين بصيغتيه، ولا يُقبل نطاقٌ غيرُ نطاقنا", () => {
    expect(messageIdFrom([`r+${ID}@${D}`], D)).toBe(ID);
    expect(messageIdFrom([`نادي أدِيب <R+${ID.toUpperCase()}@Reply.Adeeb.Club>`], D)).toBe(ID);
    expect(messageIdFrom(["other@x.com", `r+${ID}@${D}`], D)).toBe(ID);
    expect(messageIdFrom([`r+${ID}@evil.com`], D)).toBeNull();
    expect(messageIdFrom([`x${ID}@${D}`], D)).toBeNull();
    expect(messageIdFrom([`r+${ID}@${D}`], null)).toBeNull();
  });

  it("يُقطع ما اقتبسه برنامجُ البريد ويبقى الردّ", () => {
    expect(stripQuoted("شكرًا، وصلت.\n\nOn Mon, Oct 19, 2026 at 7:10 PM نادي أدِيب <noreply@adeeb.club> wrote:\n> أهلًا")).toBe("شكرًا، وصلت.");
    expect(stripQuoted("تمام\r\n\r\nفي الإثنين، ١٩ أكتوبر ٢٠٢٦، كتب نادي أدِيب:\r\n> نص")).toBe("تمام");
    expect(stripQuoted("سؤالٌ آخر\n-----Original Message-----\nFrom: x")).toBe("سؤالٌ آخر");
    expect(stripQuoted("أهلًا\nFrom: نادي أدِيب <noreply@adeeb.club>\nSent: ...")).toBe("أهلًا");
    expect(stripQuoted("سطرٌ وحده بلا اقتباس")).toBe("سطرٌ وحده بلا اقتباس");
    expect(stripQuoted("> كلُّه اقتباس")).toBe("> كلُّه اقتباس");
  });
});
