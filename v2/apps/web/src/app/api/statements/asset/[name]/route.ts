import { NextResponse } from "next/server";
import { createAdeebServiceClient } from "@adeeb/core";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** ما يُطلب من هذا الباب — لا غير: اسمُ الملفّ لا يُبنى من الطلب. */
const FILES: Record<string, string> = {
  "signature-president": "signature-president.png",
  "signature-ceo": "signature-ceo.png",
  stamp: "stamp.png",
};

/**
 * **التوقيعان والختم** (٢٠٢٦-١٠-٢٣) — في دلوٍ خاصّ (`statement-assets`) لا يقرؤه إلّا مفتاحُ الخدمة، ويصل
 * المتصفّحَ من هنا وحدَه لمن يملك `issue_statements` (الرئيسان): به تُرسَم ورقةُ البيان. فلا يُنزَّل توقيعٌ
 * من ملفّات الموقع العامّة يُزوَّر به بيان، ولا يُخبَّأ في ذاكرةٍ مشتركة (`private, no-store`).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = FILES[name];
  if (!file) return new NextResponse("غير موجود", { status: 404 });

  const admin = await getCurrentAdmin();
  if (!admin?.caps.includes("issue_statements")) return new NextResponse("غير مصرّح", { status: 403 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/[^A-Za-z0-9._-]/g, "");
  if (!url || !key) return new NextResponse("إعداد الخادم ناقص", { status: 500 });
  const { data, error } = await createAdeebServiceClient(url, key).storage.from("statement-assets").download(file);
  if (error || !data) return new NextResponse("تعذّر الجلب", { status: 502 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}
