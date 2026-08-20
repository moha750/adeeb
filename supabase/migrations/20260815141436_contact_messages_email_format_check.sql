-- هذا الملفُّ أُعيدَ بناؤه آليًّا من سجلّ الترحيلات الحيّ بتاريخ 2026-08-16.
-- لم يُكتب بيد: مصدرُه عمود statements في supabase_migrations.schema_migrations،
-- أي أنّه ما طُبِّق فعلًا على المشروع، لا نصُّ المؤلِّف الأصليّ بالضرورة.
-- النسخة: 20260815141436   الاسم: contact_messages_email_format_check

-- رسائلُ التواصل تُدرَج من المتصفّح مباشرةً (نموذجٌ علنيٌّ بلا فعلٍ خادميّ)، فكان تحقّقُ
-- البريد في المتصفّح وحده — أي بلا حارسٍ أصلًا لمن تجاوزه. والقيدُ ههنا هو الحارس.
-- التعبير يطابق `EMAIL_RE` في apps/web/src/lib/fieldFormats.ts حرفًا بحرف.
-- (فُحصت الصفوف القائمة قبل الإضافة: خمسةٌ كلُّها تجتاز.)
alter table public.contact_messages
  add constraint contact_messages_email_check
  check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$');
