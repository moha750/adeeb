// يُستورَد من مكوّنات خادميّة وحدها (page.tsx).
import "server-only";
import { createClient } from "@/lib/supabase/server";

/** كلمةٌ في البنك كما تُقرأ في اللوحة. */
export type BankWordRow = {
  id: string;
  word: string;
  hint: string | null;
  category: string;
  active: boolean;
  createdAt: string;
};

type Raw = {
  id: string;
  word: string;
  hint: string | null;
  category: string;
  active: boolean;
  created_at: string;
};

const shape = (r: Raw): BankWordRow => ({
  id: r.id,
  word: r.word,
  hint: r.hint,
  category: r.category,
  active: r.active,
  createdAt: r.created_at,
});

const COLS = "id, word, hint, category, active, created_at";

/** تصنيفٌ كما يُدار، وكم كلمةً تحته. */
export type CategoryRow = { name: string; count: number };

export type BankData = {
  rows: BankWordRow[];
  /**
   * التصنيفاتُ **من جدولها** لا من `distinct` على الكلمات (م٠ح): فيُنشَأ التصنيفُ
   * قبل كلمته، ويظهر في القائمة وهو خالٍ.
   */
  categories: CategoryRow[];
  error: string | null;
};

/**
 * البنكُ كلُّه.
 *
 * **بعميل الجلسة لا بمفتاح الخدمة**: البابُ قدرةٌ (`manage_games`) وهي مكتوبةٌ في
 * سياسةِ الجدول نفسِها. ومفتاحُ الخدمة يتجاوز السياسةَ فيصير الحارسُ سطرًا في التطبيق،
 * وسطرٌ يُنسى مرّةً يفتح البنكَ للجميع (سابقةُ `tools/qr`).
 *
 * ولا ترقيمَ ولا تحميلٌ متدرّج: بنكُ كلماتِ نادٍ مئاتٌ لا ملايين، وجلبُه مرّةً يجعل
 * البحثَ والفرزَ في المتصفّح فوريَّين. فإن بلغ يومًا عشراتِ الألوف انتقل الترقيمُ
 * إلى القاعدة، وهو تبديلُ استعلامٍ لا إعادةُ بناء.
 */
export async function getBankWords(): Promise<BankData> {
  const sb = await createClient();

  const [wRes, cRes] = await Promise.all([
    sb.from("guess_word_bank").select(COLS).order("word", { ascending: true }),
    sb.from("guess_word_categories").select("name").order("name", { ascending: true }),
  ]);

  const firstErr = wRes.error || cRes.error;
  if (firstErr) return { rows: [], categories: [], error: firstErr.message };

  const rows = ((wRes.data ?? []) as Raw[]).map(shape);

  // العدُّ في التطبيق: التصنيفاتُ عشراتٌ والكلماتُ مئاتٌ، فدالّةُ تجميعٍ في القاعدة
  // تُصان بلا مقابل (سابقةُ `getRooms`).
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);

  const categories = ((cRes.data ?? []) as { name: string }[])
    .map((c) => ({ name: c.name, count: counts.get(c.name) ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  return { rows, categories, error: null };
}

/** كلمةٌ واحدةٌ لبابِ التحرير. */
export async function getBankWord(
  id: string
): Promise<{ row: BankWordRow | null; error: string | null }> {
  const sb = await createClient();
  const { data, error } = await sb.from("guess_word_bank").select(COLS).eq("id", id).maybeSingle();
  if (error) return { row: null, error: error.message };
  return { row: data ? shape(data as Raw) : null, error: null };
}
