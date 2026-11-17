-- جدولُ الضيوف يُقرأ ولا يُكتب من المتصفّح (قاعدةُ «لا كتابةَ مباشرةً من العميل»): الامتيازاتُ الافتراضيّةُ تمنح anon و authenticated الكتابة،
-- والسياسةُ تمنعها أصلًا؛ وهذا السحبُ طبقةٌ ثانية. الكتابةُ بمفتاح الخدمة من أفعال غرفة الفعاليّات.
revoke insert, update, delete, truncate, trigger, references on public.activity_guests from anon, authenticated;
