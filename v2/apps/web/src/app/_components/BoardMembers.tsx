import { createAdeebServerClient } from "@adeeb/core";
import { BoardCarousel, type Member } from "./BoardCarousel";

/** قسم حيّ: أهل الدفّة (المجلس) عبر دالة get_board_members الآمنة. */
export async function BoardMembers() {
  const sb = createAdeebServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await sb.rpc("get_board_members");

  if (error) {
    return <p className="text-danger">تعذّر جلب المجلس: {error.message}</p>;
  }
  const members = (data ?? []) as Member[];
  if (members.length === 0) return null;

  return <BoardCarousel members={members} />;
}
