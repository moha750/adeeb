// رابط الخبر العامّ — **مصدرٌ واحد** يخدم الخادم والعميل معًا (بلا "server-only" عمدًا).
// الـslug هو العنوان في المسار، والمُعرّف احتياطٌ لخبرٍ بلا slug.
export const newsHref = (n: { id: string; slug: string | null }): string =>
  `/news/${encodeURIComponent(n.slug || n.id)}`;
