/**
 * **شعارُ البرنامج لبطاقة قوقل** (`programLogo`) — `GET /wallet-preview/icon`.
 *
 * وهو **أيقونةُ بطاقة أبل عينُها** (`brandIcon`): مربّعٌ بتدرّج الهوية وعليه علامةُ أديب
 * بيضاء. فالمحفظتان تعرضان الشعارَ نفسَه لا شبيهين يفترقان.
 *
 * **ولماذا مسارٌ لا ملفٌّ في `public`؟** لا شعارَ مربّعًا في أصول الموقع — الموجودُ أفقيٌّ
 * (`logo-horizontal-white.png`) يخرج مقصوصًا في إطارٍ مربّع. والرسّامُ عندنا يصنعه بأيّ
 * مقاسٍ، فلا يُضاف أصلٌ ثابتٌ إلى المستودع لأجل مجلّدٍ سيُحذف.
 *
 * **ومن يجلبه خوادمُ قوقل**: فالمسار علنيٌّ بلا مصادقة، وردُّه خالدُ التخزين.
 */

import { NextResponse } from "next/server";
import { brandIcon } from "../png";

export const runtime = "nodejs";

/** ٥١٢ — يكفي أكبرَ عرضٍ تطلبه قوقل، وهي تصغّره كما تشاء. */
const SIZE = 512;

export function GET(): Response {
  return new NextResponse(new Uint8Array(brandIcon(SIZE)), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
