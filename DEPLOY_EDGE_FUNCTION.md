# نشر Edge Function يدوياً

تم تحديث الكود في الملف المحلي. الآن شغّل هذا الأمر:

```bash
cd "e:\moham\Downloads\New folder (2)\adeeb-main\adeeb-main"
supabase functions deploy send-push-notification --project-ref nnlhkfeybyhvlinbqqfa
```

إذا طلب تسجيل دخول، اتبع التعليمات في المتصفح.

## ما تم تغييره:

✅ إزالة التحقق من المصادقة داخل Edge Function
✅ الاعتماد على Service Role Key فقط
✅ الحماية تتم عبر RLS policies في قاعدة البيانات

## بعد النشر:

جرّب إرسال إشعار من لوحة التحكم وتحقق من Console.
