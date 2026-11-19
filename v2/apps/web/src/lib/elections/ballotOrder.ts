/**
 * **ترتيبُ الورقة لكلّ ناخب** (محمد ٢٠٢٦-١١-١٨: «أعتمد اقتراحك»). أوّلُ القائمة يكسب أصواتًا لأنّه أوّلُها لا لأنّه أكفأ (أثرُ الأوّليّة)،
 * فلا ترتيبَ واحدًا للجميع: كلُّ ناخبٍ يرى المرشّحين بترتيبٍ يخصّه.
 * **وثابتٌ له لا عشوائيٌّ في كلّ فتح:** يُشتقّ من معرّفه ومعرّف المرشّح (FNV-1a)، فلا تتقافز الأسماء إن أعاد التحميل، ويتّفق رسمُ الخادم
 * والمتصفّح (لا `Math.random` يكسر الإماهة)، ولا سرَّ فيه يُخفى: لا يكشف شيئًا عن صوت أحد.
 */
const hash = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
};

export function ballotOrder<T extends { id: string }>(items: readonly T[], voterId: string): T[] {
  return items
    .map((it) => ({ it, k: hash(`${voterId}:${it.id}`) }))
    .sort((a, b) => a.k - b.k || (a.it.id < b.it.id ? -1 : 1))
    .map((x) => x.it);
}
