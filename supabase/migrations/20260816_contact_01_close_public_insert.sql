-- بابُ التواصل: إغلاقُ الإدراج العلنيّ — الدرعُ لا يحرس ما يُلتَفُّ حوله
--
-- العلّة (٢٠٢٦-٠٨-١٦): سياسةُ `contact_messages_insert_public` تسمح لدور `public` بالإدراج،
-- فكان نموذجُ الهبوط يكتب من المتصفّح بالمفتاح العلنيّ بلا تحدٍّ ولا خادم. ومعناها أنّ أيّ
-- سكربتٍ يعرف عنوانَ المشروع والمفتاحَ العلنيّ (وكلاهما ظاهرٌ في الصفحة) يملأ الجدولَ سبامًا.
--
-- ووضعُ درع Turnstile في الواجهة وحدَه لا يكفي: ما دام البابُ الخلفيّ مفتوحًا في القاعدة،
-- فالدرعُ زينةٌ تُتخطّى بنداءٍ مباشر. فالعلاجُ في الجذر: يمرّ الإرسالُ كلُّه عبر فعلٍ خادميّ
-- (`app/_components/contact-actions.ts`) يتحقّق من الرمز ثمّ يكتب بمفتاح الخدمة، وتُسقَط
-- هذه السياسة. وهو نهجُ الاستبيانات نفسُه، فلا يفترق بابان في بيتٍ واحد.
--
-- **الترتيب ملزم**: يُنشَر كودُ V2 أوّلًا (الفعلُ الخادميّ)، **ثمّ** يُطبَّق هذا الترحيل.
-- ولو عُكس لانكسر النموذجُ بين النشرتين: المتصفّحُ يُدرِج وقد مُنع.
--
-- والتراجعُ سطرٌ واحد: إعادةُ إنشاء السياسة بنصّها المحفوظ في الذيل.
--
-- ولا يُمَسّ قارئوه: `contact_messages_select_admin` و`contact_messages_update_admin`
-- قائمتان على `check_user_permission(auth.uid(), 'manage_contact')` كما هما.

drop policy if exists "contact_messages_insert_public" on public.contact_messages;

-- للتراجع (لا يُنفَّذ، محفوظٌ للأثر):
--   create policy "contact_messages_insert_public" on public.contact_messages
--     for insert to public
--     with check (
--       name is not null and email is not null and message is not null
--       and length(name) >= 2 and length(message) >= 10
--     );
