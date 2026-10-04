-- تحصينُ الطبقة الاجتماعيّة في الأخبار — ثلاثُ ثغراتٍ مقيسةٌ لا مظنونة (٢٠٢٦-٠٩-٢٤).

-- ═══ ١) `toggle_news_like` تُصدّق من يقول إنّه الفاعل ═══════════════════
--
-- تأخذ `p_user_id` مُدخَلًا وتعمل به، وهي `SECURITY DEFINER` **ممنوحةٌ لـ`anon`** —
-- فمن ناداها بالمفتاح العلنيّ (وهو في كلّ متصفّح) أعجب باسم أيّ عضوٍ ونزع إعجابَه.
-- وهي عينُ ثغرة `p_actor` التي نُزعت عن ٣٣ دالّةً في ٢٠٢٦-٠٨-٠٦: **الفاعلُ من
-- `auth.uid()` لا من مُدخَل**.
--
-- **وتُسقَط ولا تُصلَح** لأنّ V2 لا يناديها أصلًا: `app/news/[slug]/actions.ts` يكتب
-- في `news_likes` مباشرةً بمفتاح الخدمة، والهويّةُ تُقرأ في الخادم من الجلسة أو من
-- كعكةٍ `httpOnly`. وV1 مات ٢٠٢٦-٠٨-٠١. فدالّةٌ لا ساكنَ لها وبابُها مفتوحٌ تُهدَم
-- ولا تُرمَّم — وإصلاحُها يُبقي سطحًا لا يحرسه أحد.
DROP FUNCTION IF EXISTS public.toggle_news_like(uuid, uuid, text);

-- ═══ ٢) `comment_likes` تقبل إعجابًا منسوبًا إلى غير صاحبه ═══════════════
--
-- السياسةُ كانت `(auth.uid() = user_id) OR (guest_identifier IS NOT NULL)`، والفرعُ
-- الثاني **يُسقط الشرطَ الأوّل كلَّه**: يكفي أن يُرسَل `guest_identifier` ليُقبَل أيُّ
-- `user_id` — فيُنسَب إعجابٌ إلى عضوٍ لم يفعله.
--
-- والقالبُ حاضرٌ يُحتذى: `news_likes` حُصِّنت في V2 بالشكل الصحيح — إمّا صاحبُ حسابٍ
-- يكتب باسمه، أو زائرٌ بلا حسابٍ ولا هويّةِ عضو، ولا ثالثَ بينهما.
DROP POLICY IF EXISTS "المستخدمون يمكنهم إضافة إعجاب للت" ON public.comment_likes;

CREATE POLICY comment_likes_insert ON public.comment_likes
FOR INSERT TO anon, authenticated
WITH CHECK (
  -- التعليقُ مُقَرٌّ ومنشورٌ خبرُه: لا يُعجَب بما لا يراه الناس.
  EXISTS (
    SELECT 1 FROM public.news_public_comments c
    JOIN public.news n ON n.id = c.news_id
    WHERE c.id = comment_likes.comment_id
      AND c.is_approved
      AND n.workflow_status = 'published'
  )
  AND (
    ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
    OR ((SELECT auth.uid()) IS NULL AND user_id IS NULL AND guest_identifier IS NOT NULL)
  )
);

-- والحذفُ كان لصاحب الحساب وحدَه، فالزائرُ يُعجِب ولا يستطيع الرجوع. ويُفتَح له
-- بهويّته هو لا بغيرها.
DROP POLICY IF EXISTS "المستخدمون يمكنهم حذف إعجاباتهم ل" ON public.comment_likes;

CREATE POLICY comment_likes_delete ON public.comment_likes
FOR DELETE TO anon, authenticated
USING (
  ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()))
  OR ((SELECT auth.uid()) IS NULL AND user_id IS NULL AND guest_identifier IS NOT NULL)
);

-- ═══ ٣) درعُ Turnstile كان زينةً على التعليقات ═════════════════════════
--
-- السياسةُ `news_public_comments_insert` سليمةُ الهويّة، لكنّها تسمح بالإدراج **من
-- المتصفّح بالمفتاح العلنيّ** — فمن تجاوز الواجهةَ كتب تعليقًا بلا أن يمرّ بالدرع.
-- ودرسُ نظام التواصل صريح: **الدرعُ يُركَّب والسياسةُ تُغلَق معًا، وإلّا فهو زينة.**
--
-- والإغلاقُ آمنٌ مقيس: لا موضعَ في V2 يُدرج تعليقًا من المتصفّح — الكتابةُ كلُّها في
-- `addComment` بمفتاح الخدمة بعد التحقّق من Turnstile، ومفتاحُ الخدمة لا تحكمه RLS.
REVOKE INSERT ON public.news_public_comments FROM anon, authenticated;

COMMENT ON TABLE public.news_public_comments IS
  'تعليقاتُ قرّاء الأخبار. الإدراجُ من الخادم وحدَه (مفتاح الخدمة بعد Turnstile) — نُزع منحُ INSERT عن anon وauthenticated في ٢٠٢٦-٠٩-٢٤ كي لا يكون الدرعُ زينة.';
