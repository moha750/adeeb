import { NextResponse, type NextRequest } from "next/server";
import { surveyCodeById } from "@/lib/surveys/codeLookup";
import { surveyResultsPath } from "@/lib/surveys/code";

/** **رابطُ النتائج القديم بالرقم** — يحوّل إلى `‎/s/<code>/results`. التعليلُ كاملًا في `../route.ts`. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const code = await surveyCodeById(Number(id));
  if (!code) return NextResponse.redirect(new URL("/s/unavailable", request.url), 307);
  return NextResponse.redirect(new URL(surveyResultsPath(code), request.url), 308);
}
