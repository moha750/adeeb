-- نغمةٌ خامسة للصالة: «dallah»، ذهبُ دلّة «مدارس الأصول الأهلية» (قرارُ المالك ٢٠٢٦-١١-١٤).
-- عُرض عليه السماويّ والبنفسجيّ المتاحان فقال: «أختر أحد ألوان اللعبة، ولا بالله شنو علاقه البنفسجي
-- بالموضوع»، فعُرض ذهبُ الدلّة وأحمرُ السدو في الصالة الحقيقيّة فاختار الذهب، وهو موافقتُه على هذا
-- الترحيل. القيمةُ تطابق `dashboard/games/vocab.ts` وسطرَها في `components.css` (`--agm-dallah`).
--
-- ✅ مطبَّقٌ على الإنتاج ٢٠٢٦-١١-١٤ (بأداة Supabase باسم `games_09_tone_dallah`، الإصدار 20261114100005).

alter table public.games drop constraint games_tone_check;
alter table public.games add constraint games_tone_check
  check (tone in ('darb', 'amber', 'sky', 'violet', 'dallah'));
